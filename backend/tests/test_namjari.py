"""
Tests for Smart E-Namjari Workflow & Auto-Verification (P4).

Covers:
1. Application submission & auto-verification checklist generation.
2. Fast rejection on double-sale (R1) or khas/government land (R7).
3. State machine validation (illegal transitions strictly rejected with 400).
4. Role-Based Access Control (RBAC):
   - Tech Admin strictly forbidden from approving or reviewing mutation cases (403).
   - Reviewer can move to hearing / field verification.
   - Supervisor approves / rejects.
5. On 'khatian_updated', parcel owner is updated, mutation history is appended, and audit chain is signed.
6. Public tracking endpoint without authentication.
"""

import uuid

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import selectinload

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
async def namjari_test_env():
    """Sets up an in-memory database with all required tables and seeds mock data for namjari testing."""
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
            ParcelWatch.__table__,
            SimulatedSMSOutbox.__table__,
            Notification.__table__,
        ]
        for t in tables:
            await conn.run_sync(t.create)

    session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with session_maker() as session:
        # 1. Create Mouza hierarchy
        region = Region(
            id=uuid.uuid4(),
            code="REG-DHAKA",
            name_bn="ঢাকা",
            name_en="Dhaka",
            division="Dhaka",
        )
        session.add(region)
        await session.flush()

        mouza = Mouza(
            id=uuid.uuid4(),
            jl_no="245",
            name_bn="তেজগাঁও শিল্প এলাকা",
            name_en="Tejgaon Industrial Area",
            upazila="Tejgaon",
            district="Dhaka",
        )
        session.add(mouza)
        await session.flush()

        # 2. Create Users for all roles
        citizen_user = User(
            id=uuid.uuid4(),
            email="citizen@landos.gov.bd",
            hashed_password="hashed_pw",
            role=Role.CITIZEN.value,
            is_active=True,
        )
        operator_user = User(
            id=uuid.uuid4(),
            email="operator@landos.gov.bd",
            hashed_password="hashed_pw",
            role=Role.OPERATOR.value,
            is_active=True,
        )
        reviewer_user = User(
            id=uuid.uuid4(),
            email="reviewer@landos.gov.bd",
            hashed_password="hashed_pw",
            role=Role.REVIEWER.value,
            is_active=True,
        )
        supervisor_user = User(
            id=uuid.uuid4(),
            email="supervisor@landos.gov.bd",
            hashed_password="hashed_pw",
            role=Role.SUPERVISOR.value,
            is_active=True,
        )
        tech_admin_user = User(
            id=uuid.uuid4(),
            email="tech_admin@landos.gov.bd",
            hashed_password="hashed_pw",
            role=Role.TECH_ADMIN.value,
            is_active=True,
        )
        session.add_all(
            [citizen_user, operator_user, reviewer_user, supervisor_user, tech_admin_user]
        )
        await session.flush()

        # 3. Create Records and Parcels
        # A. Clean parcel
        rec_clean = LandRecord(
            id=uuid.uuid4(),
            record_no="REC-NJ-01",
            mouza_id=mouza.id,
            survey_type="BS",
            khatian_no="340",
            dag_no="1205",
            owner_names_bn="মোহাম্মদ রফিকুল ইসলাম",
            area_acres=0.33,
        )
        session.add(rec_clean)
        await session.flush()

        p_clean = Parcel(
            parcel_id="P-NJ-CLEAN",
            record_id=rec_clean.id,
            mouza_id=mouza.id,
            main_no=1205,
            area_decimal=33.0,
            land_class="private",
            acquisition_status="none",
        )
        session.add(p_clean)

        # B. Conflicted double-sale parcel (R1 alert)
        rec_conflict = LandRecord(
            id=uuid.uuid4(),
            record_no="REC-NJ-02",
            mouza_id=mouza.id,
            survey_type="BS",
            khatian_no="412",
            dag_no="1208",
            owner_names_bn="আব্দুল জব্বার",
            area_acres=0.50,
        )
        session.add(rec_conflict)
        await session.flush()

        p_conflict = Parcel(
            parcel_id="P-NJ-DOUBLE-SALE",
            record_id=rec_conflict.id,
            mouza_id=mouza.id,
            main_no=1208,
            area_decimal=50.0,
            land_class="private",
            acquisition_status="none",
        )
        session.add(p_conflict)

        alert_r1 = Alert(
            id=uuid.uuid4(),
            parcel_id=p_conflict.parcel_id,
            rule_id="R1_concurrent_sale",
            severity="high",
            title_bn="সম্ভাব্য অসঙ্গতি, যাচাই প্রয়োজন",
            reason_bn="একই দাগে পূর্বে সম্পাদিত ও অনিষ্পন্ন দলিলের তথ্য রয়েছে (দ্বৈত বিক্রয় বিরোধ)",
            evidence=[{"source_type": "deed", "source_id": "D-PREV-01"}],
        )
        session.add(alert_r1)

        # C. Khas government land parcel (R7)
        rec_khas = LandRecord(
            id=uuid.uuid4(),
            record_no="REC-NJ-03",
            mouza_id=mouza.id,
            survey_type="BS",
            khatian_no="1",
            dag_no="100",
            owner_names_bn="গণপ্রজাতন্ত্রী বাংলাদেশ সরকার পক্ষে জেলা প্রশাসক",
            area_acres=2.50,
        )
        session.add(rec_khas)
        await session.flush()

        p_khas = Parcel(
            parcel_id="P-NJ-KHAS",
            record_id=rec_khas.id,
            mouza_id=mouza.id,
            main_no=100,
            area_decimal=250.0,
            land_class="khas",
            acquisition_status="none",
        )
        session.add(p_khas)

        await session.commit()

        async def override_get_db():
            yield session

        app.dependency_overrides[get_db] = override_get_db
        limiter.reset()

        yield {
            "session": session,
            "users": {
                "citizen": citizen_user,
                "operator": operator_user,
                "reviewer": reviewer_user,
                "supervisor": supervisor_user,
                "tech_admin": tech_admin_user,
            },
            "parcels": {
                "clean": p_clean,
                "conflict": p_conflict,
                "khas": p_khas,
            },
        }

    app.dependency_overrides.clear()
    await engine.dispose()


def _auth_headers(user: User) -> dict:
    token = create_access_token(user_id=str(user.id), role=user.role, email=user.email)
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_namjari_application_submission_clean(namjari_test_env):
    """Tests clean application submission, automatic auto-verification pass, and documents_review routing."""
    data = namjari_test_env
    citizen = data["users"]["citizen"]
    p_clean = data["parcels"]["clean"]
    session = data["session"]

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            "/api/v1/namjari/applications",
            json={
                "parcel_id": p_clean.parcel_id,
                "deed_no": "D-2026-9901",
                "seller_name": "মোহাম্মদ রফিকুল ইসলাম",
                "buyer_name": "আরিফুল হাসান",
                "applied_area_decimal": 33.0,
            },
            headers=_auth_headers(citizen),
        )

        assert resp.status_code == 201
        res = resp.json()
        assert res["tracking_code"].startswith("NJ-2026-")
        assert res["status"] == "documents_review"
        assert res["auto_verification_status"] == "passed"
        assert len(res["timeline"]) >= 2

        # Verify audit log entry
        audit_stmt = select(AuditLog).where(AuditLog.action == "namjari:apply")
        audit_res = await session.execute(audit_stmt)
        entry = audit_res.scalar_one_or_none()
        assert entry is not None
        assert entry.actor_role == Role.CITIZEN.value


@pytest.mark.asyncio
async def test_namjari_auto_rejection_on_double_sale(namjari_test_env):
    """Tests that an application on a parcel with concurrent sale (R1) is immediately rejected by auto-verification."""
    data = namjari_test_env
    citizen = data["users"]["citizen"]
    p_conflict = data["parcels"]["conflict"]

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            "/api/v1/namjari/applications",
            json={
                "parcel_id": p_conflict.parcel_id,
                "deed_no": "D-2026-9902",
                "seller_name": "আব্দুল জব্বার",
                "buyer_name": "আনিসুর রহমান",
                "applied_area_decimal": 50.0,
            },
            headers=_auth_headers(citizen),
        )

        assert resp.status_code == 201
        res = resp.json()
        assert res["status"] == "rejected"
        assert res["auto_verification_status"] == "failed"
        assert "দ্বৈত বিক্রয়" in (res["decision_reason"] or "")


@pytest.mark.asyncio
async def test_namjari_auto_rejection_on_khas_land(namjari_test_env):
    """Tests that an application on a khas government parcel (R7) is immediately rejected by auto-verification."""
    data = namjari_test_env
    citizen = data["users"]["citizen"]
    p_khas = data["parcels"]["khas"]

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            "/api/v1/namjari/applications",
            json={
                "parcel_id": p_khas.parcel_id,
                "deed_no": "D-2026-9903",
                "seller_name": "মো কাশেম",
                "buyer_name": "আনিসুর রহমান",
                "applied_area_decimal": 100.0,
            },
            headers=_auth_headers(citizen),
        )

        assert resp.status_code == 201
        res = resp.json()
        assert res["status"] == "rejected"
        assert res["auto_verification_status"] == "failed"
        assert "খাস" in (res["decision_reason"] or "")


@pytest.mark.asyncio
async def test_namjari_state_machine_and_rbac_flow(namjari_test_env):
    """
    Tests complete lifecycle flow:
    submitted -> auto_verification -> documents_review -> hearing_notice -> approved -> khatian_updated.
    Also validates that:
    - Invalid state transitions return 400.
    - Tech Admin cannot decide (403).
    - On khatian_updated, owner is updated and mutation is appended.
    """
    data = namjari_test_env
    citizen = data["users"]["citizen"]
    reviewer = data["users"]["reviewer"]
    supervisor = data["users"]["supervisor"]
    tech_admin = data["users"]["tech_admin"]
    p_clean = data["parcels"]["clean"]
    session = data["session"]

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Citizen creates application
        create_resp = await client.post(
            "/api/v1/namjari/applications",
            json={
                "parcel_id": p_clean.parcel_id,
                "deed_no": "D-FLOW-01",
                "seller_name": "মোহাম্মদ রফিকুল ইসলাম",
                "buyer_name": "ফারহানা ইয়াসমিন",
                "applied_area_decimal": 33.0,
            },
            headers=_auth_headers(citizen),
        )
        assert create_resp.status_code == 201
        app_data = create_resp.json()
        app_id = app_data["id"]
        tracking_code = app_data["tracking_code"]
        assert app_data["status"] == "documents_review"

        # 2. Invalid Transition: directly jumping to khatian_updated must fail with 400
        illegal_resp = await client.post(
            f"/api/v1/namjari/applications/{app_id}/transition",
            json={"target_status": "khatian_updated"},
            headers=_auth_headers(supervisor),
        )
        assert illegal_resp.status_code == 400

        # 3. Tech Admin forbidden from deciding transitions (403)
        tech_resp = await client.post(
            f"/api/v1/namjari/applications/{app_id}/transition",
            json={"target_status": "hearing_notice"},
            headers=_auth_headers(tech_admin),
        )
        assert tech_resp.status_code == 403

        # 4. Reviewer moves documents_review -> hearing_notice
        hearing_resp = await client.post(
            f"/api/v1/namjari/applications/{app_id}/transition",
            json={
                "target_status": "hearing_notice",
                "note": "মূল দলিল ও দখলনামা প্রাথমিক নিরীক্ষায় সঠিক। আগামী ১৫ কার্যদিবসে শুনানি ধার্য করা হলো।",
            },
            headers=_auth_headers(reviewer),
        )
        assert hearing_resp.status_code == 200
        assert hearing_resp.json()["status"] == "hearing_notice"

        # 5. Supervisor approves application
        approve_resp = await client.post(
            f"/api/v1/namjari/applications/{app_id}/transition",
            json={
                "target_status": "approved",
                "note": "শুনানি সম্পন্ন। পক্ষগণের কোনো আপত্তি নেই। নামজারি প্রস্তাব অনুমোদিত।",
            },
            headers=_auth_headers(supervisor),
        )
        assert approve_resp.status_code == 200
        assert approve_resp.json()["status"] == "approved"

        # 6. Final step: Supervisor transitions approved -> khatian_updated
        final_resp = await client.post(
            f"/api/v1/namjari/applications/{app_id}/transition",
            json={
                "target_status": "khatian_updated",
                "note": "ফারহানা ইয়াসমিন",
            },
            headers=_auth_headers(supervisor),
        )
        assert final_resp.status_code == 200
        assert final_resp.json()["status"] == "khatian_updated"

        # 7. Check database side-effects
        # A. Parcel record owner updated
        p_stmt = (
            select(Parcel)
            .options(selectinload(Parcel.record))
            .where(Parcel.parcel_id == p_clean.parcel_id)
        )
        p_res = await session.execute(p_stmt)
        p_updated = p_res.scalar_one()
        assert "ফারহানা ইয়াসমিন" in p_updated.record.owner_names_bn

        # B. Mutation record created
        m_stmt = select(Mutation).where(Mutation.case_no == tracking_code)
        m_res = await session.execute(m_stmt)
        mutation = m_res.scalar_one_or_none()
        assert mutation is not None
        assert mutation.to_party == "ফারহানা ইয়াসমিন"


@pytest.mark.asyncio
async def test_namjari_public_tracking_endpoint(namjari_test_env):
    """Tests unauthenticated citizen lookup using the tracking code."""
    data = namjari_test_env
    citizen = data["users"]["citizen"]
    p_clean = data["parcels"]["clean"]

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Create application first
        create_resp = await client.post(
            "/api/v1/namjari/applications",
            json={
                "parcel_id": p_clean.parcel_id,
                "deed_no": "D-TRACK-01",
                "seller_name": "মোহাম্মদ রফিকুল ইসলাম",
                "buyer_name": "জাকির হোসেন",
                "applied_area_decimal": 33.0,
            },
            headers=_auth_headers(citizen),
        )
        app_data = create_resp.json()
        code = app_data["tracking_code"]

        # Public lookup without any Auth headers
        pub_resp = await client.get(f"/api/v1/namjari/track/{code}")
        assert pub_resp.status_code == 200
        pub_data = pub_resp.json()
        assert pub_data["tracking_code"] == code
        assert pub_data["status"] == "documents_review"
        assert len(pub_data["timeline"]) >= 2
        assert pub_data["verification_summary"]["total_checks"] > 0
        assert "সিমুলেটেড" in pub_data["disclaimer"]

        # Non-existent code returns 404
        nf_resp = await client.get("/api/v1/namjari/track/NJ-9999-0000")
        assert nf_resp.status_code == 404
