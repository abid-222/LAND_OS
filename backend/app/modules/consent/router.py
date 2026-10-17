import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Request, status
from pydantic import BaseModel
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models import ConsentRecord, User
from app.modules.admin.audit import write_audit_entry
from app.modules.auth.dependencies import get_current_user

router = APIRouter(prefix="/consent", tags=["Consent Records"])


class ConsentSubmitRequest(BaseModel):
    consent_type: str  # "camera" | "offline_storage" | "privacy_terms"
    version: str = "v1.0"
    agreed: bool = True


class ConsentRecordResponse(BaseModel):
    id: str
    consent_type: str
    version: str
    agreed: bool
    timestamp: str


@router.post(
    "",
    response_model=ConsentRecordResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record citizen consent for camera, offline storage, or privacy terms",
)
async def submit_consent(
    payload: ConsentSubmitRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user),
):
    user_id = current_user.id if current_user else None
    client_ip = request.client.host if request.client else None

    consent = ConsentRecord(
        id=uuid.uuid4(),
        user_id=user_id,
        consent_type=payload.consent_type,
        version=payload.version,
        agreed=payload.agreed,
        ip_address=client_ip,
    )
    db.add(consent)
    await db.commit()
    await db.refresh(consent)

    if user_id:
        await write_audit_entry(
            db=db,
            actor_id=user_id,
            actor_role=current_user.role if current_user else "Citizen",
            action="consent:record",
            resource_type="consent",
            resource_id=str(consent.id),
            scope="own",
            payload={
                "type": payload.consent_type,
                "version": payload.version,
                "agreed": payload.agreed,
            },
            ip_address=client_ip,
        )

    return ConsentRecordResponse(
        id=str(consent.id),
        consent_type=consent.consent_type,
        version=consent.version,
        agreed=consent.agreed,
        timestamp=consent.created_at.isoformat(),
    )


@router.get(
    "/latest",
    summary="Get latest consent status for user by type",
)
async def get_latest_consent(
    consent_type: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = (
        select(ConsentRecord)
        .where(ConsentRecord.user_id == current_user.id, ConsentRecord.consent_type == consent_type)
        .order_by(desc(ConsentRecord.created_at))
        .limit(1)
    )
    res = await db.execute(stmt)
    consent = res.scalar_one_or_none()

    if not consent:
        return {"agreed": False, "version": None, "recorded_at": None}

    return {
        "agreed": consent.agreed,
        "version": consent.version,
        "recorded_at": consent.created_at.isoformat(),
    }
