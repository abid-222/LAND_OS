"""
Unit tests for LandOS Risk & Conflict Engine.
Tests:
- Idempotency (repeated runs produce identical alerts)
- Deduplication by rule_id + evidence hash
- Preservation of reviewed/dismissed alert history in database
"""

import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.models import Alert
from app.risk.engine import RiskEngine
from app.risk.rules.base import AlertEvidence, BaseRiskRule, ParcelContext, RuleAlert


class MockFlappingRule(BaseRiskRule):
    id = "MOCK_RULE"
    description = "Deterministic mock rule for engine tests."

    def run(self, ctx: ParcelContext):
        return [
            RuleAlert(
                rule_id=self.id,
                severity="warn",
                title_bn="সম্ভাব্য অসঙ্গতি, যাচাই প্রয়োজন",
                reason_bn="পরীক্ষামূলক সতর্কতা",
                evidence=[
                    AlertEvidence(source_type="deed", source_id="D1", field="area", value="50.0")
                ],
            )
        ]


@pytest.mark.asyncio
async def test_engine_idempotency_and_deduplication():
    engine = RiskEngine(rules=[MockFlappingRule()])
    ctx = ParcelContext(
        parcel_id="P-TEST-1",
        mouza_id="m1",
        mouza_name="তেজগাঁও",
        main_no=1205,
        sub_no=None,
        area_decimal=33.0,
    )

    # First run
    run1 = await engine.run_all(parcel_id="P-TEST-1", ctx=ctx)
    assert len(run1) == 1
    assert run1[0].rule_id == "MOCK_RULE"

    # Second run on same context must produce identical 1 alert (not duplicated)
    run2 = await engine.run_all(parcel_id="P-TEST-1", ctx=ctx)
    assert len(run2) == 1
    assert run1[0].evidence_hash() == run2[0].evidence_hash()


@pytest.mark.asyncio
async def test_engine_preserves_reviewed_dismissed_history():
    test_engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with test_engine.begin() as conn:
        await conn.run_sync(Alert.__table__.create)

    session_maker = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)
    async with session_maker() as session:
        engine = RiskEngine(rules=[MockFlappingRule()])
        ctx = ParcelContext(
            parcel_id="P-TEST-2",
            mouza_id="m1",
            mouza_name="তেজগাঁও",
            main_no=1205,
            sub_no=None,
            area_decimal=33.0,
        )

        # 1. Run engine to insert alert
        await engine.run_all(parcel_id="P-TEST-2", db=session, ctx=ctx)

        from sqlalchemy import select
        res = await session.execute(select(Alert).where(Alert.parcel_id == "P-TEST-2"))
        db_alert = res.scalar_one()
        assert db_alert.status == "open"

        # 2. Reviewer marks alert as 'reviewed'
        db_alert.status = "reviewed"
        await session.commit()

        # 3. Re-run engine: status must REMAIN 'reviewed', NOT reset to 'open' or duplicated
        await engine.run_all(parcel_id="P-TEST-2", db=session, ctx=ctx)

        res2 = await session.execute(select(Alert).where(Alert.parcel_id == "P-TEST-2"))
        all_alerts = res2.scalars().all()
        assert len(all_alerts) == 1
        assert all_alerts[0].status == "reviewed"

    await test_engine.dispose()
