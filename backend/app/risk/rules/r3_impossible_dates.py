"""
Rule R3: Impossible Dates Detector
Detects:
1. Deed date in the future.
2. Registration date occurring before deed execution date.
3. Mutation date occurring before deed date.
4. Dates outside the configured plausible historical range (e.g. before 1900).
"""

import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import yaml

from app.risk.rules.base import AlertEvidence, BaseRiskRule, ParcelContext, RuleAlert


def _load_r3_config() -> Dict[str, Any]:
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
                    return data.get("rules", {}).get("R3_impossible_dates", {})
            except Exception:
                pass
    return {"min_year": 1900, "future_buffer_days": 0, "severity": "high"}


def _parse_dt(val: Any) -> Optional[datetime]:
    if isinstance(val, datetime):
        return val if val.tzinfo else val.replace(tzinfo=timezone.utc)
    if isinstance(val, str) and val.strip():
        try:
            dt = datetime.fromisoformat(val.replace("Z", "+00:00"))
            return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
        except Exception:
            pass
    return None


class ImpossibleDatesRule(BaseRiskRule):
    id = "R3_impossible_dates"
    description = "Flags chronological anomalies: future dates, registration before execution, mutation before deed, or dates pre-1900."

    def run(self, ctx: ParcelContext) -> List[RuleAlert]:
        alerts: List[RuleAlert] = []
        cfg = _load_r3_config()
        min_year = cfg.get("min_year", 1900)
        severity = cfg.get("severity", "high")
        now = datetime.now(timezone.utc)

        # 1. Check Deed Dates
        deed_map: Dict[str, Dict[str, Any]] = {}
        for d in ctx.deeds:
            did = str(d.get("id") or d.get("deed_no"))
            deed_map[did] = d
            d_date = _parse_dt(d.get("deed_date"))
            r_date = _parse_dt(d.get("registered_date"))
            d_no = d.get("deed_no", "অজ্ঞাত")

            if d_date:
                # Future deed date
                if d_date > now:
                    alerts.append(
                        RuleAlert(
                            rule_id=self.id,
                            severity=severity,
                            title_bn="সম্ভাব্য অসঙ্গতি, যাচাই প্রয়োজন",
                            reason_bn="দলিল সম্পাদনের তারিখ বর্তমান সময় থেকে ভবিষ্যতের হতে পারে না।",
                            evidence=[
                                AlertEvidence(
                                    source_type="deed",
                                    source_id=did,
                                    field="deed_date",
                                    value=d_date.isoformat(),
                                    document_ref=f"দলিল নং {d_no}",
                                )
                            ],
                        )
                    )

                # Prior to plausible min_year
                if d_date.year < min_year:
                    alerts.append(
                        RuleAlert(
                            rule_id=self.id,
                            severity=severity,
                            title_bn="সম্ভাব্য অসঙ্গতি, যাচাই প্রয়োজন",
                            reason_bn=f"দলিল সম্পাদনের সন ({d_date.year}) গ্রহণযোগ্য ঐতিহাসিক সীমার ({min_year}) পূর্বে।",
                            evidence=[
                                AlertEvidence(
                                    source_type="deed",
                                    source_id=did,
                                    field="deed_date",
                                    value=str(d_date.year),
                                    document_ref=f"দলিল নং {d_no}",
                                )
                            ],
                        )
                    )

            if d_date and r_date:
                # Registration before execution
                if r_date < d_date:
                    alerts.append(
                        RuleAlert(
                            rule_id=self.id,
                            severity=severity,
                            title_bn="সম্ভাব্য অসঙ্গতি, যাচাই প্রয়োজন",
                            reason_bn="দলিল সম্পাদনের পূর্বেই সাব-রেজিস্ট্রেশন সম্পন্ন দেখানো হয়েছে, যা কালানুক্রমিক অসঙ্গতি।",
                            evidence=[
                                AlertEvidence(
                                    source_type="deed",
                                    source_id=did,
                                    field="registered_date",
                                    value=r_date.isoformat(),
                                    document_ref=f"রেজিস্ট্রি তারিখ: {r_date.date()}",
                                ),
                                AlertEvidence(
                                    source_type="deed",
                                    source_id=did,
                                    field="deed_date",
                                    value=d_date.isoformat(),
                                    document_ref=f"সম্পাদন তারিখ: {d_date.date()}",
                                ),
                            ],
                        )
                    )

        # 2. Check Mutation Dates
        for m in ctx.mutations:
            mid = str(m.get("id") or m.get("case_no"))
            m_date = _parse_dt(m.get("mutation_date"))
            case_no = m.get("case_no", "অজ্ঞাত")
            m_deed_id = str(m.get("deed_id") or "")

            if m_date:
                # Future mutation date
                if m_date > now:
                    alerts.append(
                        RuleAlert(
                            rule_id=self.id,
                            severity=severity,
                            title_bn="সম্ভাব্য অসঙ্গতি, যাচাই প্রয়োজন",
                            reason_bn="নামজারির তারিখ বর্তমান সময়ের পরের হতে পারে না।",
                            evidence=[
                                AlertEvidence(
                                    source_type="mutation",
                                    source_id=mid,
                                    field="mutation_date",
                                    value=m_date.isoformat(),
                                    document_ref=f"নামজারি কেস {case_no}",
                                )
                            ],
                        )
                    )

                # Mutation prior to linked deed date
                if m_deed_id and m_deed_id in deed_map:
                    linked_deed = deed_map[m_deed_id]
                    ld_date = _parse_dt(linked_deed.get("deed_date"))
                    if ld_date and m_date < ld_date:
                        alerts.append(
                            RuleAlert(
                                rule_id=self.id,
                                severity=severity,
                                title_bn="সম্ভাব্য অসঙ্গতি, যাচাই প্রয়োজন",
                                reason_bn="সংযুক্ত মূল দলিল সম্পাদনের পূর্বেই নামজারি সম্পন্ন দেখানো হয়েছে।",
                                evidence=[
                                    AlertEvidence(
                                        source_type="mutation",
                                        source_id=mid,
                                        field="mutation_date",
                                        value=m_date.isoformat(),
                                        document_ref=f"নামজারি কেস {case_no}",
                                    ),
                                    AlertEvidence(
                                        source_type="deed",
                                        source_id=m_deed_id,
                                        field="deed_date",
                                        value=ld_date.isoformat(),
                                        document_ref=f"দলিল নং {linked_deed.get('deed_no')}",
                                    ),
                                ],
                            )
                        )

        return alerts
