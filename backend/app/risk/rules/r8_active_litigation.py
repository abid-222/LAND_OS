"""
Rule R8: Active Litigation & Court Injunction Detector
Identifies parcels subject to pending civil court litigation, title suits, partition suits,
or interim court injunctions/stays.
"""

import os
from typing import Any, Dict, List

import yaml

from app.risk.rules.base import AlertEvidence, BaseRiskRule, ParcelContext, RuleAlert


def _load_r8_config() -> Dict[str, Any]:
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
                    return data.get("rules", {}).get("R8_active_litigation", {})
            except Exception:
                pass
    return {"severity": "high"}


class ActiveLitigationRule(BaseRiskRule):
    id = "R8_active_litigation"
    description = "Identifies parcels with active court disputes, civil suits, injunctions, or stayed proceedings."

    def run(self, ctx: ParcelContext) -> List[RuleAlert]:
        alerts: List[RuleAlert] = []
        cfg = _load_r8_config()

        # Check legal cases attached to context
        active_cases = [
            c
            for c in ctx.legal_cases
            if str(c.get("status", "")).lower()
            in ("open", "stayed", "injunction", "চলমান", "স্থগিত")
        ]

        if not active_cases:
            return alerts

        for case in active_cases:
            status_raw = str(case.get("status", "open")).lower()
            is_stayed = (
                "stayed" in status_raw or "injunction" in status_raw or "স্থগিত" in status_raw
            )
            severity = "high" if is_stayed else "warn"

            status_bn = "স্থগিতাদেশ / নিষেধাজ্ঞা কার্যকর" if is_stayed else "চলমান"
            case_no = str(case.get("case_no", "মামলা"))
            court = str(case.get("court", "বিজ্ঞ আদালত"))
            parties = str(case.get("parties", ""))

            reason_template = cfg.get(
                "reason_template_bn",
                "দাগ/পার্সেলটির বিরুদ্ধে বিজ্ঞ আদালতে দেওয়ানি মামলা চলমান রয়েছে (মামলা নং: {case_no}, আদালত: {court}, স্ট্যাটাস: {status})।",
            )
            reason_bn = reason_template.format(
                case_no=case_no,
                court=court,
                status=status_bn,
            )
            if parties:
                reason_bn += f" পক্ষগণ: {parties}।"

            evidence = [
                AlertEvidence(
                    source_type="legal_case",
                    source_id=str(case.get("id", case_no)),
                    field="case_no",
                    value=f"{case_no} ({court} - {status_bn})",
                    document_ref=f"{court} নথি রেজিস্টার",
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
