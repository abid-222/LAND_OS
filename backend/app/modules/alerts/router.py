"""
Parcel Risk Alerts & Alert Management Router for Bangladesh LandOS.
Endpoints:
- GET   /api/v1/parcels/{parcel_id}/alerts?severity=  (alerts with reason_bn + evidence)
- POST  /api/v1/parcels/{parcel_id}/alerts/run        (Reviewer/Supervisor/Tech Admin: run engine, idempotent)
- PATCH /api/v1/alerts/{id}                           (status -> reviewed|dismissed with note, kept in history, audit-logged)
"""

import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.rate_limit import rate_limit
from app.models import Alert
from app.modules.admin.audit import write_audit_entry
from app.modules.rbac.permissions import Permission, Role, Scope, require
from app.risk.engine import RiskEngine

logger = logging.getLogger("landos.alerts.router")

parcels_alerts_router = APIRouter(prefix="/parcels", tags=["Cadastral Parcels & Risk Alerts"])
alerts_router = APIRouter(prefix="/alerts", tags=["Risk Alerts Management"])

REVIEWER_ROLES = {
    Role.REVIEWER.value,
    Role.SUPERVISOR.value,
    Role.OFFICE_ADMIN.value,
    Role.REGIONAL_MANAGER.value,
    Role.TECH_ADMIN.value,
}


# ------------------------------------------------------------------------------
# Pydantic Schemas
# ------------------------------------------------------------------------------

class AlertResponseItem(BaseModel):
    id: str
    parcel_id: str
    rule_id: str
    severity: str
    title_bn: str
    reason_bn: str
    evidence: List[Dict[str, Any]]
    status: str
    rule_version: str
    created_at: str


class AlertPatchRequest(BaseModel):
    status: str = Field(..., pattern="^(reviewed|dismissed)$", description="New alert status ('reviewed' or 'dismissed')")
    note: Optional[str] = Field(None, description="Reviewer explanation kept in history")


class AlertsRunResponse(BaseModel):
    parcel_id: str
    status: str
    total_alerts: int
    alerts: List[AlertResponseItem]


# ------------------------------------------------------------------------------
# Parcel Alerts Endpoints
# ------------------------------------------------------------------------------

@parcels_alerts_router.get(
    "/{parcel_id}/alerts",
    response_model=List[AlertResponseItem],
    summary="Get risk & conflict alerts for parcel with reason_bn and evidence",
    dependencies=[Depends(rate_limit(requests=30, window_seconds=60))],
)
async def get_parcel_alerts(
    parcel_id: str,
    severity: Optional[str] = Query(None, pattern="^(info|warn|high)$", description="Filter by severity level"),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require(Permission.RECORD_SEARCH, Scope.GLOBAL)),
):
    """
    Returns verified risk and conflict alerts for the specified parcel.
    Bangla wording strictly follows 'সম্ভাব্য অসঙ্গতি, যাচাই প্রয়োজন'.
    Every alert is accompanied by explainable reason_bn and evidence.
    """
    stmt = select(Alert).where(Alert.parcel_id == parcel_id)
    if severity:
        stmt = stmt.where(Alert.severity == severity.lower())
    stmt = stmt.order_by(Alert.created_at.desc())

    res = await db.execute(stmt)
    alerts = res.scalars().all()

    # If no alerts found yet, run engine idempotently once to evaluate baseline demo rules
    if not alerts:
        engine = RiskEngine()
        await engine.run_all(parcel_id=parcel_id, db=db)
        res = await db.execute(stmt)
        alerts = res.scalars().all()

    return [
        AlertResponseItem(
            id=str(a.id),
            parcel_id=a.parcel_id,
            rule_id=a.rule_id,
            severity=a.severity,
            title_bn=a.title_bn,
            reason_bn=a.reason_bn,
            evidence=a.evidence or [],
            status=a.status,
            rule_version=a.rule_version,
            created_at=a.created_at.isoformat() if a.created_at else datetime.now(timezone.utc).isoformat(),
        )
        for a in alerts
    ]


@parcels_alerts_router.post(
    "/{parcel_id}/alerts/run",
    response_model=AlertsRunResponse,
    summary="Execute risk & conflict rules engine idempotently (Reviewer/Supervisor/Tech Admin)",
    dependencies=[Depends(rate_limit(requests=20, window_seconds=60))],
)
async def run_parcel_alerts(
    parcel_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require(Permission.CASE_REVIEW, Scope.ASSIGNED)),
):
    """
    Executes rules R1 to R6 on the parcel context in an idempotent, deduplicated manner.
    RBAC: Enforced strictly for Reviewer, Supervisor, and Tech Admin. Denied for Citizens.
    Never overwrites or deletes reviewed or dismissed alert history.
    """
    if current_user.role not in REVIEWER_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ঝুঁকি ইঞ্জিন চালানোর অনুমতি শুধুমাত্র রিভিউয়ার এবং সুপারভাইজারের রয়েছে।",
        )

    engine = RiskEngine()
    await engine.run_all(parcel_id=parcel_id, db=db)

    # Fetch updated alerts
    stmt = select(Alert).where(Alert.parcel_id == parcel_id).order_by(Alert.created_at.desc())
    res = await db.execute(stmt)
    alerts = res.scalars().all()

    # Cryptographic Audit Log
    await write_audit_entry(
        db=db,
        actor_id=current_user.id,
        actor_role=current_user.role,
        action="parcel:run_risk_engine",
        resource_type="parcel",
        resource_id=parcel_id,
        scope=Scope.OFFICE.value,
        payload={
            "parcel_id": parcel_id,
            "total_alerts": len(alerts),
            "triggered_by_role": current_user.role,
        },
    )

    alert_items = [
        AlertResponseItem(
            id=str(a.id),
            parcel_id=a.parcel_id,
            rule_id=a.rule_id,
            severity=a.severity,
            title_bn=a.title_bn,
            reason_bn=a.reason_bn,
            evidence=a.evidence or [],
            status=a.status,
            rule_version=a.rule_version,
            created_at=a.created_at.isoformat() if a.created_at else datetime.now(timezone.utc).isoformat(),
        )
        for a in alerts
    ]

    return AlertsRunResponse(
        parcel_id=parcel_id,
        status="completed",
        total_alerts=len(alert_items),
        alerts=alert_items,
    )


# ------------------------------------------------------------------------------
# Alert Management Endpoints
# ------------------------------------------------------------------------------

@alerts_router.patch(
    "/{alert_id}",
    response_model=AlertResponseItem,
    summary="Update alert status to reviewed or dismissed with reviewer note",
    dependencies=[Depends(rate_limit(requests=30, window_seconds=60))],
)
async def update_alert_status(
    alert_id: str,
    payload: AlertPatchRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require(Permission.CASE_REVIEW, Scope.ASSIGNED)),
):
    """
    Updates an alert's status to 'reviewed' or 'dismissed' with an explanatory note.
    RBAC: Enforced strictly for Reviewer+. Denied for Citizens.
    Keeps review history in evidence chain and records a cryptographic audit log.
    """
    if current_user.role not in REVIEWER_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="সতর্কতা নিষ্পত্তির অনুমতি শুধুমাত্র রিভিউয়ার এবং অফিসারের রয়েছে।",
        )

    try:
        alert_uuid = uuid.UUID(alert_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Malformed alert UUID.")

    stmt = select(Alert).where(Alert.id == alert_uuid)
    res = await db.execute(stmt)
    alert = res.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found.")

    old_status = alert.status
    alert.status = payload.status

    # Preserve note and action in evidence history
    history_entry = {
        "action": "status_update",
        "previous_status": old_status,
        "new_status": payload.status,
        "reviewer_id": str(current_user.id),
        "reviewer_role": current_user.role,
        "note": payload.note or "",
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    evidence_list = list(alert.evidence or [])
    evidence_list.append(history_entry)
    alert.evidence = evidence_list

    # Cryptographic Audit Log
    await write_audit_entry(
        db=db,
        actor_id=current_user.id,
        actor_role=current_user.role,
        action="alert:status_update",
        resource_type="alert",
        resource_id=str(alert.id),
        scope=Scope.OFFICE.value,
        payload={
            "parcel_id": alert.parcel_id,
            "rule_id": alert.rule_id,
            "previous_status": old_status,
            "new_status": payload.status,
            "note": payload.note,
        },
    )

    await db.commit()
    await db.refresh(alert)

    return AlertResponseItem(
        id=str(alert.id),
        parcel_id=alert.parcel_id,
        rule_id=alert.rule_id,
        severity=alert.severity,
        title_bn=alert.title_bn,
        reason_bn=alert.reason_bn,
        evidence=alert.evidence or [],
        status=alert.status,
        rule_version=alert.rule_version,
        created_at=alert.created_at.isoformat() if alert.created_at else datetime.now(timezone.utc).isoformat(),
    )
