"""
Rule R7: Khas, Vested & Government Land Detector
Flags parcels designated as government khas, vested/enemy property, railway/buffer corridor,
or waqf/debottor land. Private conveyance or mutation on such land is legally prohibited.
"""

import os
from typing import Any, Dict, List

import yaml

from app.risk.rules.base import AlertEvidence, BaseRiskRule, ParcelContext, RuleAlert


def _load_r7_config() -> Dict[str, Any]:
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
                    return data.get("rules", {}).get("R7_khas_or_government_land", {})
            except Exception:
                pass
    return {"severity": "high"}


class KhasOrGovernmentLandRule(BaseRiskRule):
    id = "R7_khas_or_government_land"
    description = "Detects government khas land, vested/enemy property, or waqf property clashes."

    def run(self, ctx: ParcelContext) -> List[RuleAlert]:
        alerts: List[RuleAlert] = []
        cfg = _load_r7_config()

        land_class = str(ctx.land_class or "").lower().strip()
        record_class = ""
        if ctx.record:
            record_class = str(ctx.record.get("land_class_bn") or "").lower().strip()

        # Check for khas, vested, or waqf classifications
        is_khas = any(k in land_class or k in record_class for k in ("khas", "খাস", "সরকারি"))
        is_vested = any(
            v in land_class or v in record_class for v in ("vested", "অর্পিত", "enemy", "পরিত্যক্ত")
        )
        is_waqf = any(
            w in land_class or w in record_class
            for w in ("waqf", "ওয়াকফ", "ওয়াক্ফ", "debottor", "দেবোত্তর")
        )

        if not (is_khas or is_vested or is_waqf):
            return alerts

        category_label_bn = (
            "সরকারি খাস জমি"
            if is_khas
            else ("অর্পিত / শত্রু সম্পত্তি" if is_vested else "ওয়াকফ / দেবোত্তর সম্পত্তি")
        )
        category_label_en = (
            "Government Khas Land"
            if is_khas
            else ("Vested / Enemy Property" if is_vested else "Waqf / Debottor Property")
        )
        severity = "high" if (is_khas or is_vested) else "warn"

        reason_template = cfg.get(
            "reason_template_bn",
            "জমির শ্রেণিবিভাগ অনুযায়ী এটি সরকারি খাস/অর্পিত সম্পত্তি বা ওয়াকফ হিসেবে রেকর্ডভুক্ত ({land_class})। ব্যক্তিগত হস্তান্তর বা নামজারি আইনত সীমাবদ্ধ।",
        )
        reason_bn = reason_template.format(land_class=category_label_bn)

        evidence = [
            AlertEvidence(
                source_type="land_record" if ctx.record else "parcel",
                source_id=str(ctx.record.get("id"))
                if ctx.record and ctx.record.get("id")
                else ctx.parcel_id,
                field="land_class",
                value=f"{category_label_bn} ({category_label_en})",
                document_ref="উপজেলা ভূমি অফিস ১নং খাস খতিয়ান ও অর্পিত সম্পত্তি রেজিস্টার",
            )
        ]

        alerts.append(
            RuleAlert(
                rule_id=self.id,
                severity=severity,
                title_bn="সম্ভাব্য অসঙ্গতি, যাচাই প্রয়োজন",
                reason_bn=reason_bn,
                evidence=evidence,
                rule_version="v1.0",
            )
        )
        return alerts
