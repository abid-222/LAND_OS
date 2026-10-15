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
                "id": "D1", "deed_no": "4582", "deed_type": "sale",
                "deed_date": "2022-01-01T00:00:00Z",
                "registered_date": "2022-01-05T00:00:00Z",
                "seller": "আব্দুল করিম", "buyer": "রফিকুল ইসলাম",
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

    # 5. next_steps
    assert "next_steps" in sec
    assert len(sec["next_steps"]["items"]) >= 1

    # 6. disclaimer
    assert "disclaimer" in sec
    assert "তথ্য যাচাই প্রয়োজন. এটি আইনি পরামর্শ বা মালিকানার সিদ্ধান্ত নয়। ডেমো ডেটা।" in sec["disclaimer"]["text_bn"]

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
        res = await session.execute(select(AuditLog).where(AuditLog.action == "buyer_report:generate"))
        logs = res.scalars().all()
        assert len(logs) == 1
        assert logs[0].resource_id == rep["id"]
        assert logs[0].prev_hash is not None

    await test_engine.dispose()
