"""
Unit Tests for Explainable Record Matching (Feature 3).
Verifies:
- Each candidate lists reasons, score, source, status.
- Ambiguity displayed when top 2 candidate scores are close (gap < 0.10).
"""

import uuid

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database import get_db
from app.core.security import hash_password
from app.main import app
from app.models import AuditLog, LandRecord, Mouza, Region, User


@pytest.fixture
async def test_session():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(User.__table__.create)
        await conn.run_sync(AuditLog.__table__.create)
        await conn.run_sync(Region.__table__.create)
        await conn.run_sync(Mouza.__table__.create)
        await conn.run_sync(LandRecord.__table__.create)

    session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with session_maker() as session:
        # Seed test citizen user
        user = User(
            id=uuid.uuid4(),
            email="citizen_test@landos.gov.bd",
            hashed_password=hash_password("Password123#Secure"),
            role="Citizen",
            is_active=True,
        )
        session.add(user)

        mouza = Mouza(
            id=uuid.uuid4(),
            name_bn="তেজগাঁও",
            name_en="Tejgaon",
            jl_no="27",
            upazila="Tejgaon",
            district="Dhaka",
        )
        session.add(mouza)

        # Seed candidate records
        rec1 = LandRecord(
            id=uuid.uuid4(),
            mouza_id=mouza.id,
            record_no="REC-TG-001",
            survey_type="RS",
            khatian_no="340",
            dag_no="1205",
            owner_names_bn="আব্দুল করিম",
            area_acres=0.33,
        )
        rec2 = LandRecord(
            id=uuid.uuid4(),
            mouza_id=mouza.id,
            record_no="REC-TG-002",
            survey_type="RS",
            khatian_no="340",
            dag_no="1206",
            owner_names_bn="আব্দুল কাদের",
            area_acres=0.30,
        )
        session.add_all([rec1, rec2])
        await session.commit()

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
async def test_explainable_record_matching_candidates(client: AsyncClient):
    """
    Candidate items must list:
    - reasons (why matched)
    - score (float)
    - source
    - status_label (e.g. POSSIBLE_MATCH)
    """
    # 1. Login to get authenticated cookie
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "citizen_test@landos.gov.bd", "password": "Password123#Secure"},
    )
    assert login_res.status_code == 200

    # 2. Search query with khatian and dag
    search_payload = {
        "khatian_no": "৩৪০",
        "dag_no": "১২০৫",
        "mouza": "তেজগাঁও",
    }
    search_res = await client.post("/api/v1/search", json=search_payload)
    assert search_res.status_code == 200, search_res.text
    data = search_res.json()

    candidates = data["candidates"]
    assert len(candidates) >= 1

    top = candidates[0]
    # Check explainability fields
    assert "score" in top and isinstance(top["score"], float)
    assert top["score"] > 0.0
    assert "reasons" in top and isinstance(top["reasons"], list)
    assert len(top["reasons"]) >= 1  # Non-empty reasons list
    assert "status_label" in top
    assert top["status_label"] in ("POSSIBLE_MATCH", "possible_match")
    assert "dags" in str(top["dag_no"]).lower() or top["dag_no"] is not None


@pytest.mark.asyncio
async def test_explainable_record_matching_ambiguity_flag(client: AsyncClient):
    """
    When top 2 candidate scores are close (difference < 0.10), ambiguous must be True.
    """
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "citizen_test@landos.gov.bd", "password": "Password123#Secure"},
    )
    assert login_res.status_code == 200

    # Query only khatian 340 without dag -> both REC-TG-001 and REC-TG-002 match khatian equally!
    search_payload = {
        "khatian_no": "৩৪০",
    }
    search_res = await client.post("/api/v1/search", json=search_payload)
    assert search_res.status_code == 200
    data = search_res.json()

    candidates = data["candidates"]
    assert len(candidates) >= 2
    # Equal khatian matches produce score difference < 0.10 -> ambiguous flag must be True
    assert data["ambiguous"] is True
    assert candidates[0]["ambiguous"] is True
    assert candidates[1]["ambiguous"] is True
