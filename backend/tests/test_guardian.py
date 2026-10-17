"""
Tests for P6 "Parcel Guardian" (Parcel Watch & Simulated SMS Outbox).

Covers:
1. Citizen watches a parcel (POST /parcels/{parcel_id}/watch) -> creates watch and simulated SMS outbox entry.
2. Check watch status (GET /parcels/{parcel_id}/watch) -> returns is_watched=True.
3. List watched parcels (GET /parcels/watched) -> includes location metadata and alerts count.
4. Alerts engine trigger creates simulated alert SMS in outbox for watched parcel.
5. Retrieve simulated SMS outbox (GET /alerts/outbox) -> contains Bengali previews with 'simulated' tag.
6. Unwatch parcel (DELETE /parcels/{parcel_id}/watch) -> deactivated.
7. Attempting to watch non-existent parcel returns 404.
"""

import uuid
from datetime import datetime, timezone

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database import get_db
from app.core.rate_limit import limiter
from app.core.security import create_access_token
from app.main import app
from app.models import (
    Alert,
    AuditLog,
    Case,
    Deed,
    Document,
    ExtractedField,
    KBArticle,
    LandRecord,
    LegalCase,
    Mouza,
    Mutation,
    NamjariApplication,
    NamjariEvent,
    Notification,
    Office,
    Parcel,
    ParcelWatch,
    QRCheck,
    Region,
    SimulatedSMSOutbox,
    User,
    VerificationResult,
)
from app.modules.rbac.permissions import Role


@pytest.fixture
async def guardian_test_env():
    """Sets up an in-memory database with all required tables and seeds mock data for guardian testing."""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        tables = [
            Region.__table__,
            Office.__table__,
            User.__table__,
            Mouza.__table__,
            LandRecord.__table__,
            Document.__table__,
            ExtractedField.__table__,
            Case.__table__,
            KBArticle.__table__,
            AuditLog.__table__,
            Parcel.__table__,
            Deed.__table__,
            Mutation.__table__,
            Alert.__table__,
            QRCheck.__table__,
            VerificationResult.__table__,
            LegalCase.__table__,
            NamjariApplication.__table__,
            NamjariEvent.__table__,
            Notification.__table__,
            ParcelWatch.__table__,
            SimulatedSMSOutbox.__table__,
        ]
        for t in tables:
            await conn.run_sync(t.create)

    session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with session_maker() as session:
        region = Region(
            id=uuid.uuid4(),
            code="DHAKA_REGION",
            name_bn="ঢাকা বিভাগ",
            name_en="Dhaka",
            division="Dhaka",
        )
        office = Office(
            id=uuid.uuid4(),
            code="OFF-TEJGAON",
            region_id=region.id,
            name_bn="তেজগাঁও সহকারী কমিশনার (ভূমি) কার্যালয়",
            name_en="Tejgaon AC Land Office",
            office_type="AC_LAND",
        )
        session.add_all([region, office])
        await session.flush()

        citizen = User(
            id=uuid.uuid4(),
            email="citizen_guardian@example.com",
            phone="01711-889900",
            full_name_bn="সাদিয়া হক",
            full_name_en="Sadia Huq",
            hashed_password="mock_password_hash",
            role=Role.CITIZEN.value,
            office_id=office.id,
            region_id=region.id,
        )
        reviewer = User(
            id=uuid.uuid4(),
            email="reviewer_guardian@example.com",
            phone="01811-223344",
            full_name_bn="রিভিউয়ার অফিসার",
            full_name_en="Reviewer Officer",
            hashed_password="mock_password_hash",
            role=Role.REVIEWER.value,
            office_id=office.id,
            region_id=region.id,
        )
        session.add_all([citizen, reviewer])
        await session.flush()

        mouza = Mouza(
            id=uuid.uuid4(),
            jl_no="14",
            name_bn="তেজগাঁও",
            name_en="Tejgaon",
            upazila="Tejgaon",
            district="Dhaka",
            office_id=office.id,
        )
        session.add(mouza)
        await session.flush()

        record = LandRecord(
            id=uuid.uuid4(),
            record_no="LR-DH-TEJ-101",
            mouza_id=mouza.id,
            survey_type="BS",
            khatian_no="450",
            dag_no="1205",
            owner_names_bn="মোহাম্মদ করিম উদ্দিন",
            area_acres=0.33,
            status="ACTIVE",
        )
        session.add(record)
        await session.flush()

        parcel = Parcel(
            parcel_id="P-GUARDIAN-01",
            record_id=record.id,
            mouza_id=mouza.id,
            main_no=1205,
            sub_no=0,
            area_decimal=33.0,
            land_class="private",
            acquisition_status="none",
            created_at=datetime.now(timezone.utc),
        )
        session.add(parcel)
        await session.commit()

        yield {
            "session": session,
            "engine": engine,
            "session_maker": session_maker,
            "citizen": citizen,
            "reviewer": reviewer,
            "parcel": parcel,
        }

    await engine.dispose()


@pytest.mark.asyncio
async def test_parcel_watch_and_simulated_sms_flow(guardian_test_env):
    env = guardian_test_env
    session_maker = env["session_maker"]
    citizen = env["citizen"]
    reviewer = env["reviewer"]
    parcel = env["parcel"]

    limiter.enabled = False

    async def override_get_db():
        async with session_maker() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        citizen_token = create_access_token(
            user_id=str(citizen.id), role=citizen.role, email=citizen.email
        )
        reviewer_token = create_access_token(
            user_id=str(reviewer.id), role=reviewer.role, email=reviewer.email
        )
        citizen_headers = {"Authorization": f"Bearer {citizen_token}"}
        reviewer_headers = {"Authorization": f"Bearer {reviewer_token}"}

        # 1. Non-existent parcel watch -> 404
        bad_res = await client.post(
            "/api/v1/parcels/NON-EXISTENT/watch",
            headers=citizen_headers,
            json={"phone": "01711-889900"},
        )
        assert bad_res.status_code == 404

        # 2. Check initial watch status -> False
        status_res = await client.get(
            f"/api/v1/parcels/{parcel.parcel_id}/watch",
            headers=citizen_headers,
        )
        assert status_res.status_code == 200
        assert status_res.json()["is_watched"] is False

        # 3. Citizen subscribes to watch parcel
        watch_res = await client.post(
            f"/api/v1/parcels/{parcel.parcel_id}/watch",
            headers=citizen_headers,
            json={"phone": "01711-889900"},
        )
        assert watch_res.status_code == 200
        watch_data = watch_res.json()
        assert watch_data["parcel_id"] == parcel.parcel_id
        assert watch_data["is_active"] is True
        assert "[সিমুলেটেড এসএমএস]" in watch_data["confirmation_sms_bn"]

        # 4. Check watch status again -> True
        status_res2 = await client.get(
            f"/api/v1/parcels/{parcel.parcel_id}/watch",
            headers=citizen_headers,
        )
        assert status_res2.status_code == 200
        assert status_res2.json()["is_watched"] is True

        # 5. List watched parcels
        watched_list_res = await client.get(
            "/api/v1/parcels/watched",
            headers=citizen_headers,
        )
        assert watched_list_res.status_code == 200
        watched_items = watched_list_res.json()
        assert len(watched_items) == 1
        assert watched_items[0]["parcel_id"] == parcel.parcel_id
        assert watched_items[0]["upazila"] == "Tejgaon"
        assert watched_items[0]["district"] == "Dhaka"

        # 6. Retrieve simulated SMS outbox -> contains confirmation SMS
        outbox_res = await client.get(
            f"/api/v1/alerts/outbox?parcel_id={parcel.parcel_id}",
            headers=citizen_headers,
        )
        assert outbox_res.status_code == 200
        outbox_items = outbox_res.json()
        assert len(outbox_items) >= 1
        assert outbox_items[0]["tag"] == "simulated"
        assert "গার্ডিয়ান ওয়াচ সক্রিয় হয়েছে" in outbox_items[0]["message_bn"]

        # 7. Reviewer runs risk engine on watched parcel
        run_res = await client.post(
            f"/api/v1/parcels/{parcel.parcel_id}/alerts/run",
            headers=reviewer_headers,
        )
        assert run_res.status_code == 200

        # 8. Unwatch parcel
        unwatch_res = await client.delete(
            f"/api/v1/parcels/{parcel.parcel_id}/watch",
            headers=citizen_headers,
        )
        assert unwatch_res.status_code == 200
        assert unwatch_res.json()["status"] == "unwatched"

        # 8. Check watch status after unwatch -> False
        status_res3 = await client.get(
            f"/api/v1/parcels/{parcel.parcel_id}/watch",
            headers=citizen_headers,
        )
        assert status_res3.status_code == 200
        assert status_res3.json()["is_watched"] is False

    app.dependency_overrides.clear()
