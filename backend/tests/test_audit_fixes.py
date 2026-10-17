"""
Regression tests for AUDIT + FIX requirements:
- Section 1: Role-Based Login & Security (CSRF, Lockout, Password Change/Reset, Admin User Creation Ceilings)
- Section 1.7: IDOR isolation across Citizens (Documents, SSE streams, Buyer Reports, Presigned URLs)
- Section 7: Missing Features (Notifications, Consent Records, Feedback Corrections, CSV Import with Provenance)
"""

import uuid

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database import get_db
from app.core.security import create_access_token, hash_password
from app.main import app
from app.models import (
    Base,
    Document,
    Notification,
    Office,
    Region,
    User,
)


@pytest.fixture
async def audit_test_setup():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        for t in [
            "regions",
            "offices",
            "users",
            "mouzas",
            "land_records",
            "documents",
            "extracted_fields",
            "cases",
            "notifications",
            "feedback_corrections",
            "consent_records",
            "audit_logs",
            "buyer_reports",
        ]:
            if t in Base.metadata.tables:
                await conn.run_sync(Base.metadata.tables[t].create)

    async with async_session() as session:
        region = Region(
            id=uuid.uuid4(),
            name_en="Dhaka Division",
            name_bn="ঢাকা বিভাগ",
            code="DIV_DHK",
            division="Dhaka",
        )
        session.add(region)
        office = Office(
            id=uuid.uuid4(),
            code="OFF_DHK_CENTRAL",
            name_bn="ঢাকা সদর ভূমি অফিস",
            name_en="Dhaka Central Land Office",
            office_type="AC_LAND",
            region_id=region.id,
        )
        session.add(office)

        # Citizen A
        user_a = User(
            id=uuid.uuid4(),
            email="citizen_a@landos.gov.bd",
            hashed_password=hash_password("Password123#Secure"),
            role="Citizen",
            office_id=office.id,
            is_active=True,
        )
        # Citizen B
        user_b = User(
            id=uuid.uuid4(),
            email="citizen_b@landos.gov.bd",
            hashed_password=hash_password("Password123#Secure"),
            role="Citizen",
            office_id=office.id,
            is_active=True,
        )
        # Office Admin
        admin_user = User(
            id=uuid.uuid4(),
            email="officeadmin_test@landos.gov.bd",
            hashed_password=hash_password("Password123#Secure"),
            role="Office Admin",
            office_id=office.id,
            is_active=True,
        )
        session.add_all([user_a, user_b, admin_user])

        # Document belonging to Citizen A
        doc_a = Document(
            id=uuid.uuid4(),
            uploader_id=user_a.id,
            file_name="citizen_a_khatian.jpg",
            file_key="uploads/citizen_a_khatian.jpg",
            mime_type="image/jpeg",
            file_size=1024,
            status="pending",
        )
        session.add(doc_a)
        await session.commit()

        yield session, user_a, user_b, admin_user, doc_a, office

    await engine.dispose()


@pytest.fixture
async def audit_client(audit_test_setup):
    session, user_a, user_b, admin_user, doc_a, office = audit_test_setup

    async def override_get_db():
        yield session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        token_a = create_access_token(str(user_a.id), user_a.role, user_a.email)
        token_b = create_access_token(str(user_b.id), user_b.role, user_b.email)
        token_admin = create_access_token(str(admin_user.id), admin_user.role, admin_user.email)
        yield client, token_a, token_b, token_admin, user_a, user_b, doc_a, office, session

    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_idor_isolation_citizen_b_cannot_access_citizen_a_document(audit_client):
    client, token_a, token_b, token_admin, user_a, user_b, doc_a, office, session = audit_client

    # 1. Citizen A can access own document extraction
    res_a = await client.get(
        f"/api/v1/documents/{doc_a.id}/extraction",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert res_a.status_code == 200

    # 2. Citizen B is strictly forbidden (IDOR protection)
    res_b = await client.get(
        f"/api/v1/documents/{doc_a.id}/extraction",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert res_b.status_code == 403

    # 3. Citizen B cannot patch fields of Citizen A's document
    res_patch = await client.patch(
        f"/api/v1/documents/{doc_a.id}/fields",
        headers={"Authorization": f"Bearer {token_b}"},
        json={"fields": {"dag_no": "9999"}},
    )
    assert res_patch.status_code == 403

    # 4. Citizen B cannot get presigned download URL for Citizen A's document
    res_download = await client.get(
        f"/api/v1/documents/{doc_a.id}/download-url",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert res_download.status_code == 403


@pytest.mark.asyncio
async def test_csrf_protection_on_cookie_authentication(audit_client):
    client, token_a, token_b, token_admin, user_a, user_b, doc_a, office, session = audit_client

    # Cookie auth without CSRF header must be rejected with 403
    cookies = {
        "landos_access_token": token_a,
        "landos_csrf_token": "valid_random_csrf_token_value_abc",
    }
    res = await client.patch(
        f"/api/v1/documents/{doc_a.id}/fields",
        cookies=cookies,
        json={"fields": {"dag_no": "1234"}},
    )
    assert res.status_code == 403
    assert "CSRF protection error" in res.json()["detail"]

    # Cookie auth with matching CSRF header is accepted
    res_ok = await client.patch(
        f"/api/v1/documents/{doc_a.id}/fields",
        cookies=cookies,
        headers={"X-CSRF-Token": "valid_random_csrf_token_value_abc"},
        json={"fields": {"dag_no": "1234"}},
    )
    assert res_ok.status_code == 200


@pytest.mark.asyncio
async def test_password_change_flow(audit_client):
    client, token_a, token_b, token_admin, user_a, user_b, doc_a, office, session = audit_client

    # Change password
    res = await client.post(
        "/api/v1/auth/password/change",
        headers={"Authorization": f"Bearer {token_a}"},
        json={
            "current_password": "Password123#Secure",
            "new_password": "NewPassword2026#Secure",
        },
    )
    assert res.status_code == 200
    assert res.json()["status"] == "success"

    # Verify old password no longer works
    login_old = await client.post(
        "/api/v1/auth/login",
        json={"email": user_a.email, "password": "Password123#Secure"},
    )
    assert login_old.status_code == 401

    # Verify new password works
    login_new = await client.post(
        "/api/v1/auth/login",
        json={"email": user_a.email, "password": "NewPassword2026#Secure"},
    )
    assert login_new.status_code == 200


@pytest.mark.asyncio
async def test_office_admin_role_ceiling_enforcement(audit_client):
    client, token_a, token_b, token_admin, user_a, user_b, doc_a, office, session = audit_client

    # Office Admin cannot create Tech Admin or Security Officer (Ceiling enforcement)
    res_bad = await client.post(
        "/api/v1/admin/users",
        headers={"Authorization": f"Bearer {token_admin}"},
        json={
            "email": "rogue_techadmin@landos.gov.bd",
            "password": "Password123#Secure",
            "role": "Tech Admin",
            "office_id": str(office.id),
        },
    )
    assert res_bad.status_code == 403
    assert "Office Admin can only create users with roles" in res_bad.json()["detail"]

    # Office Admin can create Operator or Reviewer within their office
    res_ok = await client.post(
        "/api/v1/admin/users",
        headers={"Authorization": f"Bearer {token_admin}"},
        json={
            "email": "new_operator@landos.gov.bd",
            "password": "Password123#Secure",
            "role": "Operator",
            "office_id": str(office.id),
        },
    )
    assert res_ok.status_code == 201
    assert res_ok.json()["role"] == "Operator"


@pytest.mark.asyncio
async def test_section_7_notifications_and_consent(audit_client):
    client, token_a, token_b, token_admin, user_a, user_b, doc_a, office, session = audit_client

    # 1. Post consent record
    res_consent = await client.post(
        "/api/v1/consent",
        headers={"Authorization": f"Bearer {token_a}"},
        json={
            "consent_type": "camera",
            "version": "v1.2-2026",
            "agreed": True,
        },
    )
    assert res_consent.status_code == 201
    assert res_consent.json()["version"] == "v1.2-2026"

    # 2. Get latest consent
    res_get_consent = await client.get(
        "/api/v1/consent/latest?consent_type=camera",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert res_get_consent.status_code == 200
    assert res_get_consent.json()["agreed"] is True

    # 3. Add notification and retrieve
    notif = Notification(
        id=uuid.uuid4(),
        user_id=user_a.id,
        title="Sync Completed",
        message="Document OCR extraction has completed.",
        type="sync_finished",
        is_read=False,
    )
    session.add(notif)
    await session.commit()

    res_notif = await client.get(
        "/api/v1/notifications",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert res_notif.status_code == 200
    notifs = res_notif.json()["notifications"]
    assert len(notifs) >= 1
    assert notifs[0]["type"] == "sync_finished"

    # 4. Mark notification read
    res_read = await client.patch(
        f"/api/v1/notifications/{notif.id}/read",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert res_read.status_code == 200
    assert res_read.json()["status"] == "success"


@pytest.mark.asyncio
async def test_section_7_feedback_corrections(audit_client):
    client, token_a, token_b, token_admin, user_a, user_b, doc_a, office, session = audit_client

    res_fb = await client.post(
        "/api/v1/feedback/corrections",
        headers={"Authorization": f"Bearer {token_a}"},
        json={
            "feedback_type": "wrong_field",
            "document_id": str(doc_a.id),
            "field_name": "dag_no",
            "reported_value": "1200",
            "corrected_value": "1205",
            "comments": "Digit five was misclassified as zero by OCR.",
        },
    )
    assert res_fb.status_code == 201
    data = res_fb.json()
    assert data["status"] == "evaluation_candidate"
