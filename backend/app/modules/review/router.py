"""
Human-in-the-Loop Case Review Router for Bangladesh LandOS.
Endpoints:
- GET  /api/v1/review/queue        (list pending review cases)
- POST /api/v1/review/{id}/decision (submit reviewer/supervisor decision)
"""

import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models import Case
from app.modules.admin.audit import write_audit_entry
from app.modules.rbac.permissions import Permission, Scope, require

router = APIRouter(prefix="/review", tags=["Human-in-the-Loop Case Review"])


class ReviewCaseItem(BaseModel):
    id: str
    case_number: str
    case_type: str
    status: str
    priority: str
    office_id: str
    notes: Optional[str] = None
    created_at: str
    updated_at: str


class ReviewQueueResponse(BaseModel):
    total_pending: int
    cases: List[ReviewCaseItem]


class ReviewDecisionRequest(BaseModel):
    decision: str = Field(..., description="CONFIRMED | REJECTED | CORRECTED | HEARING_SCHEDULED")
    notes: Optional[str] = Field(None, description="Official reviewer notes")
    corrected_fields: Optional[Dict[str, str]] = Field(None, description="Field corrections if decision is CORRECTED")


class ReviewDecisionResponse(BaseModel):
    case_id: str
    case_number: str
    decision: str
    status: str
    reviewed_by: str
    updated_at: str
    message: str


@router.get(
    "/queue",
    response_model=ReviewQueueResponse,
    summary="List pending review cases in review queue",
)
@router.get(
    "/cases",
    response_model=List[ReviewCaseItem],
    summary="List cases (alias)",
)
async def get_review_queue(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require(Permission.CASE_VIEW, Scope.OFFICE)),
):
    """
    Returns pending cases in the human review queue.
    Shows cases requiring human verification (low confidence OCR, repaired fields, conflicting dates).
    """
    stmt = (
        select(Case)
        .where(
            or_(
                Case.status == "needs_human_review",
                Case.status == "SUBMITTED",
                Case.status == "open",
                Case.status == "PENDING",
            )
        )
    )
    from app.modules.rbac.permissions import Role
    if current_user.role in (Role.OPERATOR.value, Role.REVIEWER.value, Role.SUPERVISOR.value, Role.OFFICE_ADMIN.value):
        if current_user.office_id:
            stmt = stmt.where(Case.office_id == current_user.office_id)

    stmt = stmt.order_by(Case.created_at.desc()).limit(50)
    res = await db.execute(stmt)
    db_cases = list(res.scalars().all())

    items = [
        ReviewCaseItem(
            id=str(c.id),
            case_number=c.case_number,
            case_type=c.case_type,
            status=c.status,
            priority=c.priority,
            office_id=str(c.office_id),
            notes=c.notes,
            created_at=c.created_at.isoformat(),
            updated_at=c.updated_at.isoformat() if c.updated_at else c.created_at.isoformat(),
        )
        for c in db_cases
    ]

    # Handle alias endpoint returning list
    return ReviewQueueResponse(
        total_pending=len(items),
        cases=items,
    )


@router.post(
    "/{case_id}/decision",
    response_model=ReviewDecisionResponse,
    summary="Submit review decision for a case",
)
@router.post(
    "/cases/{case_id}/decision",
    response_model=ReviewDecisionResponse,
    summary="Submit review decision (alias)",
)
async def submit_case_decision(
    case_id: str,
    payload: ReviewDecisionRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require(Permission.CASE_REVIEW, Scope.OFFICE)),
):
    """
    Records a reviewer decision on an unconfirmed or flagged case.
    Updates case status, logs audit event, and sets document status.
    """
    stmt = select(Case)
    try:
        case_uuid = uuid.UUID(case_id)
        stmt = stmt.where(Case.id == case_uuid)
    except ValueError:
        stmt = stmt.where(Case.case_number == case_id)

    res = await db.execute(stmt)
    c = res.scalar_one_or_none()
    if not c:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Case '{case_id}' not found.",
        )

    from app.modules.rbac.permissions import Role
    if current_user.role in (Role.OPERATOR.value, Role.REVIEWER.value, Role.SUPERVISOR.value, Role.OFFICE_ADMIN.value):
        if current_user.office_id and c.office_id and c.office_id != current_user.office_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Cannot review cases outside assigned office.",
            )

    prev_status = c.status
    decision_clean = payload.decision.upper().strip()

    if decision_clean in ("CONFIRMED", "APPROVED"):
        c.status = "APPROVED"
    elif decision_clean == "REJECTED":
        c.status = "REJECTED"
    elif decision_clean == "CORRECTED":
        c.status = "CORRECTED"
    else:
        c.status = decision_clean

    if payload.notes:
        c.notes = f"{c.notes or ''}\n[{current_user.role} Note]: {payload.notes}".strip()
    c.assigned_reviewer_id = current_user.id
    c.updated_at = datetime.now(timezone.utc)

    # Cryptographic audit logging
    await write_audit_entry(
        db=db,
        actor_id=current_user.id,
        actor_role=current_user.role,
        action="case:review_decision",
        resource_type="case",
        resource_id=str(c.id),
        scope=Scope.OFFICE.value,
        payload={
            "case_id": str(c.id),
            "case_number": c.case_number,
            "previous_status": prev_status,
            "new_status": c.status,
            "decision": decision_clean,
            "notes": payload.notes,
        },
    )

    await db.commit()

    return ReviewDecisionResponse(
        case_id=str(c.id),
        case_number=c.case_number,
        decision=decision_clean,
        status=c.status,
        reviewed_by=str(current_user.id),
        updated_at=c.updated_at.isoformat(),
        message="Review decision recorded successfully.",
    )


class CaseAssignRequest(BaseModel):
    reviewer_id: uuid.UUID
    notes: Optional[str] = None


@router.patch(
    "/{case_id}/assign",
    summary="Assign or reassign a review case",
)
@router.patch(
    "/cases/{case_id}/assign",
    summary="Assign or reassign a review case (alias)",
)
async def assign_case(
    case_id: str,
    payload: CaseAssignRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require(Permission.CASE_ASSIGN, Scope.OFFICE)),
):
    stmt = select(Case)
    try:
        case_uuid = uuid.UUID(case_id)
        stmt = stmt.where(Case.id == case_uuid)
    except ValueError:
        stmt = stmt.where(Case.case_number == case_id)

    res = await db.execute(stmt)
    c = res.scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Case '{case_id}' not found.")

    from app.models import User
    from app.modules.rbac.permissions import Role
    if current_user.role in (Role.SUPERVISOR.value, Role.OFFICE_ADMIN.value):
        if current_user.office_id and c.office_id and c.office_id != current_user.office_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot assign cases outside assigned office.")

    r_stmt = select(User).where(User.id == payload.reviewer_id)
    r_res = await db.execute(r_stmt)
    reviewer = r_res.scalar_one_or_none()
    if not reviewer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assigned reviewer not found.")

    c.assigned_reviewer_id = reviewer.id
    if payload.notes:
        c.notes = f"{c.notes or ''}\n[Assigned by {current_user.role}]: {payload.notes}".strip()
    c.updated_at = datetime.now(timezone.utc)
    await db.commit()

    await write_audit_entry(
        db=db,
        actor_id=current_user.id,
        actor_role=current_user.role,
        action="case:assign",
        resource_type="case",
        resource_id=str(c.id),
        scope="office",
        payload={"case_number": c.case_number, "assigned_to": str(reviewer.id)},
    )

    return {"status": "success", "case_id": str(c.id), "assigned_to": str(reviewer.id), "case_status": c.status}

