"""
Rule R5: Deed-Mutation Inconsistency Detector
Evaluates:
1. Discrepancies between mutation parties/area and the linked deed (High severity).
2. Deeds without any corresponding mutation after configured grace period (e.g. 730 days / 2 years) (Info severity).
3. Mutations lacking an underlying registered deed reference (Warn severity).
"""

import os
from datetime import datetime, timezone
from typing import Any, Dict, List

import yaml

from app.core.normalize import fuzzy_compare_names, normalize_area
from app.risk.rules.base import AlertEvidence, BaseRiskRule, ParcelContext, RuleAlert


def _load_r5_config() -> Dict[str, Any]:
    candidates = [
        os.path.abspath("config/risk_rules.yaml"),
        os.path.abspath("../config/risk_rules.yaml"),
        os.path.abspath("../../config/risk_rules.yaml"),
        os.path.join(os.path.dirname(__file__), "../../../../config/risk_rules.yaml"),
    ]
    for path in candidates:
        if os.path.exists(path):
            try:
                with open(path, "r", encoding="utf-8") as f:
                    data = yaml.safe_load(f)
                    return data.get("rules", {}).get("R5_deed_mutation_inconsistency", {})
            except Exception:
                pass
    return {
        "mutation_grace_period_days": 730,
        "area_tolerance_percent": 2.0,
        "no_mutation_severity": "info",
        "mutation_without_deed_severity": "warn",
        "mismatch_severity": "high",
    }


def _parse_dt(val: Any) -> datetime:
    if isinstance(val, datetime):
        return val if val.tzinfo else val.replace(tzinfo=timezone.utc)
    if isinstance(val, str) and val.strip():
        try:
            dt = datetime.fromisoformat(val.replace("Z", "+00:00"))
            return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
        except Exception:
            pass
    return datetime.min.replace(tzinfo=timezone.utc)


class DeedMutationInconsistencyRule(BaseRiskRule):
    id = "R5_deed_mutation_inconsistency"
    description = "Checks mismatch between mutation and linked deed, aged deeds lacking mutations, and orphan mutations."

    def run(self, ctx: ParcelContext) -> List[RuleAlert]:
        alerts: List[RuleAlert] = []
        cfg = _load_r5_config()
        grace_days = cfg.get("mutation_grace_period_days", 730)
        area_tol_pct = cfg.get("area_tolerance_percent", 2.0)
        no_mut_sev = cfg.get("no_mutation_severity", "info")
        mut_no_deed_sev = cfg.get("mutation_without_deed_severity", "warn")
        mismatch_sev = cfg.get("mismatch_severity", "high")

        deed_by_id = {str(d.get("id")): d for d in ctx.deeds if d.get("id")}
        now = datetime.now(timezone.utc)

        # 1. Evaluate linked deed & mutation discrepancies
        linked_deed_ids = set()
        for m in ctx.mutations:
            mid = str(m.get("id") or m.get("case_no"))
            case_no = m.get("case_no", "অজ্ঞাত")
            did = str(m.get("deed_id") or "")

            if did and did in deed_by_id:
                linked_deed_ids.add(did)
                d = deed_by_id[did]
                d_no = d.get("deed_no", "অজ্ঞাত")

                # Check Party Discrepancy (from_party vs seller, to_party vs buyer)
                m_from = m.get("from_party", "")
                m_to = m.get("to_party", "")
                d_seller = d.get("seller", "")
                d_buyer = d.get("buyer", "")

                sim_seller = fuzzy_compare_names(m_from, d_seller)
                sim_buyer = fuzzy_compare_names(m_to, d_buyer)

                if sim_seller < 75.0 or sim_buyer < 75.0:
                    alerts.append(
                        RuleAlert(
                            rule_id=self.id,
                            severity=mismatch_sev,
                            title_bn="সম্ভাব্য অসঙ্গতি, যাচাই প্রয়োজন",
                            reason_bn="নামজারি ও সংযুক্ত দলিলের পক্ষগণের নামের মধ্যে গরমিল পাওয়া গেছে।",
                            evidence=[
                                AlertEvidence(
                                    source_type="mutation",
                                    source_id=mid,
                                    field="parties",
                                    value=f"দাতা: {m_from}, গ্রহীতা: {m_to}",
                                    document_ref=f"নামজারি কেস {case_no}",
                                ),
                                AlertEvidence(
                                    source_type="deed",
                                    source_id=did,
                                    field="parties",
                                    value=f"বিক্রেতা: {d_seller}, ক্রেতা: {d_buyer}",
                                    document_ref=f"দলিল নং {d_no}",
                                ),
                            ],
                        )
                    )

                # Check Area Discrepancy
                d_ar = normalize_area(d.get("area"), region_code=ctx.region_code)
                m_ar = normalize_area(m.get("area"), region_code=ctx.region_code)
                v_d = d_ar.area_decimal if d_ar.area_decimal is not None else d_ar.parsed_value
                v_m = m_ar.area_decimal if m_ar.area_decimal is not None else m_ar.parsed_value

                if v_d and v_m and v_d > 0:
                    diff_pct = abs(v_m - v_d) / v_d * 100.0
                    if diff_pct > area_tol_pct:
                        alerts.append(
                            RuleAlert(
                                rule_id=self.id,
                                severity=mismatch_sev,
                                title_bn="সম্ভাব্য অসঙ্গতি, যাচাই প্রয়োজন",
                                reason_bn=(
                                    f"সংযুক্ত দলিল ({v_d:.2f} শতাংশ) এবং নামজারির জমির পরিমাণের "
                                    f"({v_m:.2f} শতাংশ) মধ্যে {diff_pct:.2f}% গরমিল রয়েছে।"
                                ),
                                evidence=[
                                    AlertEvidence(
                                        source_type="deed",
                                        source_id=did,
                                        field="area",
                                        value=f"{v_d:.2f} শতাংশ",
                                        document_ref=f"দলিল নং {d_no}",
                                    ),
                                    AlertEvidence(
                                        source_type="mutation",
                                        source_id=mid,
                                        field="area",
                                        value=f"{v_m:.2f} শতাংশ",
                                        document_ref=f"নামজারি কেস {case_no}",
                                    ),
                                ],
                            )
                        )
            elif not did and len(ctx.deeds) == 0:
                # Mutation with no underlying deed
                alerts.append(
                    RuleAlert(
                        rule_id=self.id,
                        severity=mut_no_deed_sev,
                        title_bn="সম্ভাব্য অসঙ্গতি, যাচাই প্রয়োজন",
                        reason_bn="সংযুক্ত রেজিস্ট্রিকৃত দলিল বা হস্তান্তরের ভিত্তি ব্যতীত নামজারি রেকর্ড বিদ্যমান।",
                        evidence=[
                            AlertEvidence(
                                source_type="mutation",
                                source_id=mid,
                                field="deed_id",
                                value="None",
                                document_ref=f"নামজারি কেস {case_no}",
                            )
                        ],
                    )
                )

        # 2. Check Aged Deeds with No Mutation
        for d in ctx.deeds:
            did = str(d.get("id") or d.get("deed_no"))
            d_no = d.get("deed_no", "অজ্ঞাত")
            d_type = str(d.get("deed_type", "sale")).lower()

            if d_type in ("sale", "বিক্রয়", "সাফ-কবলা"):
                d_date = _parse_dt(d.get("deed_date"))
                if d_date != datetime.min.replace(tzinfo=timezone.utc):
                    age_days = (now - d_date).days
                    if age_days > grace_days and (did not in linked_deed_ids and len(ctx.mutations) == 0):
                        alerts.append(
                            RuleAlert(
                                rule_id=self.id,
                                severity=no_mut_sev,
                                title_bn="সম্ভাব্য অসঙ্গতি, যাচাই প্রয়োজন",
                                reason_bn=(
                                    f"দলিল রেজিস্ট্রেশনের পর দীর্ঘ সময় ({age_days // 365} বছর) "
                                    "অতিক্রান্ত হলেও কোনো নামজারি (মিউটেশন) রেকর্ড পাওয়া যায়নি।"
                                ),
                                evidence=[
                                    AlertEvidence(
                                        source_type="deed",
                                        source_id=did,
                                        field="deed_date",
                                        value=d_date.date().isoformat(),
                                        document_ref=f"দলিল নং {d_no} ({age_days} দিন পূর্বে)",
                                    )
                                ],
                            )
                        )

        return alerts
