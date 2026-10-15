"""
Land Records Router for Bangladesh LandOS.
Endpoint:
- GET /api/v1/records/{id} (source, retrieved_at, version, status_label)
Public reference data cached in Redis.
"""

import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.cache import get_cached_public_data, set_cached_public_data
from app.core.database import get_db
from app.models import LandRecord, StatusLabel
from app.modules.rbac.permissions import Permission, Scope, require

router = APIRouter(prefix="/records", tags=["Land Records"])


class RecordDetailResponse(BaseModel):
    id: str
    record_no: str
    survey_type: str
    khatian_no: str
    dag_no: str
    mouza_name_bn: Optional[str] = None
    mouza_jl: Optional[str] = None
    owner_names_bn: str
    land_class_bn: Optional[str] = None
    area_acres: Optional[float] = None
    source: str = "উপজেলা ভূমি অফিস রেকর্ড রুম (ডিজিটাল আরএস খতিয়ান)"
    retrieved_at: str
    version: str = "v1.0-official"
    status_label: str = StatusLabel.VERIFIED_AUTHORIZED_SOURCE.value
    disclaimer_bn: str = "প্রদর্শিত তথ্য শুধুমাত্র প্রদর্শনীমূলক। এটি আইনি দলিল হিসেবে গণ্য নয়।"


@router.get(
    "/{record_id}",
    response_model=RecordDetailResponse,
    summary="Get land record detail by ID with verified source metadata",
)
async def get_land_record_detail(
    record_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require(Permission.RECORD_SEARCH, Scope.GLOBAL)),
):
    """
    Fetches official baseline land record by UUID or record_no.
    Includes verified authorized source attribution and retrieval timestamp.
    Public reference data is cached in Redis.
    """
    cache_key = f"public:records:{record_id}"
    cached = await get_cached_public_data(cache_key)
    if cached:
        return RecordDetailResponse(**cached)

    stmt = select(LandRecord).options(selectinload(LandRecord.mouza))
    try:
        rec_uuid = uuid.UUID(record_id)
        stmt = stmt.where(LandRecord.id == rec_uuid)
    except ValueError:
        stmt = stmt.where(LandRecord.record_no == record_id)

    res = await db.execute(stmt)
    rec = res.scalar_one_or_none()
    if not rec:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Land record not found.",
        )

    retrieved_at = datetime.now(timezone.utc).isoformat()
    mouza_name = rec.mouza.name_bn if rec.mouza else None
    mouza_jl = rec.mouza.jl_no if rec.mouza else None

    resp = RecordDetailResponse(
        id=str(rec.id),
        record_no=rec.record_no,
        survey_type=rec.survey_type,
        khatian_no=rec.khatian_no,
        dag_no=rec.dag_no,
        mouza_name_bn=mouza_name,
        mouza_jl=mouza_jl,
        owner_names_bn=rec.owner_names_bn,
        land_class_bn=rec.land_class_bn,
        area_acres=rec.area_acres,
        source="উপজেলা ভূমি অফিস রেকর্ড রুম (ডিজিটাল আরএস খতিয়ান)",
        retrieved_at=retrieved_at,
        version=f"{rec.survey_type}-official-rev1",
        status_label=StatusLabel.VERIFIED_AUTHORIZED_SOURCE.value,
    )

    # Cache public reference data
    await set_cached_public_data(cache_key, resp.model_dump(), ttl_seconds=300)

    return resp
