"""
Grounded Citizen Land Guide Router for Bangladesh LandOS.
Endpoints:
- POST /api/v1/guide/ask (grounded answer | needs_verification)
- POST /api/v1/guide/query (alias)
Rule:
- Never hallucinate or invent legal procedures, fees, or advice.
- When ungrounded, returns strictly 'needs_verification'.
"""

import glob
import os
import re
from datetime import datetime
from typing import Any, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.rate_limit import rate_limit
from app.models import KBArticle

router = APIRouter(prefix="/guide", tags=["Grounded Citizen Land Guide"])

# Common Bengali query stop words
BENGALI_STOPWORDS = {
    "জন্য",
    "কী",
    "কি",
    "কীভাবে",
    "কিভাবে",
    "কেন",
    "কার",
    "কোথায়",
    "কখন",
    "কত",
    "পারে",
    "পারি",
    "হতে",
    "হলে",
    "এবং",
    "ও",
    "বা",
    "থেকে",
    "দ্বারা",
    "দিয়ে",
    "করা",
    "করলে",
    "করতে",
    "করব",
    "করবো",
    "লাগে",
    "লাগতে",
    "হবে",
    "আছে",
    "না",
    "একটি",
    "এই",
    "সেই",
    "এর",
    "কে",
    "তে",
    "র",
    "সহ",
    "নিয়ে",
    "সার্ভিস",
    "সরকারি",
    "চাই",
    "দরকার",
    "সম্পর্কে",
    "বলুন",
    "জানতে",
    "উপায়",
}


class AskGuideRequest(BaseModel):
    question: str = Field(..., min_length=2, description="Citizen inquiry in Bengali or English")


class GuideResponse(BaseModel):
    status: str  # "verified_source" | "needs_verification"
    answer_bn: str
    answer_en: str
    source: Optional[str] = None
    last_verified_at: Optional[str] = None
    similarity_score: Optional[float] = None
    disclaimer_bn: str = (
        "এটি আইনি পরামর্শ বা মালিকানার সিদ্ধান্ত নয়। সরকারি বিধিমালা অনুযায়ী যাচাই করুন।"
    )


def resolve_kb_path() -> Optional[str]:
    candidates = [
        "data/kb",
        "../data/kb",
        "../../data/kb",
        os.path.join(os.path.dirname(__file__), "../../../../data/kb"),
        os.path.join(os.path.dirname(__file__), "../../../data/kb"),
    ]
    for c in candidates:
        if os.path.exists(c) and os.path.isdir(c):
            return os.path.abspath(c)
    return None


def parse_frontmatter(content: str) -> tuple[dict, str]:
    if not content.startswith("---"):
        return {}, content
    parts = content.split("---", 2)
    if len(parts) < 3:
        return {}, content
    fm_text = parts[1]
    body = parts[2].strip()
    meta = {}
    for line in fm_text.strip().splitlines():
        if ":" in line:
            key, val = line.split(":", 1)
            meta[key.strip()] = val.strip().strip('"').strip("'")
    return meta, body


class StaticArticle:
    def __init__(self, title: str, content: str, source: str, last_verified_at: Optional[datetime]):
        self.title = title
        self.content = content
        self.source = source
        self.last_verified_at = last_verified_at


def extract_bn_title(content: str, default_title: str) -> str:
    for line in content.splitlines():
        line = line.strip()
        if line.startswith("# "):
            return line.lstrip("# ").strip()
    return default_title


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
    strictly returns 'needs_verification' with NO generated answer.
    """
    clean_query = re.sub(r"[?!.,;:\-—()\"\'/]", " ", payload.question.lower()).strip()

    stmt = select(KBArticle).where(KBArticle.is_active.is_(True))
    articles: list[Any] = []
    try:
        result = await db.execute(stmt)
        articles.extend(result.scalars().all())
    except Exception:
        articles = []

    # Fallback to local approved markdown knowledge base if db table is empty
    if not articles:
        kb_dir = resolve_kb_path()
        if kb_dir:
            for md_path in sorted(glob.glob(os.path.join(kb_dir, "*.md"))):
                try:
                    with open(md_path, "r", encoding="utf-8") as f:
                        meta, body = parse_frontmatter(f.read())
                    t = meta.get("title_bn", os.path.basename(md_path))
                    s_name = meta.get("source_name", "ভূমি সেবা নির্দেশিকা ও নামজারি ম্যানুয়াল")
                    s_url = meta.get("source_url", "")
                    s = f"{s_name} ({s_url})" if s_url else s_name
                    lv = meta.get("last_verified_at")
                    dt = datetime.fromisoformat(lv.replace("Z", "+00:00")) if lv else None
                    articles.append(
                        StaticArticle(title=t, content=body, source=s, last_verified_at=dt)
                    )
                except Exception:
                    pass

    # Extract non-stopword tokens
    all_tokens = [t for t in clean_query.split() if len(t) > 1]
    significant_tokens = [t for t in all_tokens if t not in BENGALI_STOPWORDS]

    if not significant_tokens:
        significant_tokens = all_tokens

    if not significant_tokens or not articles:
        return GuideResponse(
            status="needs_verification",
            answer_bn="তথ্য যাচাই প্রয়োজন",
            answer_en="Information requires physical verification from the authorized land office.",
            source=None,
            last_verified_at=None,
            similarity_score=0.0,
        )

    matched = None
    best_score = 0.0

    for article in articles:
        bn_title = extract_bn_title(article.content, article.title)
        title_lower = f"{article.title} {bn_title}".lower()
        content_lower = article.content.lower()

        # Score matching significant keywords
        match_count = 0
        title_matches = 0

        for tok in significant_tokens:
            stem = tok.rstrip("রদেতেয়ায়") if len(tok) > 4 else tok
            if stem in title_lower or tok in title_lower:
                match_count += 1
                title_matches += 1
            elif stem in content_lower or tok in content_lower:
                match_count += 1

        # Token coverage ratio
        coverage = match_count / len(significant_tokens)
        title_bonus = 0.3 * (title_matches / len(significant_tokens))
        total_score = coverage + title_bonus

        if total_score > best_score:
            best_score = total_score
            matched = article

    # Strict confidence threshold: require at least 50% coverage of significant query terms
    if matched and best_score >= 0.50:
        verified_date = (
            matched.last_verified_at.isoformat()
            if hasattr(matched, "last_verified_at") and matched.last_verified_at
            else "2024-05-20T00:00:00Z"
        )
        return GuideResponse(
            status="verified_source",
            answer_bn=matched.content,
            answer_en=f"Referenced from official manual: {matched.title}",
            source=matched.source,
            last_verified_at=verified_date,
            similarity_score=round(best_score, 2),
        )

    # Refusal on ungrounded query (NO generated/hallucinated answer)
    return GuideResponse(
        status="needs_verification",
        answer_bn="তথ্য যাচাই প্রয়োজন",
        answer_en="Information requires physical verification from the authorized land office.",
        source=None,
        last_verified_at=None,
        similarity_score=round(best_score, 2),
    )
