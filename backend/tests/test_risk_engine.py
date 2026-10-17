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


def test_all_6_rules_precision_recall_and_evidence_from_conflict_truth():
    """
    Feature 10: Risk & Conflict Engine Acceptance Criteria:
    - All 6 rules have tests.
    - Per-rule precision and recall reported from conflict_truth.json (>= 90%, 100% on benchmark).
    - Every emitted alert has a reason + at least 1 evidence item.
    - Re-run is idempotent.
    """
    import json
    import os

    from app.risk.rules import ALL_RULES, ParcelContext

    candidates = [
        os.path.abspath("data/synthetic/conflict_truth.json"),
        os.path.abspath("../data/synthetic/conflict_truth.json"),
        os.path.abspath("../../data/synthetic/conflict_truth.json"),
    ]
    truth_path = next((p for p in candidates if os.path.exists(p)), None)
    assert truth_path is not None, "conflict_truth.json not found."

    with open(truth_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    parcels_map = {p["parcel_id"]: p for p in data.get("parcels", [])}
    rule_truth = data.get("rule_truth", {})

    # 1. All 9 rules are loaded
    assert len(ALL_RULES) == 9

    for rule in ALL_RULES:
        r_id = rule.id
        assert r_id in rule_truth, f"Missing ground truth for rule {r_id}"
        pos_ids = set(rule_truth[r_id]["positives"])
        neg_ids = set(rule_truth[r_id]["negatives"])
        assert len(pos_ids) >= 10, f"Expected >= 10 positives for {r_id}"
        assert len(neg_ids) >= 10, f"Expected >= 10 negatives for {r_id}"

        tp, fp, fn, tn = 0, 0, 0, 0

        for pid in pos_ids.union(neg_ids):
            p_dict = parcels_map[pid]
            ctx = ParcelContext(
                parcel_id=pid,
                mouza_id="mouza-1",
                mouza_name=p_dict["mouza_name"],
                main_no=p_dict["main_no"],
                sub_no=p_dict.get("sub_no"),
                area_decimal=p_dict["area_decimal"],
                record=p_dict.get("record"),
                deeds=p_dict.get("deeds", []),
                mutations=p_dict.get("mutations", []),
                documents=p_dict.get("documents", []),
                region_code=p_dict.get("region_code"),
                all_registry_deeds=p_dict.get("all_registry_deeds", []),
                land_class=p_dict.get("land_class", "private"),
                acquisition_status=p_dict.get("acquisition_status", "none"),
                acquisition_notice_no=p_dict.get("acquisition_notice_no"),
                acquisition_notice_date=p_dict.get("acquisition_notice_date"),
                acquisition_authority=p_dict.get("acquisition_authority"),
                legal_cases=p_dict.get("legal_cases", []),
            )

            alerts = rule.run(ctx)
            is_pred_pos = len(alerts) > 0
            is_actual_pos = pid in pos_ids

            # Acceptance Criterion: Every alert has reason + at least 1 evidence item
            for alert in alerts:
                assert alert.reason_bn and len(alert.reason_bn.strip()) > 0
                assert len(alert.evidence) >= 1
                assert alert.evidence[0].source_type is not None

            if is_actual_pos and is_pred_pos:
                tp += 1
            elif not is_actual_pos and is_pred_pos:
                fp += 1
            elif is_actual_pos and not is_pred_pos:
                fn += 1
            else:
                tn += 1

        prec = tp / max(1, tp + fp)
        rec = tp / max(1, tp + fn)

        # Acceptance Criterion: Per-rule precision and recall >= 90%
        assert prec >= 0.90, f"Rule {r_id} precision {prec} < 0.90"
        assert rec >= 0.90, f"Rule {r_id} recall {rec} < 0.90"
