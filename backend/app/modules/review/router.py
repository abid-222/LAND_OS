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
    corrected_fields: Optional[Dict[str, str]] = Field(
        None, description="Field corrections if decision is CORRECTED"
    )


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
    stmt = select(Case).where(
        or_(
            Case.status == "needs_human_review",
            Case.status == "SUBMITTED",
            Case.status == "open",
            Case.status == "PENDING",
        )
    )
    from app.modules.rbac.permissions import Role

    if current_user.role in (
        Role.OPERATOR.value,
        Role.REVIEWER.value,
        Role.SUPERVISOR.value,
        Role.OFFICE_ADMIN.value,
    ):
        if current_user.office_id:
            stmt = stmt.where(Case.office_id == current_user.office_id)

    stmt = stmt.order_by(Case.created_at.desc()).limit(50)
    res = await db.execute(stmt)
    db_cases = list(res.scalars().all())

    if not db_cases:
        # Auto-seed standard demo cases for review queue if DB is fresh
        from app.models import Office, User

        c_res = await db.execute(select(User).where(User.email == "citizen@landos.gov.bd").limit(1))
        citizen_user = c_res.scalar_one_or_none()
        o_res = await db.execute(select(Office).limit(1))
        office = o_res.scalar_one_or_none()

        if citizen_user and office:
            demo_cases = [
                Case(
                    id=uuid.uuid4(),
                    case_number="REV-2026-081",
                    case_type="MUTATION",
                    citizen_id=citizen_user.id,
                    office_id=office.id,
                    status="needs_human_review",
                    priority="HIGH",
                    notes="দাগ নং ১২০৫ (তেজগাঁও সার্কেল) - সম্ভাব্য দাগ এলাকা অসঙ্গতি ও পরচা যাচাই প্রয়োজন।",
                ),
                Case(
                    id=uuid.uuid4(),
                    case_number="REV-2026-082",
                    case_type="DEED_VERIFICATION",
                    citizen_id=citizen_user.id,
                    office_id=office.id,
                    status="needs_human_review",
                    priority="MEDIUM",
                    notes="দলিল নং ৪৫২০ (তেজগাঁও) - সাব-রেজিস্ট্রি দলিলের তারিখ ও নামজারি মেলবন্ধন পর্যালোচনা।",
                ),
                Case(
                    id=uuid.uuid4(),
                    case_number="REV-2026-083",
                    case_type="MUTATION",
                    citizen_id=citizen_user.id,
                    office_id=office.id,
                    status="needs_human_review",
                    priority="LOW",
                    notes="পর্চা নং ৩৪০ (গুলশান সার্কেল) - ই-নামজারি ও ওয়ারিশান খতিয়ান সংশোধনের আবেদন।",
                ),
            ]
            for dc in demo_cases:
                db.add(dc)
            await db.commit()
            db_cases = demo_cases

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


class CitizenCaseApplyRequest(BaseModel):
    case_type: str = Field(
        default="MUTATION", description="MUTATION | RECORD_VERIFICATION | BOUNDARY_DISPUTE"
    )
    khatian_no: str
    dag_no: str
    mouza: str
    area_decimal: Optional[float] = None
    applicant_name: Optional[str] = None
    notes: Optional[str] = None
    office_id: Optional[str] = None


class CitizenCaseApplyResponse(BaseModel):
    id: str
    case_number: str
    case_type: str
    status: str
    priority: str
    notes: Optional[str]
    created_at: str
    message: str


@router.post(
    "/cases/apply",
    response_model=CitizenCaseApplyResponse,
    summary="Citizen application for land mutation / porcha review",
)
@router.post(
    "/apply",
    response_model=CitizenCaseApplyResponse,
    summary="Citizen application (alias)",
)
async def apply_for_case(
    payload: CitizenCaseApplyRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require(Permission.CASE_CREATE, Scope.OWN)),
):
    from app.models import Office

    office_uuid: Optional[uuid.UUID] = None
    if payload.office_id:
        try:
            office_uuid = uuid.UUID(payload.office_id)
        except ValueError:
            pass

    if not office_uuid:
        o_stmt = select(Office).limit(1)
        o_res = await db.execute(o_stmt)
        default_office = o_res.scalar_one_or_none()
        office_uuid = default_office.id if default_office else uuid.uuid4()

    case_num = f"MUT-2026-{uuid.uuid4().hex[:6].upper()}"
    detailed_notes = (
        f"মৌজা: {payload.mouza} | দাগ নং: {payload.dag_no} | খতিয়ান: {payload.khatian_no}"
        + (f" | জমির পরিমাণ: {payload.area_decimal} শতক" if payload.area_decimal else "")
        + (f" | আবেদনকারী: {payload.applicant_name}" if payload.applicant_name else "")
        + (f"\nআবেদন বিবরণ: {payload.notes}" if payload.notes else "")
    )

    new_case = Case(
        id=uuid.uuid4(),
        case_number=case_num,
        case_type=payload.case_type,
        citizen_id=current_user.id,
        office_id=office_uuid,
        status="needs_human_review",
        priority="NORMAL",
        notes=detailed_notes,
    )
    db.add(new_case)
    await db.commit()
    await db.refresh(new_case)

    # Write audit log
    await write_audit_entry(
        db=db,
        actor_id=current_user.id,
        actor_role=current_user.role,
        action="case:create",
        resource_type="case",
        resource_id=str(new_case.id),
        scope=Scope.OWN.value,
        payload={
            "case_number": new_case.case_number,
            "case_type": new_case.case_type,
            "mouza": payload.mouza,
            "dag_no": payload.dag_no,
            "khatian_no": payload.khatian_no,
        },
    )

    return CitizenCaseApplyResponse(
        id=str(new_case.id),
        case_number=new_case.case_number,
        case_type=new_case.case_type,
        status=new_case.status,
        priority=new_case.priority,
        notes=new_case.notes,
        created_at=new_case.created_at.isoformat(),
        message="নামজারি আবেদন সফলভাবে গৃহীত হয়েছে এবং সহকারী কমিশনার (ভূমি) পর্যালোচনা তালিকায় যুক্ত হয়েছে।",
    )


@router.get(
    "/cases/my",
    response_model=List[ReviewCaseItem],
    summary="List citizen's own submitted cases and mutation status",
)
@router.get(
    "/my-cases",
    response_model=List[ReviewCaseItem],
    summary="List citizen's own cases (alias)",
)
async def get_my_cases(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require(Permission.CASE_VIEW, Scope.OWN)),
):
    stmt = (
        select(Case)
        .where(Case.citizen_id == current_user.id)
        .order_by(Case.created_at.desc())
        .limit(50)
    )
    res = await db.execute(stmt)
    cases = list(res.scalars().all())

    return [
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
        for c in cases
    ]


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

    if current_user.role in (
        Role.OPERATOR.value,
        Role.REVIEWER.value,
        Role.SUPERVISOR.value,
        Role.OFFICE_ADMIN.value,
    ):
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
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"Case '{case_id}' not found."
        )

    from app.models import User
    from app.modules.rbac.permissions import Role

    if current_user.role in (Role.SUPERVISOR.value, Role.OFFICE_ADMIN.value):
        if current_user.office_id and c.office_id and c.office_id != current_user.office_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot assign cases outside assigned office.",
            )

    r_stmt = select(User).where(User.id == payload.reviewer_id)
    r_res = await db.execute(r_stmt)
    reviewer = r_res.scalar_one_or_none()
    if not reviewer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Assigned reviewer not found."
        )

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

    return {
        "status": "success",
        "case_id": str(c.id),
        "assigned_to": str(reviewer.id),
        "case_status": c.status,
    }
