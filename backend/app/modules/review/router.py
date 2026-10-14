from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models import Case
from app.modules.rbac.permissions import Permission, Scope, require

router = APIRouter(prefix="/review", tags=["Human-in-the-Loop Case Review"])


class ReviewDecisionRequest(BaseModel):
    decision: str  # "APPROVED" | "REJECTED" | "HEARING_SCHEDULED"
    notes: Optional[str] = None


@router.get("/cases", summary="List pending mutation and correction cases")
async def list_cases(
    status_filter: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require(Permission.CASE_VIEW, Scope.OFFICE)),
):
    stmt = select(Case).order_by(Case.created_at.desc()).limit(50)
    if status_filter:
        stmt = stmt.where(Case.status == status_filter)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("/cases/{case_id}/decision", summary="Submit review decision")
async def submit_case_decision(
    case_id: str,
    payload: ReviewDecisionRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require(Permission.CASE_APPROVE, Scope.OFFICE)),
):
    return {
        "case_id": case_id,
        "decision": payload.decision,
        "reviewed_by": str(current_user.id),
        "status": "updated",
    }
