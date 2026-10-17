"""
Unit tests for Buyer Risk Report Service.
Tests:
- 6 required sections: parcel_summary, matching_records, document_conflicts, missing_evidence, next_steps, disclaimer.
- Report shows counts by severity and plain list. No composite score, no safe/unsafe verdict.
- Render to printable HTML.
- Cryptographic audit logging integration.
"""

import uuid

import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.models import Alert, AuditLog, BuyerReport
from app.modules.reports.buyer_report import build_report, render_report_html
from app.risk.rules.base import ParcelContext


@pytest.mark.asyncio
async def test_buyer_report_structure_and_rules():
    user_id = uuid.uuid4()
    ctx = ParcelContext(
        parcel_id="PARCEL-REP-1",
        mouza_id="m1",
        mouza_name="তেজগাঁও",
        main_no=1205,
        sub_no=1,
        area_decimal=33.0,
        record={
            "id": "REC-1",
            "khatian_no": "340",
            "dag_no": "1205/1",
            "owner_names_bn": "আব্দুল করিম",
            "land_class_bn": "নাল",
        },
        deeds=[
            {
                "id": "D1",
                "deed_no": "4582",
                "deed_type": "sale",
                "deed_date": "2022-01-01T00:00:00Z",
                "registered_date": "2022-01-05T00:00:00Z",
                "seller": "আব্দুল করিম",
                "buyer": "রফিকুল ইসলাম",
                "area": "33.0 শতাংশ",
            }
        ],
    )

    report = await build_report(
        parcel_id="PARCEL-REP-1",
        user_id=user_id,
        parcel_ctx=ctx,
    )

    assert report["parcel_id"] == "PARCEL-REP-1"
    assert "sections" in report
    sec = report["sections"]

    # 1. parcel_summary
    assert "parcel_summary" in sec
    assert sec["parcel_summary"]["synthetic_id"] == "PARCEL-REP-1"
    assert "Illustrative" in sec["parcel_summary"]["boundary_note"]

    # 2. matching_records
    assert "matching_records" in sec
    assert len(sec["matching_records"]) >= 1

    # 3. document_conflicts
    assert "document_conflicts" in sec
    dc = sec["document_conflicts"]
    assert "counts" in dc
    assert "high" in dc["counts"]
    assert "warn" in dc["counts"]
    assert "info" in dc["counts"]
    # Global rule check: NO safety score, NO safe/unsafe verdict!
    full_text = str(report).lower()
    assert "safety_score" not in full_text
    assert "'safe'" not in full_text
    assert "'unsafe'" not in full_text

    # 4. missing_evidence
    assert "missing_evidence" in sec
    me = sec["missing_evidence"]
    assert "SAMPLE" in me["sample_disclaimer"] or "নমুনা" in me["sample_disclaimer"]
    assert len(me["items"]) >= 3

    # 5. next_steps (either cite approved KB article or show needs_verification)
    assert "next_steps" in sec
    assert len(sec["next_steps"]["items"]) >= 1
    for item in sec["next_steps"]["items"]:
        has_approved_source = bool(item.get("source") and item.get("last_verified_at"))
        is_needs_verification = "যাচাই প্রয়োজন" in item.get(
            "title", ""
        ) or "needs_verification" in item.get("status", "")
        assert has_approved_source or is_needs_verification, f"Invalid next_step item: {item}"

    # 6. disclaimer
    assert "disclaimer" in sec
    assert (
        "তথ্য যাচাই প্রয়োজন. এটি আইনি পরামর্শ বা মালিকানার সিদ্ধান্ত নয়। ডেমো ডেটা।"
        in sec["disclaimer"]["text_bn"]
    )

    # Printable HTML test
    html = render_report_html(report)
    assert "<!DOCTYPE html>" in html
    assert "বাংলাদেশ ল্যান্ডওএস — জমি যাচাই সারসংক্ষেপ প্রতিবেদন" in html
    assert "PARCEL-REP-1" in html
    assert "@media print" in html


@pytest.mark.asyncio
async def test_buyer_report_audit_logging():
    test_engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with test_engine.begin() as conn:
        await conn.run_sync(AuditLog.__table__.create)
        await conn.run_sync(BuyerReport.__table__.create)
        await conn.run_sync(Alert.__table__.create)

    session_maker = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)
    async with session_maker() as session:
        user_id = uuid.uuid4()
        ctx = ParcelContext(
            parcel_id="PARCEL-AUDIT-1",
            mouza_id="m1",
            mouza_name="তেজগাঁও",
            main_no=1205,
            sub_no=None,
            area_decimal=33.0,
        )

        rep = await build_report(
            parcel_id="PARCEL-AUDIT-1",
            user_id=user_id,
            db=session,
            parcel_ctx=ctx,
        )

        from sqlalchemy import select

        res = await session.execute(
            select(AuditLog).where(AuditLog.action == "buyer_report:generate")
        )
        logs = res.scalars().all()
        assert len(logs) == 1
        assert logs[0].resource_id == rep["id"]
        assert logs[0].prev_hash is not None

    await test_engine.dispose()


def test_buyer_report_no_score_or_safe_unsafe_automated_grep():
    """
    Feature 11 Acceptance Criteria:
    - Automated grep over UI strings, report engine, and API fixtures.
    - No score or safe/unsafe wording anywhere.
    - next_steps either cite an approved KB article (source + last_verified_at) or show needs_verification.
    """
    import os
    import re

    files_to_check = [
        "frontend/src/pages/BuyerReportPage.tsx",
        "backend/app/modules/reports/buyer_report.py",
        "config/demo_evidence_checklist.yaml",
    ]

    for rel_path in files_to_check:
        candidates = [
            os.path.abspath(rel_path),
            os.path.abspath(f"../{rel_path}"),
            os.path.abspath(f"../../{rel_path}"),
        ]
        file_path = next((p for p in candidates if os.path.exists(p)), None)
        assert file_path is not None, f"File {rel_path} not found"

        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()

        # Check for banned score & safety judgment patterns
        assert not re.search(
            r"\bsafety_score\b", content, re.IGNORECASE
        ), f"Found safety_score in {rel_path}"
        assert not re.search(
            r"['\"]safe['\"]", content, re.IGNORECASE
        ), f"Found 'safe' string in {rel_path}"
        assert not re.search(
            r"['\"]unsafe['\"]", content, re.IGNORECASE
        ), f"Found 'unsafe' string in {rel_path}"
        assert not re.search(
            r"নিরাপদ|ঝুঁকিমুক্ত", content
        ), f"Found subjective safety verdict in {rel_path}"


@pytest.mark.asyncio
async def test_p5_buyer_report_scenarios_and_traffic_lights():
    """
    Phase 2 (P5) Verification:
    - Tests clean, khas, acquired, litigated, and combined scenarios.
    - Confirms traffic_light_summary has clear/caution/stop status.
    - Confirms sections: ownership_chain, namjari_history, litigation, khas_status, acquisition_status, action_checklist.
    """
    user_id = uuid.uuid4()

    # 1. Clean Scenario
    clean_ctx = ParcelContext(
        parcel_id="P-CLEAN-TEST",
        mouza_id="m1",
        mouza_name="তেজগাঁও",
        main_no=1210,
        area_decimal=18.0,
        land_class="private",
        acquisition_status="none",
        record={
            "id": "R1",
            "khatian_no": "512",
            "dag_no": "1210",
            "owner_names_bn": "রফিকুল ইসলাম",
            "land_class_bn": "নাল",
        },
        deeds=[
            {
                "id": "D1",
                "deed_no": "1001",
                "deed_type": "sale",
                "seller": "করিম",
                "buyer": "রফিকুল ইসলাম",
                "area": "18.0",
            }
        ],
        mutations=[
            {
                "id": "M1",
                "case_no": "MC-101",
                "from_party": "করিম",
                "to_party": "রফিকুল ইসলাম",
                "area": 18.0,
            }
        ],
    )
    clean_rep = await build_report(parcel_id="P-CLEAN-TEST", user_id=user_id, parcel_ctx=clean_ctx)
    sec_clean = clean_rep["sections"]
    assert sec_clean["traffic_light_summary"]["overall_status"] == "clear"
    assert sec_clean["khas_status"]["status"].lower() == "clear"
    assert sec_clean["acquisition_status"]["status"].lower() == "clear"
    assert sec_clean["litigation"]["status"].lower() == "clear"
    assert len(sec_clean["ownership_chain"]["transfers"]) >= 1
    assert len(sec_clean["namjari_history"]["mutations"]) >= 1

    # 2. Khas Scenario
    khas_ctx = ParcelContext(
        parcel_id="P-KHAS-TEST",
        mouza_id="m1",
        mouza_name="তেজগাঁও",
        main_no=1206,
        area_decimal=20.0,
        land_class="khas",
        record={
            "id": "RK1",
            "khatian_no": "1",
            "dag_no": "1206",
            "owner_names_bn": "বাংলাদেশ সরকার",
            "land_class_bn": "সরকারি খাস জমি",
        },
    )
    khas_rep = await build_report(parcel_id="P-KHAS-TEST", user_id=user_id, parcel_ctx=khas_ctx)
    sec_khas = khas_rep["sections"]
    assert sec_khas["khas_status"]["status"].lower() in ("caution", "stop")
    assert sec_khas["traffic_light_summary"]["khas"] in ("caution", "stop")
    assert sec_khas["traffic_light_summary"]["overall_status"] == "stop"

    # 3. Acquired Scenario
    acq_ctx = ParcelContext(
        parcel_id="P-ACQ-TEST",
        mouza_id="m1",
        mouza_name="মিরপুর",
        main_no=3201,
        area_decimal=25.0,
        acquisition_status="notice_issued",
        acquisition_notice_no="LA-DHAKA-2025/44",
        acquisition_authority="জেলা প্রশাসকের কার্যালয়, ঢাকা",
    )
    acq_rep = await build_report(parcel_id="P-ACQ-TEST", user_id=user_id, parcel_ctx=acq_ctx)
    sec_acq = acq_rep["sections"]
    assert sec_acq["acquisition_status"]["status"].lower() in ("caution", "stop")
    assert sec_acq["acquisition_status"]["notice_no"] == "LA-DHAKA-2025/44"
    assert sec_acq["traffic_light_summary"]["acquisition"] in ("caution", "stop")

    # 4. Litigated Scenario
    lit_ctx = ParcelContext(
        parcel_id="P-LIT-TEST",
        mouza_id="m1",
        mouza_name="ধানমন্ডি",
        main_no=890,
        area_decimal=12.0,
        legal_cases=[
            {
                "id": "C1",
                "case_no": "TS-42/2024",
                "court": "১ম সহকারী জজ আদালত, ঢাকা",
                "status": "stayed",
                "type": "title_suit",
                "summary": "স্থগিতাদেশ কার্যকর",
            }
        ],
    )
    lit_rep = await build_report(parcel_id="P-LIT-TEST", user_id=user_id, parcel_ctx=lit_ctx)
    sec_lit = lit_rep["sections"]
    assert sec_lit["litigation"]["status"].lower() in ("caution", "stop")
    assert len(sec_lit["litigation"]["cases"]) == 1
    assert sec_lit["traffic_light_summary"]["litigation"] in ("caution", "stop")

    # 5. Combined Scenario
    comb_ctx = ParcelContext(
        parcel_id="P-COMB-TEST",
        mouza_id="m1",
        mouza_name="তেজগাঁও",
        main_no=999,
        area_decimal=50.0,
        land_class="vested_property",
        acquisition_status="under_acquisition",
        acquisition_notice_no="LA-99",
        acquisition_authority="ডিসি ঢাকা",
        legal_cases=[{"id": "C2", "case_no": "INJ-1", "court": "আদালত", "status": "injunction"}],
    )
    comb_rep = await build_report(parcel_id="P-COMB-TEST", user_id=user_id, parcel_ctx=comb_ctx)
    sec_comb = comb_rep["sections"]
    assert sec_comb["traffic_light_summary"]["overall_status"] == "stop"
    assert sec_comb["traffic_light_summary"]["khas"] == "stop"
    assert sec_comb["traffic_light_summary"]["acquisition"] == "stop"
    assert sec_comb["traffic_light_summary"]["litigation"] == "stop"
    assert len(sec_comb["action_checklist"]) >= 3

    # HTML rendering includes traffic lights and new sections
    html = render_report_html(comb_rep)
    assert "ট্রাফিক লাইট নিরীক্ষা সারসংক্ষেপ" in html
    assert "মালিকানা পরম্পরা" in html
    assert "নামজারি ইতিহাস" in html
    assert "আদালতের মামলা ও স্থগিতাদেশ" in html
    assert "সরকারি খাস ও অর্পিত সম্পত্তির তথ্য" in html
    assert "ভূমি অধিগ্রহণ নোটিশের অবস্থা" in html
