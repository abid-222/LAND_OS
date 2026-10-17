"""
Rule R9: Land Acquisition & Requisition Notice Detector
Detects ongoing or finalized land acquisition proceedings under Acquisition & Requisition
of Immovable Property Act 2017 (স্থাবর সম্পত্তি অধিগ্রহণ ও হুকুমদখল আইন ২০১৭) or Section 4/7/8 gazette notifications.
"""

import os
from typing import Any, Dict, List

import yaml

from app.risk.rules.base import AlertEvidence, BaseRiskRule, ParcelContext, RuleAlert


def _load_r9_config() -> Dict[str, Any]:
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
                    return data.get("rules", {}).get("R9_acquisition_notice", {})
            except Exception:
                pass
    return {"severity": "high"}


class AcquisitionNoticeRule(BaseRiskRule):
    id = "R9_acquisition_notice"
    description = "Flags land acquisition and requisition proceedings under Acquisition Act 2017."

    def run(self, ctx: ParcelContext) -> List[RuleAlert]:
        alerts: List[RuleAlert] = []
        cfg = _load_r9_config()

        status = str(ctx.acquisition_status or "none").lower().strip()
        if status in ("none", "", "না"):
            return alerts

        is_acquired = status in ("acquired", "অধিগ্রহণকৃত")
        is_under_acquisition = status in ("under_acquisition", "অধিগ্রহণাধীন")
        is_notice_issued = status in ("notice_issued", "নোটিশ_জারি")

        if not (is_acquired or is_under_acquisition or is_notice_issued):
            return alerts

        severity = "high" if (is_acquired or is_under_acquisition) else "warn"
        status_bn = (
            "চূড়ান্তভাবে অধিগ্রহণকৃত"
            if is_acquired
            else (
                "অধিগ্রহণ কার্যক্রম প্রক্রিয়াধীন"
                if is_under_acquisition
                else "প্রাথমিক অধিগ্রহণ নোটিশ জারি (ধারা ৪)"
            )
        )

        notice_no = ctx.acquisition_notice_no or "এল.এ কেস নোটিশ"
        authority = ctx.acquisition_authority or "জেলা প্রশাসকের কার্যালয় (অধিগ্রহণ শাখা)"

        reason_template = cfg.get(
            "reason_template_bn",
            "স্থাবর সম্পত্তি অধিগ্রহণ ও হুকুমদখল আইন ২০১৭ অনুযায়ী এই দাগে সরকারি অধিগ্রহণ প্রক্রিয়াধীন বা সম্পন্ন (স্ট্যাটাস: {status}, নোটিশ নং: {notice_no})।",
        )
        reason_bn = reason_template.format(
            status=status_bn,
            notice_no=notice_no,
        )
        if authority:
            reason_bn += f" অধিগ্রহণকারী কর্তৃপক্ষ: {authority}।"

        evidence = [
            AlertEvidence(
                source_type="parcel",
                source_id=ctx.parcel_id,
                field="acquisition_status",
                value=f"{status_bn} (নোটিশ: {notice_no})",
                document_ref=f"{authority} গেজেট/বিজ্ঞপ্তি",
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
