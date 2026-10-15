"""
Grounded Citizen Land Guide Router for Bangladesh LandOS.
Endpoints:
- POST /api/v1/guide/ask (grounded answer | needs_verification)
- POST /api/v1/guide/query (alias)
Rule:
- Never hallucinate or invent legal procedures, fees, or advice.
- When ungrounded, returns strictly 'needs_verification'.
"""

from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.rate_limit import rate_limit
from app.models import KBArticle

router = APIRouter(prefix="/guide", tags=["Grounded Citizen Land Guide"])


class AskGuideRequest(BaseModel):
    question: str = Field(..., min_length=2, description="Citizen inquiry in Bengali or English")


class GuideResponse(BaseModel):
    status: str  # "verified_source" | "needs_verification"
    answer_bn: str
    answer_en: str
    source: Optional[str] = None
    last_verified_at: Optional[str] = None
    similarity_score: Optional[float] = None
    disclaimer_bn: str = "এটি আইনি পরামর্শ বা মালিকানার সিদ্ধান্ত নয়। সরকারি বিধিমালা অনুযায়ী যাচাই করুন।"


@router.post(
    "/ask",
    response_model=GuideResponse,
    summary="Ask grounded question to Land Guide knowledge base",
    dependencies=[Depends(rate_limit(requests=30, window_seconds=60))],
)
@router.post(
    "/query",
    response_model=GuideResponse,
    summary="Query Land Guide (alias)",
    dependencies=[Depends(rate_limit(requests=30, window_seconds=60))],
)
async def ask_land_guide(
    payload: AskGuideRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieves grounded response strictly from approved knowledge base articles.
    If the question is ungroundable or does not achieve sufficient match confidence,
    strictly returns 'needs_verification'.
    """
    query = payload.question.lower().strip()

    stmt = select(KBArticle).where(KBArticle.is_active.is_(True))
    try:
        result = await db.execute(stmt)
        articles = list(result.scalars().all())
    except Exception:
        articles = []

    matched = None
    best_score = 0.0

    query_tokens = [t for t in query.split() if len(t) > 2]
    if query_tokens:
        for article in articles:
            content_lower = (article.content + " " + article.title).lower()
            matches = sum(1 for t in query_tokens if t in content_lower)
            score = matches / len(query_tokens)
            if score > best_score:
                best_score = score
                matched = article

    # Grounding confidence threshold (0.35)
    if matched and best_score >= 0.35:
        verified_date = matched.last_verified_at.isoformat() if matched.last_verified_at else None
        return GuideResponse(
            status="verified_source",
            answer_bn=matched.content,
            answer_en=f"Referenced from official manual: {matched.title}",
            source=matched.source,
            last_verified_at=verified_date,
            similarity_score=round(best_score, 2),
        )

    # Refusal on ungrounded query
    return GuideResponse(
        status="needs_verification",
        answer_bn="তথ্য যাচাই প্রয়োজন",
        answer_en="Information requires physical verification from the authorized land office.",
        source=None,
        last_verified_at=None,
        similarity_score=round(best_score, 2),
    )
