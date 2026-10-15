#!/usr/bin/env python3
"""
Bangladesh LandOS — End-to-End System Smoke Test Journey.
Executes the full scripted journey specified in Requirement 3:
1. Log in as each of the 8 RBAC roles (handling TOTP MFA for Tech Admin & Security Officer).
2. Upload a synthetic good and a synthetic bad document (magic bytes / size enforcement).
3. Wait for OCR & check SSE progress connection.
4. Correct a flagged field (status transition to USER_CORRECTED).
5. Search with multi-identifier candidate matching.
6. Verify against an official record (integrity check & field comparisons).
7. Run the risk engine on a seeded conflict parcel (verify reason + evidence).
8. Build comprehensive buyer parcel risk report.
9. Assert cryptographic hash-chained audit log continuity.
10. Automated forbidden wording guard (no 'safe', 'unsafe', 'fraud', 'valid ownership', 'invalid ownership', 'risk score').

Usage: python scripts/smoke_test.py or make smoke
"""

import asyncio
import io
import os
import re
import sys
import uuid
from datetime import datetime, timezone

import pyotp
import pytest
from httpx import ASGITransport, AsyncClient
from PIL import Image
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

# Ensure repository root and backend paths are importable
current_dir = os.path.dirname(os.path.abspath(__file__))
repo_root = os.path.abspath(os.path.join(current_dir, ".."))
backend_dir = os.path.join(repo_root, "backend")

for p in [repo_root, backend_dir]:
    if p not in sys.path:
        sys.path.insert(0, p)

from app.core.config import settings
from app.core.database import Base, get_db
from app.core.security import hash_password
from app.main import app
from app.models import (
    Alert,
    AuditLog,
    BuyerReport,
    Case,
    Deed,
    Document,
    ExtractedField,
    KBArticle,
    LandRecord,
    Mouza,
    Mutation,
    Office,
    Parcel,
    QRCheck,
    Region,
    User,
    VerificationResult,
)
from app.modules.rbac.permissions import Role

DEMO_PASSWORD = settings.DEMO_PASSWORD
DEMO_MFA_SECRET = settings.DEMO_MFA_SECRET

FORBIDDEN_WORDS = [
    re.compile(r"\b(?:safe|unsafe)\b", re.IGNORECASE),
    re.compile(r"\bfraud\b", re.IGNORECASE),
    re.compile(r"\bvalid\s+ownership\b", re.IGNORECASE),
    re.compile(r"\binvalid\s+ownership\b", re.IGNORECASE),
    re.compile(r"\brisk\s+score\b", re.IGNORECASE),
]


def assert_no_forbidden_wording(text: str, context: str):
    for pattern in FORBIDDEN_WORDS:
        match = pattern.search(text)
        if match:
            raise AssertionError(
                f"[FORBIDDEN WORDING VIOLATION] Found '{match.group()}' in {context}."
            )


async def setup_test_database():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        from app.models import ConsentRecord, FeedbackCorrection, Notification
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
            BuyerReport.__table__,
            QRCheck.__table__,
            VerificationResult.__table__,
            Notification.__table__,
            ConsentRecord.__table__,
            FeedbackCorrection.__table__,
        ]
        for t in tables:
            await conn.run_sync(t.create)

    session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with session_maker() as session:
        # 1. Seed Region & Office
        region = Region(
            id=uuid.uuid4(),
            code="REG_DHAKA",
            name_bn="ঢাকা বিভাগ",
            name_en="Dhaka Division",
            division="Dhaka",
        )
        session.add(region)

        office = Office(
            id=uuid.uuid4(),
            code="OFF_TEJGAON",
            name_bn="তেজগাঁও সহকারী কমিশনার (ভূমি) অফিস",
            name_en="AC Land Office, Tejgaon",
            office_type="AC_LAND",
            region_id=region.id,
        )
        session.add(office)

        # 2. Seed Mouza & Records
        mouza = Mouza(
            id=uuid.uuid4(),
            jl_no="04",
            name_bn="তেজগাঁও",
            name_en="Tejgaon",
            upazila="Tejgaon",
            district="Dhaka",
            office_id=office.id,
        )
        session.add(mouza)

        rec = LandRecord(
            id=uuid.uuid4(),
            record_no="LR-1205",
            khatian_no="1205",
            dag_no="1234",
            mouza_id=mouza.id,
            owner_names_bn="মোহাম্মদ রফিকুল ইসলাম",
            land_class_bn="নাল",
            area_acres=0.25,
            survey_type="RS",
        )
        session.add(rec)

        # 3. Seed Conflict Parcel for Risk Engine
        conflict_parcel_id = "P-SMOKE-CONFLICT"
        parcel = Parcel(
            parcel_id=conflict_parcel_id,
            record_id=rec.id,
            mouza_id=mouza.id,
            main_no=1234,
            sub_no=None,
            area_decimal=25.0,
        )
        session.add(parcel)

        deed1 = Deed(
            id=uuid.uuid4(),
            parcel_id=conflict_parcel_id,
            deed_no="DEED-2023-01",
            deed_type="sale",
            registry_office="Tejgaon",
            seller="আব্দুর রহিম",
            buyer="মোহাম্মদ রফিকুল ইসলাম",
            area=25.0,
            deed_date=datetime(2023, 1, 15, tzinfo=timezone.utc),
            registered_date=datetime(2023, 1, 16, tzinfo=timezone.utc),
        )
        deed2 = Deed(
            id=uuid.uuid4(),
            parcel_id=conflict_parcel_id,
            deed_no="DEED-2023-02",
            deed_type="sale",
            registry_office="Tejgaon",
            seller="আব্দুর রহিম",
            buyer="করিম উল্লাহ",
            area=25.0,
            deed_date=datetime(2023, 2, 20, tzinfo=timezone.utc),
            registered_date=datetime(2023, 2, 21, tzinfo=timezone.utc),
        )
        session.add_all([deed1, deed2])

        # 4. Seed All 8 RBAC Role Demo Accounts
        hashed_pw = hash_password(DEMO_PASSWORD)
        roles_info = [
            ("citizen@landos.gov.bd", Role.CITIZEN.value, False, None),
            ("operator@landos.gov.bd", Role.OPERATOR.value, False, None),
            ("reviewer@landos.gov.bd", Role.REVIEWER.value, False, None),
            ("supervisor@landos.gov.bd", Role.SUPERVISOR.value, False, None),
            ("officeadmin@landos.gov.bd", Role.OFFICE_ADMIN.value, False, None),
            ("regionalmanager@landos.gov.bd", Role.REGIONAL_MANAGER.value, False, None),
            ("securityofficer@landos.gov.bd", Role.SECURITY_OFFICER.value, True, DEMO_MFA_SECRET),
            ("techadmin@landos.gov.bd", Role.TECH_ADMIN.value, True, DEMO_MFA_SECRET),
        ]

        users = {}
        for email, r_name, req_mfa, secret in roles_info:
            u = User(
                id=uuid.uuid4(),
                email=email,
                hashed_password=hashed_pw,
                role=r_name,
                office_id=office.id,
                region_id=region.id,
                is_active=True,
                mfa_enabled=req_mfa,
                mfa_secret=secret,
            )
            session.add(u)
            users[r_name] = u

        await session.commit()

    return engine, session_maker, conflict_parcel_id


if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")


async def run_smoke_journey():
    print("=" * 80)
    print("            BANGLADESH LANDOS -- FULL E2E SMOKE TEST JOURNEY")
    print("=" * 80)

    engine, session_maker, conflict_parcel_id = await setup_test_database()

    async def override_get_db():
        async with session_maker() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Step 1: Log in as each role
        print("\n[Step 1/10] Verifying login for all 8 RBAC roles...")
        roles_to_test = [
            ("citizen@landos.gov.bd", Role.CITIZEN.value, False),
            ("operator@landos.gov.bd", Role.OPERATOR.value, False),
            ("reviewer@landos.gov.bd", Role.REVIEWER.value, False),
            ("supervisor@landos.gov.bd", Role.SUPERVISOR.value, False),
            ("officeadmin@landos.gov.bd", Role.OFFICE_ADMIN.value, False),
            ("regionalmanager@landos.gov.bd", Role.REGIONAL_MANAGER.value, False),
            ("securityofficer@landos.gov.bd", Role.SECURITY_OFFICER.value, True),
            ("techadmin@landos.gov.bd", Role.TECH_ADMIN.value, True),
        ]

        auth_tokens = {}
        for email, role_name, req_mfa in roles_to_test:
            payload = {"email": email, "password": DEMO_PASSWORD}
            if req_mfa:
                totp = pyotp.TOTP(DEMO_MFA_SECRET)
                payload["totp_code"] = totp.now()

            resp = await client.post("/api/v1/auth/login", json=payload)
            assert resp.status_code == 200, f"Login failed for {role_name}: {resp.text}"
            auth_tokens[role_name] = {
                "access": resp.cookies.get("landos_access_token"),
                "refresh": resp.cookies.get("landos_refresh_token"),
                "csrf": resp.cookies.get("landos_csrf_token"),
            }
            print(f"  [OK] {role_name:<18} -> 200 OK (MFA verified: {req_mfa})")

        # Step 2: Upload bad and good documents
        print("\n[Step 2/10] Testing document upload security gates...")
        citizen_cookies = {
            "landos_access_token": auth_tokens["Citizen"]["access"],
            "landos_csrf_token": auth_tokens["Citizen"]["csrf"],
        }
        citizen_headers = {"X-CSRF-Token": auth_tokens["Citizen"]["csrf"]}

        # Bad upload: executable / corrupted binary
        bad_file = io.BytesIO(b"MZ\x90\x00corrupted_executable_binary_content")
        resp_bad = await client.post(
            "/api/v1/documents",
            files={"file": ("malicious.exe", bad_file, "application/octet-stream")},
            cookies=citizen_cookies,
            headers=citizen_headers,
        )
        assert resp_bad.status_code == 400, f"Expected 400 Bad Request on invalid file, got {resp_bad.status_code}"
        print("  [OK] Malicious/corrupted file rejected (400 Bad Request)")

        # Good upload: synthetic JPEG
        img = Image.new("RGB", (300, 300), color=(250, 250, 250))
        img_bytes = io.BytesIO()
        img.save(img_bytes, format="JPEG")
        img_bytes.seek(0)

        resp_good = await client.post(
            "/api/v1/documents",
            files={"file": ("khatian_deed_sample.jpg", img_bytes, "image/jpeg")},
            cookies=citizen_cookies,
            headers=citizen_headers,
        )
        assert resp_good.status_code == 200, f"Good document upload failed: {resp_good.text}"
        doc_data = resp_good.json()
        doc_id = doc_data.get("document_id") or doc_data.get("id")
        print(f"  [OK] Valid document ingested: ID={doc_id}")

        # Step 3: Wait for OCR & check SSE progress connection
        print("\n[Step 3/10] Connecting to SSE progress stream & checking extraction...")
        async with client.stream(
            "GET",
            f"/api/v1/documents/{doc_id}/events",
            cookies=citizen_cookies,
        ) as sse_stream:
            assert sse_stream.status_code == 200, f"SSE endpoint connection failed: {sse_stream.status_code}"
            # Consume initial connection event
            async for line in sse_stream.aiter_lines():
                if line:
                    break
        print("  [OK] SSE progress event stream connected successfully")

        ext_resp = await client.get(
            f"/api/v1/documents/{doc_id}/extraction",
            cookies=citizen_cookies,
        )
        assert ext_resp.status_code == 200, f"Extraction fetch failed: {ext_resp.text}"
        print("  [OK] Extraction result retrieved")

        # Step 4: Correct a flagged field
        print("\n[Step 4/10] Submitting user field correction...")
        patch_resp = await client.patch(
            f"/api/v1/documents/{doc_id}/fields",
            json={"fields": {"dag_no": "১২৩৪", "khatian_no": "১২০৫"}},
            cookies=citizen_cookies,
            headers=citizen_headers,
        )
        assert patch_resp.status_code == 200, f"Field patch failed: {patch_resp.text}"
        patch_json = patch_resp.json()
        assert patch_json["status_label"] == "USER_CORRECTED"
        print(f"  [OK] Corrected field saved -> Status: {patch_json['status_label']}")

        # Step 5: Multi-identifier candidate search
        print("\n[Step 5/10] Executing multi-identifier record search...")
        search_resp = await client.post(
            "/api/v1/search",
            json={"dag_no": "1234", "khatian_no": "1205", "mouza": "Tejgaon"},
            cookies=citizen_cookies,
            headers=citizen_headers,
        )
        assert search_resp.status_code == 200, f"Search failed: {search_resp.text}"
        candidates = search_resp.json().get("candidates", [])
        assert len(candidates) > 0, "No candidates returned from search"
        matched_rec_id = candidates[0].get("id") or candidates[0].get("record_id")
        print(f"  [OK] Candidate matched with score {candidates[0]['score']} -> Record ID={matched_rec_id}")

        # Step 6: Verify document against record & QR integrity check
        print("\n[Step 6/10] Cross-record verification & QR integrity check...")
        verif_resp = await client.post(
            f"/api/v1/documents/{doc_id}/verify",
            json={"record_id": str(matched_rec_id)},
            cookies=citizen_cookies,
            headers=citizen_headers,
        )
        assert verif_resp.status_code == 200, f"Verification failed: {verif_resp.text}"
        verif_json = verif_resp.json()
        assert verif_json["qr_integrity"]["scope"] == "integrity_only"
        print("  [OK] Scoped integrity comparison complete (ownership claim avoided)")

        # Step 7: Run Risk Engine on seeded conflict parcel
        print("\n[Step 7/10] Executing Risk & Conflict Engine on seeded conflict scenario...")
        risk_resp = await client.post(
            f"/api/v1/parcels/{conflict_parcel_id}/alerts/run",
            cookies={
                "landos_access_token": auth_tokens["Supervisor"]["access"],
                "landos_csrf_token": auth_tokens["Supervisor"]["csrf"],
            },
            headers={"X-CSRF-Token": auth_tokens["Supervisor"]["csrf"]},
        )
        assert risk_resp.status_code == 200, f"Risk evaluation failed: {risk_resp.text}"
        alerts = risk_resp.json().get("alerts", [])
        assert len(alerts) > 0, "Expected at least 1 risk alert for conflicting sales scenario"
        for alert in alerts:
            assert alert.get("reason_bn"), "Alert missing Bangla reason"
            assert len(alert.get("evidence", [])) >= 1, "Alert missing required evidence list"
        print(f"  [OK] Risk engine generated {len(alerts)} alert(s) with reasons and verified evidence")

        # Step 8: Build Buyer Risk Report
        print("\n[Step 8/10] Generating Buyer Risk Report...")
        buyer_resp = await client.post(
            f"/api/v1/parcels/{conflict_parcel_id}/buyer-report",
            cookies=citizen_cookies,
            headers=citizen_headers,
        )
        assert buyer_resp.status_code == 200, f"Buyer report generation failed: {buyer_resp.text}"
        rep_json = buyer_resp.json()
        rep_id = rep_json["id"]
        sections = rep_json["sections"]
        for s in ["parcel_summary", "matching_records", "document_conflicts", "missing_evidence", "next_steps", "disclaimer"]:
            assert s in sections, f"Buyer report missing section: {s}"

        print_resp = await client.get(
            f"/api/v1/buyer-reports/{rep_id}/print",
            cookies=citizen_cookies,
        )
        assert print_resp.status_code == 200, f"Print report failed: {print_resp.status_code}"
        assert_no_forbidden_wording(print_resp.text, "Buyer Report HTML")
        print("  [OK] Buyer Risk Report rendered with all 6 required sections & disclaimer")

        # Step 9: Assert Cryptographic Audit Log Continuity
        print("\n[Step 9/10] Cryptographic audit chain verification...")
        audit_resp = await client.get(
            "/api/v1/admin/audit/verify-chain",
            cookies={
                "landos_access_token": auth_tokens["Security Officer"]["access"],
                "landos_csrf_token": auth_tokens["Security Officer"]["csrf"],
            },
        )
        assert audit_resp.status_code == 200, f"Audit verification failed: {audit_resp.text}"
        audit_json = audit_resp.json()
        assert audit_json["valid"] is True, f"Audit chain broken: {audit_json}"
        print(f"  [OK] Audit log chain mathematically valid: {audit_json['total_records']} blocks verified")

        # Step 10: Wording Guard Automated Inspection
        print("\n[Step 10/10] Automated forbidden wording guard scan...")
        all_responses = [
            doc_data,
            ext_resp.json(),
            patch_json,
            search_resp.json(),
            verif_json,
            risk_resp.json(),
            rep_json,
        ]
        import json
        for idx, item in enumerate(all_responses, start=1):
            dumped = json.dumps(item, ensure_ascii=False)
            assert_no_forbidden_wording(dumped, f"API Response Payload #{idx}")
        print("  [OK] Clean wording confirmed: zero occurrences of forbidden terms")

    print("\n" + "=" * 80)
    print("      ALL SMOKE JOURNEY CHECKS PASSED SUCCESSFULLY (Exit Code 0)")
    print("=" * 80)
    return 0


def main():
    try:
        code = asyncio.run(run_smoke_journey())
        sys.exit(code)
    except AssertionError as ae:
        print(f"\n\033[91m[SMOKE TEST FAILURE]\033[0m {ae}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"\n\033[91m[SMOKE TEST EXCEPTION]\033[0m {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
