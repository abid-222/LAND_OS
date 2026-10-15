"""
Acceptance Criteria Verification Tests for Bangla Land Service Guide (Feature 7).
Criteria:
- Sample question "নামজারির জন্য কী কী কাগজ লাগতে পারে?" returns approved article with source and last verified date.
- Unknown question returns "তথ্য যাচাই প্রয়োজন" with NO generated answer.
"""

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database import get_db
from app.main import app
from app.models import AuditLog, KBArticle, User


@pytest.fixture
async def test_session():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(User.__table__.create)
        await conn.run_sync(AuditLog.__table__.create)
        await conn.run_sync(KBArticle.__table__.create)

    session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with session_maker() as session:
        yield session

    await engine.dispose()


@pytest.fixture
async def client(test_session: AsyncSession):
    async def override_get_db():
        yield test_session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_sample_namjari_question_returns_approved_article(client: AsyncClient):
    """
    Sample question "নামজারির জন্য কী কী কাগজ লাগতে পারে?" must return the approved article,
    with source and last verified date.
    """
    res = await client.post(
        "/api/v1/guide/ask",
        json={"question": "নামজারির জন্য কী কী কাগজ লাগতে পারে?"},
    )
    assert res.status_code == 200, res.text
    data = res.json()

    # Must be verified source
    assert data["status"] == "verified_source"
    assert "পাসপোর্ট সাইজ ছবি ও জাতীয় পরিচয়পত্র" in data["answer_bn"]
    assert "সার্টিফাইড কপি" in data["answer_bn"]
    assert data["source"] is not None
    assert len(data["source"]) > 0
    assert data["last_verified_at"] is not None


@pytest.mark.asyncio
async def test_unknown_question_refuses_hallucination(client: AsyncClient):
    """
    An unknown/ungrounded question must return 'তথ্য যাচাই প্রয়োজন'
    with NO generated/hallucinated text and source as None.
    """
    res = await client.post(
        "/api/v1/guide/ask",
        json={"question": "চাঁদে জমি কেনার সরকারি নিয়ম ও প্লট বুকিং ফি কত?"},
    )
    assert res.status_code == 200, res.text
    data = res.json()

    assert data["status"] == "needs_verification"
    assert data["answer_bn"] == "তথ্য যাচাই প্রয়োজন"
    assert data["source"] is None
    assert data["last_verified_at"] is None
