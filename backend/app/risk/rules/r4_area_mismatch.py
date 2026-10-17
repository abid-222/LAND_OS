"""
Rule R4: Area Mismatch Detector
Evaluates deed/mutation area against the baseline record area.
Converts regional units exclusively via config/area_units.yaml.
If region is unknown for regional units -> emits 'info' alert with 'unit needs region' and skips hard mismatch.
If converted area deviates from record area beyond configured tolerance % -> emits 'warn' alert.
"""

import os
from typing import Any, Dict, List

import yaml

from app.core.normalize import normalize_area
from app.risk.rules.base import AlertEvidence, BaseRiskRule, ParcelContext, RuleAlert


def _load_r4_config() -> Dict[str, Any]:
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
                    return data.get("rules", {}).get("R4_area_mismatch", {})
            except Exception:
                pass
    return {"tolerance_percent": 2.0, "severity": "warn"}


class AreaMismatchRule(BaseRiskRule):
    id = "R4_area_mismatch"
    description = "Flags discrepancies between deed/mutation area and baseline land record area beyond tolerance."

    def run(self, ctx: ParcelContext) -> List[RuleAlert]:
        alerts: List[RuleAlert] = []
        cfg = _load_r4_config()
        tolerance_pct = cfg.get("tolerance_percent", 2.0)
        severity = cfg.get("severity", "warn")

        baseline_area = ctx.area_decimal
        if not baseline_area or baseline_area <= 0:
            return alerts

        # 1. Check Deeds Area
        for d in ctx.deeds:
            raw_area = d.get("area")
            did = str(d.get("id") or d.get("deed_no"))
            d_no = d.get("deed_no", "অজ্ঞাত")

            if raw_area is None:
                continue

            norm_ar = normalize_area(raw_area, region_code=ctx.region_code)

            # Check if region is needed
            if norm_ar.flag_reason == "unit needs region":
                alerts.append(
                    RuleAlert(
                        rule_id=self.id,
                        severity="info",
                        title_bn="সম্ভাব্য অসঙ্গতি, যাচাই প্রয়োজন",
                        reason_bn=(
                            f"দলিল নং {d_no}-এ ব্যবহৃত আঞ্চলিক জমির একক ({norm_ar.original_unit}) রূপান্তরের জন্য অঞ্চল নির্ধারণ প্রয়োজন (unit needs region)।"
                        ),
                        evidence=[
                            AlertEvidence(
                                source_type="deed",
                                source_id=did,
                                field="area",
                                value=str(raw_area),
                                document_ref=f"দলিল নং {d_no}",
                            )
                        ],
                    )
                )
                continue

            # Compare converted decimal area against baseline
            val_dec = (
                norm_ar.area_decimal if norm_ar.area_decimal is not None else norm_ar.parsed_value
            )
            if val_dec is not None and val_dec > 0:
                diff_pct = abs(val_dec - baseline_area) / baseline_area * 100.0
                if diff_pct > tolerance_pct:
                    alerts.append(
                        RuleAlert(
                            rule_id=self.id,
                            severity=severity,
                            title_bn="সম্ভাব্য অসঙ্গতি, যাচাই প্রয়োজন",
                            reason_bn=(
                                f"দলিলে উল্লিখিত জমির পরিমাণ ({val_dec:.2f} শতাংশ) এবং মূল রেকর্ডের পরিমাণের "
                                f"({baseline_area:.2f} শতাংশ) মধ্যে {diff_pct:.2f}% গরমিল রয়েছে (অনুমোদনযোগ্য সীমা: {tolerance_pct}%)।"
                            ),
                            evidence=[
                                AlertEvidence(
                                    source_type="deed",
                                    source_id=did,
                                    field="area",
                                    value=f"{val_dec:.2f} শতাংশ",
                                    document_ref=f"দলিল নং {d_no}",
                                ),
                                AlertEvidence(
                                    source_type="land_record",
                                    source_id=ctx.parcel_id,
                                    field="area_decimal",
                                    value=f"{baseline_area:.2f} শতাংশ",
                                    document_ref=f"খতিয়ান রেকর্ড (দাগ {ctx.main_no})",
                                ),
                            ],
                        )
                    )

        # 2. Check Mutations Area
        for m in ctx.mutations:
            raw_area = m.get("area")
            mid = str(m.get("id") or m.get("case_no"))
            case_no = m.get("case_no", "অজ্ঞাত")

            if raw_area is None:
                continue

            norm_ar = normalize_area(raw_area, region_code=ctx.region_code)

            if norm_ar.flag_reason == "unit needs region":
                alerts.append(
                    RuleAlert(
                        rule_id=self.id,
                        severity="info",
                        title_bn="সম্ভাব্য অসঙ্গতি, যাচাই প্রয়োজন",
                        reason_bn=(
                            f"নামজারি কেস {case_no}-এ ব্যবহৃত আঞ্চলিক জমির একক ({norm_ar.original_unit}) রূপান্তরের জন্য অঞ্চল নির্ধারণ প্রয়োজন।"
                        ),
                        evidence=[
                            AlertEvidence(
                                source_type="mutation",
                                source_id=mid,
                                field="area",
                                value=str(raw_area),
                                document_ref=f"নামজারি কেস {case_no}",
                            )
                        ],
                    )
                )
                continue

            val_dec = (
                norm_ar.area_decimal if norm_ar.area_decimal is not None else norm_ar.parsed_value
            )
            if val_dec is not None and val_dec > 0:
                diff_pct = abs(val_dec - baseline_area) / baseline_area * 100.0
                if diff_pct > tolerance_pct:
                    alerts.append(
                        RuleAlert(
                            rule_id=self.id,
                            severity=severity,
                            title_bn="সম্ভাব্য অসঙ্গতি, যাচাই প্রয়োজন",
                            reason_bn=(
                                f"নামজারির জমির পরিমাণ ({val_dec:.2f} শতাংশ) এবং মূল রেকর্ডের পরিমাণের "
                                f"({baseline_area:.2f} শতাংশ) মধ্যে {diff_pct:.2f}% অসঙ্গতি রয়েছে।"
                            ),
                            evidence=[
                                AlertEvidence(
                                    source_type="mutation",
                                    source_id=mid,
                                    field="area",
                                    value=f"{val_dec:.2f} শতাংশ",
                                    document_ref=f"নামজারি কেস {case_no}",
                                ),
                                AlertEvidence(
                                    source_type="land_record",
                                    source_id=ctx.parcel_id,
                                    field="area_decimal",
                                    value=f"{baseline_area:.2f} শতাংশ",
                                    document_ref=f"খতিয়ান রেকর্ড (দাগ {ctx.main_no})",
                                ),
                            ],
                        )
                    )

        return alerts
