"""
Rule R2: Duplicate Deed Reference Detector
Detects identical (deed_no, registry_office, year) attached to different parcels or different parties.
"""

import os
from datetime import datetime
from typing import Any, Dict, List, Optional

import yaml

from app.core.normalize import fuzzy_compare_names
from app.risk.rules.base import AlertEvidence, BaseRiskRule, ParcelContext, RuleAlert


def _load_r2_config() -> Dict[str, Any]:
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
                    return data.get("rules", {}).get("R2_duplicate_deed_reference", {})
            except Exception:
                pass
    return {"severity": "high"}


def get_year(val: Any) -> Optional[int]:
    if isinstance(val, datetime):
        return val.year
    if isinstance(val, str) and val.strip():
        try:
            return datetime.fromisoformat(val.replace("Z", "+00:00")).year
        except Exception:
            parts = val.split("-")
            if len(parts) >= 1 and parts[0].isdigit():
                return int(parts[0])
    return None


class DuplicateDeedRule(BaseRiskRule):
    id = "R2_duplicate_deed_reference"
    description = "Detects identical deed number, office, and year assigned to different parcels or parties."

    def run(self, ctx: ParcelContext) -> List[RuleAlert]:
        alerts: List[RuleAlert] = []
        cfg = _load_r2_config()
        severity = cfg.get("severity", "high")

        # Pool deeds: parcel's own deeds + any cross-parcel registry deeds provided in context
        all_deeds = list(ctx.deeds)
        if ctx.all_registry_deeds:
            existing_ids = {d.get("id") for d in all_deeds if d.get("id")}
            for rd in ctx.all_registry_deeds:
                if rd.get("id") not in existing_ids:
                    all_deeds.append(rd)

        if len(all_deeds) < 2:
            return alerts

        for i in range(len(all_deeds)):
            d1 = all_deeds[i]
            no1 = str(d1.get("deed_no", "")).strip()
            off1 = str(d1.get("registry_office", "")).strip()
            yr1 = get_year(d1.get("deed_date") or d1.get("registered_date"))
            p1 = str(d1.get("parcel_id", ctx.parcel_id)).strip()
            s1 = d1.get("seller", "")
            b1 = d1.get("buyer", "")

            if not no1 or not off1 or not yr1:
                continue

            for j in range(i + 1, len(all_deeds)):
                d2 = all_deeds[j]
                no2 = str(d2.get("deed_no", "")).strip()
                off2 = str(d2.get("registry_office", "")).strip()
                yr2 = get_year(d2.get("deed_date") or d2.get("registered_date"))
                p2 = str(d2.get("parcel_id", ctx.parcel_id)).strip()
                s2 = d2.get("seller", "")
                b2 = d2.get("buyer", "")

                # Match on deed_no, registry_office, and year
                if no1 == no2 and yr1 == yr2 and fuzzy_compare_names(off1, off2) >= 85.0:
                    diff_parcel = (p1 != p2)
                    diff_parties = (fuzzy_compare_names(s1, s2) < 75.0 or fuzzy_compare_names(b1, b2) < 75.0)

                    if diff_parcel or diff_parties:
                        reason = (
                            f"একই সাব-রেজিস্ট্রি অফিসে একই বছরে ({yr1}) একই দলিল নম্বর ({no1}) "
                            f"{'ভিন্ন জমির প্লট' if diff_parcel else 'ভিন্ন পক্ষের নামে'} ব্যবহৃত হয়েছে।"
                        )
                        alerts.append(
                            RuleAlert(
                                rule_id=self.id,
                                severity=severity,
                                title_bn="সম্ভাব্য অসঙ্গতি, যাচাই প্রয়োজন",
                                reason_bn=reason,
                                evidence=[
                                    AlertEvidence(
                                        source_type="deed",
                                        source_id=str(d1.get("id") or no1),
                                        field="deed_no",
                                        value=f"{no1} ({off1}, {yr1})",
                                        document_ref=f"জমি {p1}, পক্ষ: {s1} -> {b1}",
                                    ),
                                    AlertEvidence(
                                        source_type="deed",
                                        source_id=str(d2.get("id") or no2),
                                        field="deed_no",
                                        value=f"{no2} ({off2}, {yr2})",
                                        document_ref=f"জমি {p2}, পক্ষ: {s2} -> {b2}",
                                    ),
                                ],
                            )
                        )

        return alerts
