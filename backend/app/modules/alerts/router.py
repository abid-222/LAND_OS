"""
Parcel Risk Alerts, Alert Management & Parcel Guardian Watch Router for Bangladesh LandOS.
Endpoints:
- GET    /api/v1/parcels/watched                        (Citizen/Staff: list watched parcels with details)
- GET    /api/v1/parcels/{parcel_id}/alerts?severity=   (alerts with reason_bn + evidence)
- POST   /api/v1/parcels/{parcel_id}/alerts/run         (Reviewer/Supervisor/Tech Admin: run engine, idempotent)
- POST   /api/v1/parcels/{parcel_id}/watch              (Subscribe to Parcel Guardian alerts)
- DELETE /api/v1/parcels/{parcel_id}/watch              (Unsubscribe from Parcel Guardian alerts)
- GET    /api/v1/parcels/{parcel_id}/watch              (Check watch status for current user)
- PATCH  /api/v1/alerts/{id}                            (status -> reviewed|dismissed with note, kept in history)
- GET    /api/v1/alerts/outbox                          (Citizen/Staff: simulated SMS alert notifications outbox)
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
from app.models import Alert, Mouza, Parcel, ParcelWatch, SimulatedSMSOutbox
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
    status: str = Field(
        ...,
        pattern="^(reviewed|dismissed)$",
        description="New alert status ('reviewed' or 'dismissed')",
    )
    note: Optional[str] = Field(None, description="Reviewer explanation kept in history")


class AlertsRunResponse(BaseModel):
    parcel_id: str
    status: str
    total_alerts: int
    alerts: List[AlertResponseItem]


class WatchParcelRequest(BaseModel):
    phone: Optional[str] = Field(None, description="Optional SMS alert recipient phone number")


class WatchParcelResponse(BaseModel):
    id: str
    parcel_id: str
    user_id: str
    is_active: bool
    created_at: str
    confirmation_sms_bn: Optional[str] = None


class WatchedParcelItem(BaseModel):
    watch_id: str
    parcel_id: str
    is_active: bool
    created_at: str
    upazila: Optional[str] = None
    district: Optional[str] = None
    mouza: Optional[str] = None
    land_class: Optional[str] = None
    area_decimal: Optional[float] = None
    alerts_count: int = 0


class SimulatedSMSOutboxItem(BaseModel):
    id: str
    recipient_phone: str
    parcel_id: Optional[str] = None
    message_bn: str
    tag: str
    sent_at: str


# ------------------------------------------------------------------------------
# Parcel Watch Endpoints (Registered before dynamic /{parcel_id} paths)
# ------------------------------------------------------------------------------


@parcels_alerts_router.get(
    "/watched",
    response_model=List[WatchedParcelItem],
    summary="List watched parcels for current user",
    dependencies=[Depends(rate_limit(requests=30, window_seconds=60))],
)
async def get_watched_parcels(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require(Permission.RECORD_SEARCH, Scope.GLOBAL)),
):
    """
    Returns the list of parcels actively watched by the current user with location & open alerts count.
    """
    stmt = (
        select(ParcelWatch, Parcel, Mouza)
        .join(Parcel, ParcelWatch.parcel_id == Parcel.parcel_id)
        .outerjoin(Mouza, Parcel.mouza_id == Mouza.id)
        .where(ParcelWatch.user_id == current_user.id, ParcelWatch.is_active == True)  # noqa: E712
        .order_by(ParcelWatch.created_at.desc())
    )
    res = await db.execute(stmt)
    rows = res.all()

    items = []
    for watch, parcel, mouza in rows:
        a_stmt = select(Alert).where(Alert.parcel_id == parcel.parcel_id, Alert.status == "active")
        a_res = await db.execute(a_stmt)
        alerts_count = len(a_res.scalars().all())

        items.append(
            WatchedParcelItem(
                watch_id=str(watch.id),
                parcel_id=parcel.parcel_id,
                is_active=watch.is_active,
                created_at=watch.created_at.isoformat()
                if watch.created_at
                else datetime.now(timezone.utc).isoformat(),
                upazila=mouza.upazila if mouza else None,
                district=mouza.district if mouza else None,
                mouza=mouza.name_bn if mouza else None,
                land_class=parcel.land_class,
                area_decimal=parcel.area_decimal,
                alerts_count=alerts_count,
            )
        )
    return items


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
    severity: Optional[str] = Query(
        None, pattern="^(info|warn|high)$", description="Filter by severity level"
    ),
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
            created_at=a.created_at.isoformat()
            if a.created_at
            else datetime.now(timezone.utc).isoformat(),
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
    Executes rules R1 to R9 on the parcel context in an idempotent, deduplicated manner.
    RBAC: Enforced strictly for Reviewer, Supervisor, and Tech Admin. Denied for Citizens.
    Never overwrites or deletes reviewed or dismissed alert history.
    Notifies active watchers via simulated SMS outbox if alerts are detected.
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

    # Notify active watchers via simulated SMS
    if alerts:
        w_stmt = select(ParcelWatch).where(
            ParcelWatch.parcel_id == parcel_id,
            ParcelWatch.is_active == True,  # noqa: E712
        )
        w_res = await db.execute(w_stmt)
        active_watches = w_res.scalars().all()
        for _ in active_watches:
            sms = SimulatedSMSOutbox(
                recipient_phone="01700-123456",
                parcel_id=parcel_id,
                message_bn=(
                    f"[সিমুলেটেড এসএমএস] ল্যান্ডওএস গার্ডিয়ান সতর্কতা: আপনার পর্যবেক্ষণকৃত পার্সেল {parcel_id}-এ "
                    f"{len(alerts)}টি সম্ভাব্য অসঙ্গতি বা বিরোধ শনাক্ত হয়েছে। বিস্তারিত: landos.gov.bd"
                ),
                tag="simulated",
            )
            db.add(sms)
        if active_watches:
            await db.commit()

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
            created_at=a.created_at.isoformat()
            if a.created_at
            else datetime.now(timezone.utc).isoformat(),
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
# Parcel Watch Endpoints
# ------------------------------------------------------------------------------


@parcels_alerts_router.post(
    "/{parcel_id}/watch",
    response_model=WatchParcelResponse,
    summary="Subscribe to Parcel Guardian alerts (citizen or staff)",
    dependencies=[Depends(rate_limit(requests=20, window_seconds=60))],
)
async def watch_parcel(
    parcel_id: str,
    payload: Optional[WatchParcelRequest] = None,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require(Permission.RECORD_SEARCH, Scope.GLOBAL)),
):
    """
    Subscribes the current user to watch the specified parcel for disputes, mutations, or alerts.
    Dispatches an initial simulated SMS confirmation notification.
    """
    p_stmt = select(Parcel).where(Parcel.parcel_id == parcel_id)
    p_res = await db.execute(p_stmt)
    parcel = p_res.scalar_one_or_none()
    if not parcel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"Parcel {parcel_id} not found."
        )

    w_stmt = select(ParcelWatch).where(
        ParcelWatch.user_id == current_user.id,
        ParcelWatch.parcel_id == parcel_id,
    )
    w_res = await db.execute(w_stmt)
    watch = w_res.scalar_one_or_none()

    if not watch:
        watch = ParcelWatch(
            user_id=current_user.id,
            parcel_id=parcel_id,
            is_active=True,
        )
        db.add(watch)
    else:
        watch.is_active = True

    recipient_phone = (
        (payload and payload.phone) or getattr(current_user, "phone", None) or "01700-123456"
    )
    confirmation_msg = (
        f"[সিমুলেটেড এসএমএস] বাংলাদেশ ল্যান্ডওএস: পার্সেল {parcel_id}-এর জন্য গার্ডিয়ান ওয়াচ সক্রিয় হয়েছে। "
        f"নতুন কোনো নামজারি আবেদন, দলিল হস্তান্তর বা অসঙ্গতি চিহ্নিত হলে সতর্কবার্তা পাবেন।"
    )
    sms = SimulatedSMSOutbox(
        recipient_phone=recipient_phone,
        parcel_id=parcel_id,
        message_bn=confirmation_msg,
        tag="simulated",
    )
    db.add(sms)
    await db.commit()
    await db.refresh(watch)

    return WatchParcelResponse(
        id=str(watch.id),
        parcel_id=watch.parcel_id,
        user_id=str(watch.user_id),
        is_active=watch.is_active,
        created_at=watch.created_at.isoformat()
        if watch.created_at
        else datetime.now(timezone.utc).isoformat(),
        confirmation_sms_bn=confirmation_msg,
    )


@parcels_alerts_router.delete(
    "/{parcel_id}/watch",
    summary="Unsubscribe from Parcel Guardian alerts",
    dependencies=[Depends(rate_limit(requests=20, window_seconds=60))],
)
async def unwatch_parcel(
    parcel_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require(Permission.RECORD_SEARCH, Scope.GLOBAL)),
):
    """
    Deactivates Parcel Guardian watch subscription for the current user.
    """
    w_stmt = select(ParcelWatch).where(
        ParcelWatch.user_id == current_user.id,
        ParcelWatch.parcel_id == parcel_id,
        ParcelWatch.is_active == True,  # noqa: E712
    )
    w_res = await db.execute(w_stmt)
    watch = w_res.scalar_one_or_none()
    if not watch:
        return {"status": "not_watched", "parcel_id": parcel_id}

    watch.is_active = False
    await db.commit()
    return {"status": "unwatched", "parcel_id": parcel_id}


@parcels_alerts_router.get(
    "/{parcel_id}/watch",
    summary="Check if current user is watching parcel",
    dependencies=[Depends(rate_limit(requests=30, window_seconds=60))],
)
async def check_parcel_watch(
    parcel_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require(Permission.RECORD_SEARCH, Scope.GLOBAL)),
):
    """
    Checks whether the current user actively watches the specified parcel.
    """
    w_stmt = select(ParcelWatch).where(
        ParcelWatch.user_id == current_user.id,
        ParcelWatch.parcel_id == parcel_id,
        ParcelWatch.is_active == True,  # noqa: E712
    )
    w_res = await db.execute(w_stmt)
    watch = w_res.scalar_one_or_none()
    return {
        "is_watched": watch is not None,
        "watch_id": str(watch.id) if watch else None,
        "created_at": watch.created_at.isoformat() if (watch and watch.created_at) else None,
    }


# ------------------------------------------------------------------------------
# Alert Management & Simulated SMS Outbox Endpoints
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
        created_at=alert.created_at.isoformat()
        if alert.created_at
        else datetime.now(timezone.utc).isoformat(),
    )


@alerts_router.get(
    "/outbox",
    response_model=List[SimulatedSMSOutboxItem],
    summary="List simulated SMS alert notifications (Bengali previews)",
    dependencies=[Depends(rate_limit(requests=30, window_seconds=60))],
)
async def get_simulated_sms_outbox(
    parcel_id: Optional[str] = Query(None, description="Filter by parcel ID"),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require(Permission.RECORD_SEARCH, Scope.GLOBAL)),
):
    """
    Returns simulated SMS alerts sent to citizens and staff.
    All items are explicitly tagged 'simulated' and contain Bengali notification previews.
    """
    stmt = select(SimulatedSMSOutbox)
    if parcel_id:
        stmt = stmt.where(SimulatedSMSOutbox.parcel_id == parcel_id)
    stmt = stmt.order_by(SimulatedSMSOutbox.sent_at.desc()).limit(limit)

    res = await db.execute(stmt)
    sms_list = res.scalars().all()

    return [
        SimulatedSMSOutboxItem(
            id=str(s.id),
            recipient_phone=s.recipient_phone,
            parcel_id=s.parcel_id,
            message_bn=s.message_bn,
            tag=s.tag,
            sent_at=s.sent_at.isoformat() if s.sent_at else datetime.now(timezone.utc).isoformat(),
        )
        for s in sms_list
    ]
