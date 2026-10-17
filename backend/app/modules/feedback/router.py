import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models import FeedbackCorrection, User
from app.modules.admin.audit import write_audit_entry
from app.modules.auth.dependencies import get_current_user

router = APIRouter(prefix="/feedback", tags=["Human-in-the-Loop Feedback"])


class FeedbackCorrectionRequest(BaseModel):
    document_id: Optional[str] = None
    feedback_type: str  # "wrong_match" | "wrong_field"
    field_name: Optional[str] = None
    reported_value: Optional[str] = None
    corrected_value: Optional[str] = None
    comments: Optional[str] = None


class FeedbackCorrectionResponse(BaseModel):
    id: str
    status: str
    message: str


@router.post(
    "/corrections",
    response_model=FeedbackCorrectionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit human-in-the-loop labeled correction for the evaluation dataset (never auto-trained)",
)
async def submit_feedback_correction(
    payload: FeedbackCorrectionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc_uuid = None
    if payload.document_id:
        try:
            doc_uuid = uuid.UUID(payload.document_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Malformed document UUID."
            )

    correction = FeedbackCorrection(
        id=uuid.uuid4(),
        user_id=current_user.id,
        document_id=doc_uuid,
        feedback_type=payload.feedback_type,
        field_name=payload.field_name,
        reported_value=payload.reported_value,
        corrected_value=payload.corrected_value,
        comments=payload.comments,
        status="evaluation_candidate",  # Strictly labeled candidate, never auto-trained
    )
    db.add(correction)
    await db.commit()
    await db.refresh(correction)

    await write_audit_entry(
        db=db,
        actor_id=current_user.id,
        actor_role=current_user.role,
        action="feedback:submit_correction",
        resource_type="feedback_correction",
        resource_id=str(correction.id),
        scope="own",
        payload={
            "feedback_type": payload.feedback_type,
            "field_name": payload.field_name,
            "status": "evaluation_candidate",
        },
    )

    return FeedbackCorrectionResponse(
        id=str(correction.id),
        status="evaluation_candidate",
        message="Correction saved to evaluation candidate pool for human review. Never auto-trained.",
    )
