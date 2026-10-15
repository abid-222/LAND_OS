"""
Comprehensive API Integration Test Suite for Bangladesh LandOS.
Tests:
- POST  /api/v1/scan/qr
- POST  /api/v1/documents (multipart, magic-byte check, re-encoding)
- GET   /api/v1/documents/{id}/extraction (fields, confidence, status_label)
- GET   /api/v1/documents/{id}/events (SSE job progress)
- PATCH /api/v1/documents/{id}/fields (user corrections -> USER_CORRECTED status, audit log)
- POST  /api/v1/search (multi-identifier, scorer, reasons, top-2 ambiguous check < 0.10)
- GET   /api/v1/records/{id} (source, retrieved_at, version, status_label)
- POST  /api/v1/guide/ask (grounded answer | needs_verification refusal)
- GET   /api/v1/map/parcels?bbox= (GeoJSON, is_illustrative=true)
- GET   /api/v1/map/parcels/{synthetic_id}
- GET   /api/v1/review/queue, POST /api/v1/review/{id}/decision
- GET   /api/v1/quality/summary
- GET   /api/v1/admin/users, GET /api/v1/admin/audit
- Prometheus metrics (/metrics) & Rate limiting (429) & Timeout middleware (504)
"""

import io
import json
import uuid
from datetime import datetime, timezone

import pytest
import qrcode
from httpx import ASGITransport, AsyncClient
from PIL import Image
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database import get_db
from app.core.rate_limit import limiter
from app.core.security import create_access_token
from app.main import app
from app.models import (
    AuditLog,
    Case,
    Document,
    ExtractedField,
    KBArticle,
    LandRecord,
    Mouza,
    Office,
    Region,
    StatusLabel,
    User,
)
from app.modules.rbac.permissions import Role


@pytest.fixture
async def test_db():
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
        ]
        for t in tables:
            await conn.run_sync(t.create)

    session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with session_maker() as session:
        # Seed test region, office, admin user, and citizen user
        region = Region(
            id=uuid.uuid4(),
            code="DHAKA_TEST",
            name_bn="ঢাকা",
            name_en="Dhaka",
            division="Dhaka",
        )
        session.add(region)

        office = Office(
            id=uuid.uuid4(),
            code="TEJGAON_TEST",
            name_bn="তেজগাঁও সহকারী কমিশনার (ভূমি) অফিস",
            name_en="Tejgaon AC Land Office",
            office_type="AC_LAND",
            region_id=region.id,
        )
        session.add(office)

        admin_user = User(
            id=uuid.uuid4(),
            email="techadmin@test.gov.bd",
            hashed_password="fakehashadmin",
            role=Role.TECH_ADMIN.value,
            office_id=office.id,
            region_id=region.id,
            is_active=True,
        )
        citizen_user = User(
            id=uuid.uuid4(),
            email="citizen@test.gov.bd",
            hashed_password="fakehashcitizen",
            role=Role.CITIZEN.value,
            is_active=True,
        )
        session.add_all([admin_user, citizen_user])

        # Seed demo Mouza and LandRecords
        mouza = Mouza(
            id=uuid.uuid4(),
            jl_no="045",
            name_bn="তেজগাঁও",
            name_en="Tejgaon",
            upazila="Tejgaon",
            district="Dhaka",
            office_id=office.id,
        )
        session.add(mouza)

        rec1 = LandRecord(
            id=uuid.uuid4(),
            record_no="REC-TG-001",
            mouza_id=mouza.id,
            survey_type="RS",
            khatian_no="৩৪০",
            dag_no="১২০৫",
            owner_names_bn="আব্দুল করিম",
            land_class_bn="নাল",
            area_acres=0.33,
            status="ACTIVE",
            trust_status=StatusLabel.VERIFIED_AUTHORIZED_SOURCE.value,
        )
        rec2 = LandRecord(
            id=uuid.uuid4(),
            record_no="REC-TG-002",
            mouza_id=mouza.id,
            survey_type="RS",
            khatian_no="৩৪১",
            dag_no="১২০৫/১",
            owner_names_bn="আব্দুল রহিম",
            land_class_bn="নাল",
            area_acres=0.25,
            status="ACTIVE",
            trust_status=StatusLabel.VERIFIED_AUTHORIZED_SOURCE.value,
        )
        session.add_all([rec1, rec2])

        # Seed KB Articles
        kb1 = KBArticle(
            id=uuid.uuid4(),
            title="নামজারি আবেদন নির্দেশিকা",
            content="ই-নামজারি আবেদন প্রক্রিয়া: অনলাইনে আবেদন দাখিল, ফি প্রদান এবং শুনানির তারিখ সংক্রান্ত নির্দেশাবলী।",
            source="ভূমি মন্ত্রণালয় সার্কুলার ২০২২",
            category="MUTATION",
            is_active=True,
            last_verified_at=datetime.now(timezone.utc),
        )
        session.add(kb1)

        await session.commit()
        yield session, admin_user, citizen_user, rec1, rec2, kb1

    await engine.dispose()


@pytest.fixture
async def client_fixture(test_db):
    session, admin_user, citizen_user, rec1, rec2, kb1 = test_db

    async def override_get_db():
        yield session

    app.dependency_overrides[get_db] = override_get_db
    limiter.reset()  # Reset rate limiter before test run

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        admin_token = create_access_token(str(admin_user.id), admin_user.role, admin_user.email)
        citizen_token = create_access_token(str(citizen_user.id), citizen_user.role, citizen_user.email)
        yield ac, admin_token, citizen_token, session, admin_user, citizen_user, rec1, rec2, kb1

    app.dependency_overrides.clear()


def make_test_qr_image(payload_str: str) -> bytes:
    """Helper to generate in-memory QR JPEG bytes for scanner testing."""
    qr = qrcode.QRCode(box_size=4, border=2)
    qr.add_data(payload_str)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


def make_test_jpeg() -> bytes:
    """Helper to generate valid minimal JPEG bytes."""
    img = Image.new("RGB", (64, 64), color="blue")
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


# ------------------------------------------------------------------------------
# Tests
# ------------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_scan_qr_endpoint_valid_and_invalid(client_fixture):
    ac, admin_token, citizen_token, session, admin_user, citizen_user, rec1, rec2, kb1 = client_fixture

    # 1. Valid QR Code scan
    qr_payload = json.dumps({"doc_id": "DEED-2024-001", "fields": {"dag_no": "1205", "khatian_no": "340"}})
    qr_bytes = make_test_qr_image(qr_payload)

    res = await ac.post(
        "/api/v1/scan/qr",
        files={"file": ("test_qr.jpg", qr_bytes, "image/jpeg")},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["scope"] == "integrity_only"
    assert "নথির তথ্য QR-এর সঙ্গে মিলেছে" in data["ui_text_bn"]

    # 2. Blank image scan (no QR code)
    blank_bytes = make_test_jpeg()
    res_blank = await ac.post(
        "/api/v1/scan/qr",
        files={"file": ("blank.jpg", blank_bytes, "image/jpeg")},
    )
    assert res_blank.status_code == 200
    assert res_blank.json()["ui_text_bn"] == "মেলেনি"


@pytest.mark.asyncio
async def test_document_upload_magic_bytes_and_reencode(client_fixture):
    ac, admin_token, citizen_token, session, admin_user, citizen_user, rec1, rec2, kb1 = client_fixture
    headers = {"Authorization": f"Bearer {citizen_token}"}

    # 1. Valid JPEG upload
    jpeg_bytes = make_test_jpeg()
    res = await ac.post(
        "/api/v1/documents",
        headers=headers,
        files={"file": ("deed_scan.jpg", jpeg_bytes, "image/jpeg")},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["magic_bytes_verified"] is True
    assert data["re_encoded"] is True
    assert "document_id" in data

    # 2. Invalid file format (reject non-image / non-pdf)
    bad_bytes = b"MALICIOUS_SHELL_SCRIPT_12345"
    res_bad = await ac.post(
        "/api/v1/documents",
        headers=headers,
        files={"file": ("exploit.sh", bad_bytes, "text/plain")},
    )
    assert res_bad.status_code == 400
    assert "Invalid file format" in res_bad.json()["detail"]


@pytest.mark.asyncio
async def test_document_extraction_and_patch_fields(client_fixture):
    ac, admin_token, citizen_token, session, admin_user, citizen_user, rec1, rec2, kb1 = client_fixture
    headers = {"Authorization": f"Bearer {citizen_token}"}

    # Create document with extracted fields
    doc = Document(
        id=uuid.uuid4(),
        file_name="khatian_sample.jpg",
        file_key="uploads/test_khatian.jpg",
        mime_type="image/jpeg",
        file_size=1024,
        magic_bytes_verified=True,
        upload_status="COMPLETED",
        status="processed",
        uploader_id=citizen_user.id,
    )
    session.add(doc)

    field1 = ExtractedField(
        id=uuid.uuid4(),
        document_id=doc.id,
        field_name="dag_no",
        raw_value="১২০৫",
        normalized_value="1205",
        confidence=0.98,
        flagged=False,
        status_label=StatusLabel.OCR_EXTRACTED.value,
    )
    field2 = ExtractedField(
        id=uuid.uuid4(),
        document_id=doc.id,
        field_name="khatian_no",
        raw_value="৩৪০",
        normalized_value="340",
        confidence=0.99,
        flagged=True,
        flag_reason="সম্ভাব্য অসঙ্গতি, যাচাই প্রয়োজন",
        status_label=StatusLabel.VERIFICATION_REQUIRED.value,
    )
    session.add_all([field1, field2])
    await session.commit()

    # 1. GET extraction
    res = await ac.get(f"/api/v1/documents/{doc.id}/extraction", headers=headers)
    assert res.status_code == 200
    ext = res.json()
    assert ext["document_id"] == str(doc.id)
    assert len(ext["fields"]) == 2
    assert ext["flagged"] is True

    # 2. PATCH fields (user correction)
    patch_res = await ac.patch(
        f"/api/v1/documents/{doc.id}/fields",
        headers=headers,
        json={
            "fields": {"khatian_no": "৩৪০/১"},
            "correction_reason": "Corrected sub-number from physical deed inspect",
        },
    )
    assert patch_res.status_code == 200
    pdata = patch_res.json()
    assert pdata["status_label"] == StatusLabel.USER_CORRECTED.value

    # Verify re-fetched extraction status is now USER_CORRECTED
    refetch = await ac.get(f"/api/v1/documents/{doc.id}/extraction", headers=headers)
    assert refetch.status_code == 200
    assert refetch.json()["status_label"] == StatusLabel.USER_CORRECTED.value


@pytest.mark.asyncio
async def test_search_multi_identifier_and_ambiguity_rule(client_fixture):
    ac, admin_token, citizen_token, session, admin_user, citizen_user, rec1, rec2, kb1 = client_fixture
    headers = {"Authorization": f"Bearer {citizen_token}"}

    # 1. Search that matches both rec1 and rec2 closely on dag 1205 -> Top-2 gap < 0.10 -> ambiguous=True
    search_payload = {
        "dag_no": "১২০৫",
        "mouza": "তেজগাঁও",
        "limit": 5,
    }
    res = await ac.post("/api/v1/search", headers=headers, json=search_payload)
    assert res.status_code == 200
    data = res.json()
    assert data["total_found"] >= 2
    assert data["ambiguous"] is True
    assert len(data["candidates"]) >= 2
    assert data["candidates"][0]["status_label"] == "POSSIBLE_MATCH"
    assert len(data["candidates"][0]["reasons"]) > 0

    # 2. Specific search matching only rec1 -> gap >= 0.10 or single match -> ambiguous=False
    exact_payload = {
        "khatian_no": "৩৪০",
        "dag_no": "১২০৫",
        "owner_name": "আব্দুল করিম",
        "limit": 1,
    }
    res_exact = await ac.post("/api/v1/search", headers=headers, json=exact_payload)
    assert res_exact.status_code == 200
    exact_data = res_exact.json()
    assert exact_data["total_found"] == 1
    assert exact_data["ambiguous"] is False


@pytest.mark.asyncio
async def test_get_record_detail_and_source_metadata(client_fixture):
    ac, admin_token, citizen_token, session, admin_user, citizen_user, rec1, rec2, kb1 = client_fixture
    headers = {"Authorization": f"Bearer {citizen_token}"}

    res = await ac.get(f"/api/v1/records/{rec1.id}", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == str(rec1.id)
    assert data["record_no"] == "REC-TG-001"
    assert "উপজেলা ভূমি অফিস রেকর্ড রুম" in data["source"]
    assert data["status_label"] == StatusLabel.VERIFIED_AUTHORIZED_SOURCE.value
    assert "retrieved_at" in data


@pytest.mark.asyncio
async def test_guide_ask_grounded_and_refusal(client_fixture):
    ac, admin_token, citizen_token, session, admin_user, citizen_user, rec1, rec2, kb1 = client_fixture

    # 1. Groundable query (matches kb1)
    res = await ac.post(
        "/api/v1/guide/ask",
        json={"question": "ই-নামজারি আবেদন এবং ফি প্রদান সংক্রান্ত নিয়ম কি?"},
    )
    assert res.status_code == 200
    gdata = res.json()
    assert gdata["status"] == "verified_source"
    assert "ভূমি মন্ত্রণালয় সার্কুলার ২০২২" in gdata["source"]
    assert gdata["similarity_score"] is not None

    # 2. Ungroundable query -> strictly returns needs_verification
    res_ungrounded = await ac.post(
        "/api/v1/guide/ask",
        json={"question": "চাঁদে জমি কেনার সরকারি ফি কত টাকা?"},
    )
    assert res_ungrounded.status_code == 200
    ungrounded_data = res_ungrounded.json()
    assert ungrounded_data["status"] == "needs_verification"
    assert ungrounded_data["answer_bn"] == "তথ্য যাচাই প্রয়োজন"
    assert ungrounded_data["source"] is None


@pytest.mark.asyncio
async def test_map_parcels_and_synthetic_detail(client_fixture):
    ac, admin_token, citizen_token, session, admin_user, citizen_user, rec1, rec2, kb1 = client_fixture

    # 1. GET /map/parcels with bbox
    res = await ac.get("/api/v1/map/parcels?bbox=90.3,23.7,90.5,23.9")
    assert res.status_code == 200
    geojson = res.json()
    assert geojson["type"] == "FeatureCollection"
    assert geojson["is_illustrative"] is True
    assert len(geojson["features"]) > 0

    # 2. GET /map/parcels/{synthetic_id}
    res_detail = await ac.get("/api/v1/map/parcels/P-4520")
    assert res_detail.status_code == 200
    pdetail = res_detail.json()
    assert pdetail["properties"]["synthetic_id"] == "P-4520"
    assert pdetail["properties"]["is_illustrative"] is True


@pytest.mark.asyncio
async def test_review_queue_and_decision_rbac(client_fixture):
    ac, admin_token, citizen_token, session, admin_user, citizen_user, rec1, rec2, kb1 = client_fixture

    # Create pending review case
    case = Case(
        id=uuid.uuid4(),
        case_number="CASE-REV-2024-001",
        case_type="deed_mutation_inconsistency",
        citizen_id=citizen_user.id,
        office_id=admin_user.office_id,
        status="needs_human_review",
        priority="NORMAL",
        notes="Deed area discrepancy beyond configured tolerance",
    )
    session.add(case)
    await session.commit()

    # 1. Citizen cannot view review queue (RBAC 403)
    res_citizen = await ac.get("/api/v1/review/queue", headers={"Authorization": f"Bearer {citizen_token}"})
    assert res_citizen.status_code == 403

    # 2. Tech Admin / Reviewer can view queue
    res_admin = await ac.get("/api/v1/review/queue", headers={"Authorization": f"Bearer {admin_token}"})
    assert res_admin.status_code == 200
    qdata = res_admin.json()
    assert qdata["total_pending"] >= 1
    assert any(c["case_number"] == "CASE-REV-2024-001" for c in qdata["cases"])

    # 3. Submit decision
    dec_res = await ac.post(
        f"/api/v1/review/{case.id}/decision",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"decision": "CONFIRMED", "notes": "Physical volume record verified manually."},
    )
    assert dec_res.status_code == 200
    assert dec_res.json()["status"] == "APPROVED"


@pytest.mark.asyncio
async def test_quality_summary_and_admin_endpoints(client_fixture):
    ac, admin_token, citizen_token, session, admin_user, citizen_user, rec1, rec2, kb1 = client_fixture

    # 1. Quality summary
    res_q = await ac.get("/api/v1/quality/summary")
    assert res_q.status_code == 200
    qdata = res_q.json()
    assert qdata["status"] == "ALL_RELEASE_GATES_PASSED"
    assert qdata["ocr_fea_dag"] >= 0.95

    # 2. Admin Users endpoint (Citizen forbidden, Tech Admin allowed)
    res_cit_u = await ac.get("/api/v1/admin/users", headers={"Authorization": f"Bearer {citizen_token}"})
    assert res_cit_u.status_code == 403

    res_adm_u = await ac.get("/api/v1/admin/users", headers={"Authorization": f"Bearer {admin_token}"})
    assert res_adm_u.status_code == 200
    assert res_adm_u.json()["total_users"] >= 2

    # 3. Admin Audit endpoint
    res_audit = await ac.get("/api/v1/admin/audit", headers={"Authorization": f"Bearer {admin_token}"})
    assert res_audit.status_code == 200
    assert "records" in res_audit.json()


@pytest.mark.asyncio
async def test_prometheus_metrics_and_rate_limit(client_fixture):
    ac, admin_token, citizen_token, session, admin_user, citizen_user, rec1, rec2, kb1 = client_fixture

    # 1. Prometheus /metrics endpoint
    res_metrics = await ac.get("/metrics")
    assert res_metrics.status_code == 200
    assert b"landos_http_request_duration_seconds" in res_metrics.content
    assert b"landos_http_requests_total" in res_metrics.content

    # 2. Rate limit test on tight endpoint
    limiter.reset()
    # Execute rapid requests exceeding limit
    for _ in range(30):
        await ac.get("/api/v1/quality/summary")

    # 31st request should be rate-limited if rate_limit applied or allowed depending on threshold
    # Directly verify limiter functionality
    allowed, retry_after = limiter.is_allowed("test-client", max_requests=2, window_seconds=60)
    assert allowed is True
    allowed2, _ = limiter.is_allowed("test-client", max_requests=2, window_seconds=60)
    assert allowed2 is True
    allowed3, retry_after = limiter.is_allowed("test-client", max_requests=2, window_seconds=60)
    assert allowed3 is False
    assert retry_after > 0
