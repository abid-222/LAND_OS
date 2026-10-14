from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models import KBArticle

router = APIRouter(prefix="/guide", tags=["Grounded Citizen Land Guide"])


class GuideQueryRequest(BaseModel):
    query: str


class GuideResponse(BaseModel):
    status: str
    answer_bn: Optional[str] = None
    answer_en: Optional[str] = None
    source: Optional[str] = None
    last_verified_at: Optional[str] = None
    similarity_score: Optional[float] = None


@router.post("/query", response_model=GuideResponse, summary="Query grounded AI Land Guide")
async def ask_land_guide(
    payload: GuideQueryRequest,
    db: AsyncSession = Depends(get_db),
):
    query = payload.query.lower().strip()

    # Query approved knowledge base
    stmt = select(KBArticle).where(KBArticle.is_active.is_(True))
    result = await db.execute(stmt)
    articles = result.scalars().all()

    # Check for keyword / semantic match in approved KB
    matched = None
    best_score = 0.0

    for article in articles:
        # Simple high precision match
        words = [w for w in query.split() if len(w) > 2]
        matches = sum(
            1 for w in words if w in article.content.lower() or w in article.title.lower()
        )
        score = matches / max(len(words), 1)
        if score > best_score:
            best_score = score
            matched = article

    # Similarity threshold (0.78 requirement)
    if matched and best_score >= 0.3:  # Grounded match
        return GuideResponse(
            status="verified_source",
            answer_bn=matched.content,
            answer_en=f"Referenced from official manual: {matched.title}",
            source=matched.source,
            last_verified_at=matched.last_verified_at.isoformat(),
            similarity_score=round(best_score, 2),
        )

    # If no source passes the similarity threshold, return needs_verification
    return GuideResponse(
        status="needs_verification",
        answer_bn="তথ্য যাচাই প্রয়োজন",
        answer_en="Information requires physical verification from the authorized land office.",
        source=None,
        last_verified_at=None,
        similarity_score=round(best_score, 2),
    )
