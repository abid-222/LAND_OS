import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database import get_db
from app.main import app


@pytest.fixture
async def test_session():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
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
async def test_ml_extract_entities(client: AsyncClient):
    payload = {
        "raw_text": "বিক্রয় সাফ কবলা দলিল। জেলা: ঢাকা, মৌজা: তেজগাঁও, দাগ নং ১২০৫/১, খতিয়ান নং ৩৪০। জমির পরিমাণ ৩৩ শতাংশ। ক্রেতা: মোঃ রহিম মিয়া, বিক্রেতা: আবদুল করিম।",
        "doc_type_hint": "deed",
        "region_code": "dhaka",
    }
    response = await client.post("/api/v1/ml/extract", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "সাফ-কবলা" in data["document_type_detected"]
    assert len(data["dag_identifiers"]) > 0
    assert data["dag_identifiers"][0]["canonical"] == "1205/1"
    assert data["mouza"]["normalized_name"] == "তেজগাঁও"
    assert data["area"]["area_decimal"] == 33.0
    assert len(data["parties"]) >= 1


@pytest.mark.asyncio
async def test_ml_simulate_conflict_r3_r4(client: AsyncClient):
    payload = {
        "deed_date": "2024-05-15",
        "mutation_date": "2023-01-10",  # mutation predates deed! -> R3
        "deed_area_decimal": 50.0,
        "record_area_decimal": 33.0,  # oversale by 17 decimal -> R4
        "seller_name": "আব্দুল কাদের",
        "record_owner_name": "মোঃ সামসুল হক",  # completely different party -> R6
        "prior_sold_area_decimal": 0.0,
    }
    response = await client.post("/api/v1/ml/simulate-conflict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["conflict_detected"] is True
    assert data["risk_score"] >= 60.0
    assert data["risk_level"] == "CRITICAL"
    rule_codes = [a["rule_code"] for a in data["alerts"]]
    assert "R3" in rule_codes
    assert "R4" in rule_codes
    assert "R6" in rule_codes


@pytest.mark.asyncio
async def test_ml_simulate_conflict_clean(client: AsyncClient):
    payload = {
        "deed_date": "2022-01-15",
        "mutation_date": "2023-06-10",
        "deed_area_decimal": 20.0,
        "record_area_decimal": 33.0,
        "seller_name": "আব্দুল করিম",
        "record_owner_name": "আব্দুল করিম",
        "prior_sold_area_decimal": 0.0,
    }
    response = await client.post("/api/v1/ml/simulate-conflict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["conflict_detected"] is False
    assert data["risk_score"] == 0.0
    assert data["risk_level"] == "LOW"
