"""
Buyer Report Router for Bangladesh LandOS.
Endpoints:
- POST /api/v1/parcels/{parcel_id}/buyer-report    (create report: Citizen allowed for demo parcels only)
- GET  /api/v1/buyer-reports/{id}                  (JSON: Citizens see only their own reports)
- GET  /api/v1/buyer-reports/{id}/print            (printable HTML: Citizens see only their own reports)
"""

import logging
import uuid
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.rate_limit import rate_limit
from app.models import BuyerReport
from app.modules.admin.audit import write_audit_entry
from app.modules.map.router import _load_fallback_parcels
from app.modules.rbac.permissions import Permission, Role, Scope, require
from app.modules.reports.buyer_report import build_report, render_report_html

logger = logging.getLogger("landos.reports.router")

parcels_reports_router = APIRouter(prefix="/parcels", tags=["Cadastral Parcels & Buyer Reports"])
buyer_reports_router = APIRouter(prefix="/buyer-reports", tags=["Buyer Risk Reports"])


def is_demo_parcel(parcel_id: str) -> bool:
    """Verifies whether parcel_id belongs to synthetic demo dataset."""
    pid = parcel_id.strip().lower()
    if pid.startswith(("p-", "parcel_", "bd-p-", "demo-", "sample-", "parcel-")):
        return True

    features = _load_fallback_parcels()
    for f in features:
        fid = str(f.get("id") or "").lower()
        props = f.get("properties", {})
        syn_id = str(props.get("synthetic_id") or "").lower()
        p_id = str(props.get("parcel_id") or "").lower()
        p_num = str(props.get("parcel_number") or "").lower()
        dag = str(props.get("dag_no") or "").lower()
        if pid in (fid, syn_id, p_id, p_num, dag):
            return True
    return False


# ------------------------------------------------------------------------------
# Pydantic Schemas
# ------------------------------------------------------------------------------


class BuyerReportCreateResponse(BaseModel):
    id: str
    user_id: str
    parcel_id: str
    generated_at: str
    sections: Dict[str, Any]
    rule_version: str
    disclaimer_version: str


# ------------------------------------------------------------------------------
# Endpoints
# ------------------------------------------------------------------------------


@parcels_reports_router.post(
    "/{parcel_id}/buyer-report",
    response_model=BuyerReportCreateResponse,
    summary="Generate comprehensive buyer parcel summary report (Citizen allowed for demo parcels only)",
    dependencies=[Depends(rate_limit(requests=15, window_seconds=60))],
)
async def create_buyer_report(
    parcel_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require(Permission.RECORD_SEARCH, Scope.GLOBAL)),
):
    """
    Generates a 6-section buyer parcel summary report.
    Citizens are restricted to generating reports for synthetic demo parcels only.
    Officers (Reviewer, Supervisor, Tech Admin) may generate for any parcel.
    Persists to `buyer_reports` and logs cryptographic audit trail.
    """
    if current_user.role == Role.CITIZEN.value:
        if not is_demo_parcel(parcel_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="নাগরিকরা শুধুমাত্র প্রদর্শনী (ডেমো) পার্সেলের প্রতিবেদন তৈরি করতে পারেন।",
            )

    try:
        report = await build_report(
            parcel_id=parcel_id,
            user_id=current_user.id,
            user_role=current_user.role,
            db=db,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

    return BuyerReportCreateResponse(**report)


@buyer_reports_router.get(
    "/{report_id}",
    response_model=BuyerReportCreateResponse,
    summary="Get buyer risk report JSON (Citizens see only their own reports)",
    dependencies=[Depends(rate_limit(requests=30, window_seconds=60))],
)
async def get_buyer_report_json(
    report_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require(Permission.DOCUMENT_READ, Scope.OWN)),
):
    """
    Retrieves full buyer report in JSON format.
    Enforces isolation: Citizens see only reports they created.
    """
    try:
        rep_uuid = uuid.UUID(report_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Malformed report UUID."
        )

    stmt = select(BuyerReport).where(BuyerReport.id == rep_uuid)
    res = await db.execute(stmt)
    report = res.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Buyer report not found.")

    # Isolation check: Citizens see only their own reports
    if current_user.role == Role.CITIZEN.value and report.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="অন্যের তৈরি করা প্রতিবেদন দেখার অনুমতি নেই।",
        )

    # Cryptographic Audit Log
    await write_audit_entry(
        db=db,
        actor_id=current_user.id,
        actor_role=current_user.role,
        action="buyer_report:view",
        resource_type="buyer_report",
        resource_id=str(report.id),
        scope=Scope.OWN.value,
        payload={"parcel_id": report.parcel_id, "format": "json"},
    )

    return BuyerReportCreateResponse(
        id=str(report.id),
        user_id=str(report.user_id),
        parcel_id=report.parcel_id,
        generated_at=report.generated_at.isoformat(),
        sections=report.sections,
        rule_version=report.rule_version,
        disclaimer_version=report.disclaimer_version,
    )


@buyer_reports_router.get(
    "/{report_id}/print",
    response_class=HTMLResponse,
    summary="Render printable HTML for buyer risk report (Citizens see only their own reports)",
    dependencies=[Depends(rate_limit(requests=30, window_seconds=60))],
)
async def get_buyer_report_print(
    report_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require(Permission.DOCUMENT_READ, Scope.OWN)),
):
    """
    Renders styled, printable HTML with print media queries for server-side PDF or browser printing.
    Enforces isolation: Citizens see only reports they created.
    """
    try:
        rep_uuid = uuid.UUID(report_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Malformed report UUID."
        )

    stmt = select(BuyerReport).where(BuyerReport.id == rep_uuid)
    res = await db.execute(stmt)
    report = res.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Buyer report not found.")

    # Isolation check: Citizens see only their own reports
    if current_user.role == Role.CITIZEN.value and report.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="অন্যের তৈরি করা প্রতিবেদন দেখার অনুমতি নেই।",
        )

    report_dict = {
        "id": str(report.id),
        "user_id": str(report.user_id),
        "parcel_id": report.parcel_id,
        "generated_at": report.generated_at.isoformat(),
        "sections": report.sections,
        "rule_version": report.rule_version,
        "disclaimer_version": report.disclaimer_version,
    }

    html = render_report_html(report_dict)

    # Cryptographic Audit Log
    await write_audit_entry(
        db=db,
        actor_id=current_user.id,
        actor_role=current_user.role,
        action="buyer_report:print",
        resource_type="buyer_report",
        resource_id=str(report.id),
        scope=Scope.OWN.value,
        payload={"parcel_id": report.parcel_id, "format": "print_html"},
    )

    return HTMLResponse(content=html, media_type="text/html")
