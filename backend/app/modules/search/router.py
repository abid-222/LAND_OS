"""
Multi-Identifier Land Record Search Router for Bangladesh LandOS.
Endpoints:
- POST /api/v1/search (multi-identifier; pg_trgm + exact; scorer; returns candidates with reasons)
- GET  /api/v1/search (query string search)
Rules:
- Ambiguous matches (top-2 score gap < 0.10) must set `ambiguous=true`.
- Never auto-confirm or return 'verified ownership'.
"""

from typing import Any, List, Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.normalize import fuzzy_compare_names, normalize_identifier, normalize_mouza
from app.core.rate_limit import rate_limit
from app.models import LandRecord, Mouza, StatusLabel
from app.modules.rbac.permissions import Permission, Scope, require

router = APIRouter(prefix="/search", tags=["Land Records & Khatian Search"])


class SearchRequest(BaseModel):
    dag_no: Optional[str] = Field(None, description="Plot / Dag number in Bengali or ASCII")
    khatian_no: Optional[str] = Field(None, description="Khatian number in Bengali or ASCII")
    mouza: Optional[str] = Field(None, description="Mouza name or JL number")
    owner_name: Optional[str] = Field(None, description="Owner name in Bengali")
    survey_type: Optional[str] = Field(None, description="CS, SA, RS, BS, City Survey")
    limit: int = Field(10, ge=1, le=50)


class SearchCandidateItem(BaseModel):
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
    score: float
    reasons: List[str]
    status_label: str = StatusLabel.POSSIBLE_MATCH.value
    ambiguous: bool = False


class SearchResponse(BaseModel):
    total_found: int
    ambiguous: bool
    candidates: List[SearchCandidateItem]
    disclaimer_bn: str = "প্রদর্শিত তথ্য শুধুমাত্র প্রদর্শনীমূলক। এটি আইনি দলিল হিসেবে গণ্য নয়।"
    disclaimer_en: str = "Illustrative / Not a legal boundary. Synthetic demo data."


@router.post(
    "",
    response_model=SearchResponse,
    summary="Multi-identifier land record search with scorer & ambiguous top-2 detection",
    dependencies=[Depends(rate_limit(requests=30, window_seconds=60))],
)
async def multi_identifier_search(
    payload: SearchRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require(Permission.RECORD_SEARCH, Scope.GLOBAL)),
):
    """
    Multi-identifier search using exact normalized matching and trigram similarity.
    Calculates candidate match score and generates human-readable reasons.
    If the score difference between top 2 candidates is < 0.10, flags `ambiguous=True`.
    Never auto-confirms ownership.
    """
    stmt = select(LandRecord).options(selectinload(LandRecord.mouza)).limit(100)
    filters: List[Any] = []

    norm_dag = normalize_identifier(payload.dag_no, "dag_no").normalized_value if payload.dag_no else None
    norm_khatian = normalize_identifier(payload.khatian_no, "khatian_no").normalized_value if payload.khatian_no else None
    norm_mouza = normalize_mouza(payload.mouza).normalized_name if payload.mouza else None

    if payload.dag_no:
        dag_crit = [LandRecord.dag_no.ilike(f"%{payload.dag_no.strip()}%")]
        if norm_dag and norm_dag != payload.dag_no.strip():
            dag_crit.append(LandRecord.dag_no.ilike(f"%{norm_dag}%"))
        filters.append(or_(*dag_crit))

    if payload.khatian_no:
        khat_crit = [LandRecord.khatian_no.ilike(f"%{payload.khatian_no.strip()}%")]
        if norm_khatian and norm_khatian != payload.khatian_no.strip():
            khat_crit.append(LandRecord.khatian_no.ilike(f"%{norm_khatian}%"))
        filters.append(or_(*khat_crit))

    if payload.owner_name:
        filters.append(LandRecord.owner_names_bn.ilike(f"%{payload.owner_name.strip()}%"))
    if payload.survey_type:
        filters.append(LandRecord.survey_type == payload.survey_type.strip())
    if payload.mouza:
        stmt = stmt.join(LandRecord.mouza, isouter=True)
        filters.append(
            or_(
                Mouza.name_bn.ilike(f"%{payload.mouza.strip()}%"),
                Mouza.name_en.ilike(f"%{payload.mouza.strip()}%"),
                Mouza.jl_no.ilike(f"%{payload.mouza.strip()}%"),
            )
        )

    if filters:
        stmt = stmt.where(or_(*filters))

    result = await db.execute(stmt)
    records = list(result.scalars().all())

    # Score and rank candidates
    scored_candidates: List[SearchCandidateItem] = []

    for r in records:
        reasons = []
        base_score = 0.50

        # Dag comparison
        if norm_dag or payload.dag_no:
            r_dag = normalize_identifier(r.dag_no, "dag_no").normalized_value
            raw_dag = payload.dag_no.strip() if payload.dag_no else ""
            if (norm_dag and r_dag == norm_dag) or (raw_dag and raw_dag == (r.dag_no or "").strip()):
                base_score += 0.25
                reasons.append("দাগ নম্বর হুবহু মিলেছে")
            elif (norm_dag and r_dag and norm_dag in r_dag) or (raw_dag and raw_dag in (r.dag_no or "")):
                base_score += 0.18
                reasons.append("দাগ নম্বর আংশিক মিলেছে")

        # Khatian comparison
        if norm_khatian or payload.khatian_no:
            r_khat = normalize_identifier(r.khatian_no, "khatian_no").normalized_value
            raw_khat = payload.khatian_no.strip() if payload.khatian_no else ""
            if (norm_khatian and r_khat == norm_khatian) or (raw_khat and raw_khat == (r.khatian_no or "").strip()):
                base_score += 0.25
                reasons.append("খতিয়ান নম্বর মিলেছে")
            elif (norm_khatian and r_khat and norm_khatian in r_khat) or (raw_khat and raw_khat in (r.khatian_no or "")):
                base_score += 0.18
                reasons.append("খতিয়ান নম্বর আংশিক মিলেছে")

        # Mouza comparison
        mouza_name = r.mouza.name_bn if r.mouza else None
        mouza_jl = r.mouza.jl_no if r.mouza else None
        if norm_mouza and mouza_name:
            r_mouza_norm = normalize_mouza(mouza_name).normalized_name
            sim = fuzzy_compare_names(norm_mouza, r_mouza_norm)
            if sim >= 85.0:
                base_score += 0.15
                reasons.append("মৌজা নাম মিলেছে")

        # Owner name fuzzy comparison
        if payload.owner_name and r.owner_names_bn:
            owner_sim = fuzzy_compare_names(payload.owner_name, r.owner_names_bn)
            if owner_sim >= 75.0:
                base_score += 0.15
                reasons.append("মালিকের নাম সাদৃশ্যপূর্ণ")

        final_score = min(0.99, max(0.10, round(base_score, 3)))
        if not reasons:
            reasons.append("প্রাথমিক ফিল্টার ভিত্তিক সম্ভাব্য মিল")

        scored_candidates.append(
            SearchCandidateItem(
                id=str(r.id),
                record_no=r.record_no,
                survey_type=r.survey_type,
                khatian_no=r.khatian_no,
                dag_no=r.dag_no,
                mouza_name_bn=mouza_name,
                mouza_jl=mouza_jl,
                owner_names_bn=r.owner_names_bn,
                land_class_bn=r.land_class_bn,
                area_acres=r.area_acres,
                score=final_score,
                reasons=reasons,
                status_label=StatusLabel.POSSIBLE_MATCH.value,
                ambiguous=False,
            )
        )

    # Sort descending by match score
    scored_candidates.sort(key=lambda x: x.score, reverse=True)
    top_candidates = scored_candidates[: payload.limit]

    # Check ambiguity rule: top-2 score gap < 0.10
    ambiguous_flag = False
    if len(top_candidates) >= 2:
        gap = abs(top_candidates[0].score - top_candidates[1].score)
        if gap < 0.10:
            ambiguous_flag = True
            for c in top_candidates:
                c.ambiguous = True

    return SearchResponse(
        total_found=len(top_candidates),
        ambiguous=ambiguous_flag,
        candidates=top_candidates,
    )


@router.get("", summary="Scan-to-search query string endpoint")
async def search_land_records(
    q: Optional[str] = Query(None, description="Search query"),
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
