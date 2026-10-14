from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models import LandRecord
from app.modules.rbac.permissions import Permission, Scope, require

router = APIRouter(prefix="/search", tags=["Land Records & Khatian Search"])


@router.get("", summary="Scan-to-search and trigram fuzzy matching on Khatians")
async def search_land_records(
    q: Optional[str] = Query(
        None, description="Search query (khatian, dag, or owner name in Bengali)"
    ),
    mouza_jl: Optional[str] = Query(None, description="Mouza JL Number"),
    survey_type: Optional[str] = Query(None, description="CS, SA, RS, BS, City Survey"),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require(Permission.RECORD_SEARCH, Scope.GLOBAL)),
):
    stmt = select(LandRecord).limit(limit)

    if q:
        stmt = stmt.where(
            or_(
                LandRecord.khatian_no.ilike(f"%{q}%"),
                LandRecord.dag_no.ilike(f"%{q}%"),
                LandRecord.owner_names_bn.ilike(f"%{q}%"),
            )
        )
    if survey_type:
        stmt = stmt.where(LandRecord.survey_type == survey_type)

    result = await db.execute(stmt)
    records = result.scalars().all()

    return {
        "query": q,
        "count": len(records),
        "disclaimer_bn": "প্রদর্শিত তথ্য শুধুমাত্র প্রদর্শনীমূলক। এটি আইনি দলিল হিসেবে গণ্য নয়।",
        "disclaimer_en": "Illustrative / Not a legal boundary. Synthetic demo data.",
        "results": records,
    }
