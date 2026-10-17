"""
Rule R1: Conflicting Sale Detector
Detects multiple sale deeds on the same parcel where:
1. Two sales occur within configured window (e.g. 180 days) to different buyers.
2. A later sale deed's seller is not the earlier sale deed's buyer (broken chain-of-title).
"""

import os
from datetime import datetime
from typing import Any, Dict, List

import yaml

from app.core.normalize import fuzzy_compare_names
from app.risk.rules.base import AlertEvidence, BaseRiskRule, ParcelContext, RuleAlert


def _load_r1_config() -> Dict[str, Any]:
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
                    return data.get("rules", {}).get("R1_conflicting_sale", {})
            except Exception:
                pass
    return {"window_days": 180, "severity": "high"}


class ConflictingSaleRule(BaseRiskRule):
    id = "R1_conflicting_sale"
    description = "Detects conflicting multiple sales or broken chain of title on the same parcel."

    def run(self, ctx: ParcelContext) -> List[RuleAlert]:
        alerts: List[RuleAlert] = []
        cfg = _load_r1_config()
        window_days = cfg.get("window_days", 180)
        severity = cfg.get("severity", "high")

        # Filter sale deeds
        sale_deeds = [
            d
            for d in ctx.deeds
            if str(d.get("deed_type", "sale")).lower() in ("sale", "বিক্রয়", "ক্রয়", "সাফ-কবলা")
        ]
        if len(sale_deeds) < 2:
            return alerts

        # Sort by deed_date ascending
        def parse_date(d: Dict[str, Any]) -> datetime:
            val = d.get("deed_date")
            if isinstance(val, datetime):
                return val
            if isinstance(val, str):
                try:
                    return datetime.fromisoformat(val.replace("Z", "+00:00"))
                except Exception:
                    pass
            return datetime.min

        sorted_deeds = sorted(sale_deeds, key=parse_date)

        for i in range(len(sorted_deeds)):
            d1 = sorted_deeds[i]
            t1 = parse_date(d1)
            b1 = d1.get("buyer", "")
            id1 = str(d1.get("id") or d1.get("deed_no"))

            for j in range(i + 1, len(sorted_deeds)):
                d2 = sorted_deeds[j]
                t2 = parse_date(d2)
                b2 = d2.get("buyer", "")
                s2 = d2.get("seller", "")
                id2 = str(d2.get("id") or d2.get("deed_no"))

                days_diff = abs((t2 - t1).days)

                # Condition 1: Concurrent sales within window to different buyers
                diff_buyers = fuzzy_compare_names(b1, b2) < 75.0
                if days_diff <= window_days and diff_buyers:
                    alerts.append(
                        RuleAlert(
                            rule_id=self.id,
                            severity=severity,
                            title_bn="সম্ভাব্য অসঙ্গতি, যাচাই প্রয়োজন",
                            reason_bn=(
                                f"একই জমিতে স্বল্প সময়ের ({days_diff} দিন) ব্যবধানে ভিন্ন ক্রেতার কাছে একাধিক বিক্রয় দলিল সম্পাদিত হয়েছে।"
                            ),
                            evidence=[
                                AlertEvidence(
                                    source_type="deed",
                                    source_id=id1,
                                    field="buyer",
                                    value=b1,
                                    document_ref=f"দলিল নং {d1.get('deed_no')}",
                                ),
                                AlertEvidence(
                                    source_type="deed",
                                    source_id=id2,
                                    field="buyer",
                                    value=b2,
                                    document_ref=f"দলিল নং {d2.get('deed_no')}",
                                ),
                            ],
                        )
                    )
                    continue

                # Condition 2: Broken chain of title (d2 seller is not d1 buyer)
                seller_is_prev_buyer = fuzzy_compare_names(s2, b1) >= 75.0
                if not seller_is_prev_buyer:
                    alerts.append(
                        RuleAlert(
                            rule_id=self.id,
                            severity=severity,
                            title_bn="সম্ভাব্য অসঙ্গতি, যাচাই প্রয়োজন",
                            reason_bn=(
                                "পরবর্তী বিক্রয় দলিলের বিক্রেতা পূর্ববর্তী দলিলের ক্রেতার সাথে মিলছে না (মালিকানা হস্তান্তরের ধারাবাহিকতা অনুপস্থিত)।"
                            ),
                            evidence=[
                                AlertEvidence(
                                    source_type="deed",
                                    source_id=id1,
                                    field="buyer",
                                    value=b1,
                                    document_ref=f"দলিল নং {d1.get('deed_no')} (পূর্ববর্তী ক্রেতা)",
                                ),
                                AlertEvidence(
                                    source_type="deed",
                                    source_id=id2,
                                    field="seller",
                                    value=s2,
                                    document_ref=f"দলিল নং {d2.get('deed_no')} (পরবর্তী বিক্রেতা)",
                                ),
                            ],
                        )
                    )

        return alerts
