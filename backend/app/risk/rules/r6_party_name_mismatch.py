"""
Rule R6: Party Name Mismatch Detector
Flags fuzzy discrepancies between parties mentioned on linked documents, registered deeds, and baseline land records.
"""

import os
from typing import Any, Dict, List

import yaml

from app.core.normalize import fuzzy_compare_names
from app.risk.rules.base import AlertEvidence, BaseRiskRule, ParcelContext, RuleAlert


def _load_r6_config() -> Dict[str, Any]:
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
                    return data.get("rules", {}).get("R6_party_name_mismatch", {})
            except Exception:
                pass
    return {"name_similarity_threshold": 80.0, "severity": "warn"}


class PartyNameMismatchRule(BaseRiskRule):
    id = "R6_party_name_mismatch"
    description = "Detects fuzzy name mismatches between document parties, deed parties, and record owners."

    def run(self, ctx: ParcelContext) -> List[RuleAlert]:
        alerts: List[RuleAlert] = []
        cfg = _load_r6_config()
        threshold = cfg.get("name_similarity_threshold", 80.0)
        severity = cfg.get("severity", "warn")

        # Baseline record owner
        rec_owners = ""
        if ctx.record:
            rec_owners = str(ctx.record.get("owner_names_bn") or ctx.record.get("owner") or "").strip()

        # Check linked documents against record / deeds
        for doc in ctx.documents:
            doc_id = str(doc.get("id") or doc.get("document_id") or "doc")
            doc_owner = str(doc.get("owner") or doc.get("buyer") or doc.get("seller") or "").strip()
            doc_type = doc.get("doc_type", "দলিল/খতিয়ান")

            if not doc_owner:
                continue

            # Compare doc owner against baseline record
            if rec_owners:
                sim = fuzzy_compare_names(doc_owner, rec_owners)
                if sim < threshold:
                    alerts.append(
                        RuleAlert(
                            rule_id=self.id,
                            severity=severity,
                            title_bn="সম্ভাব্য অসঙ্গতি, যাচাই প্রয়োজন",
                            reason_bn=(
                                f"আপলোডকৃত নথির পক্ষের নাম ({doc_owner}) এবং মূল খতিয়ান রেকর্ডের মালিকের "
                                f"নামের ({rec_owners}) মধ্যে উল্লেখযোগ্য গরমিল রয়েছে (সাদৃশ্য {sim:.0f}%, প্রত্যাশিত {threshold:.0f}%)।"
                            ),
                            evidence=[
                                AlertEvidence(
                                    source_type="document",
                                    source_id=doc_id,
                                    field="party_name",
                                    value=doc_owner,
                                    document_ref=f"নথি ({doc_type})",
                                ),
                                AlertEvidence(
                                    source_type="land_record",
                                    source_id=ctx.parcel_id,
                                    field="owner_names_bn",
                                    value=rec_owners,
                                    document_ref=f"খতিয়ান রেকর্ড (দাগ {ctx.main_no})",
                                ),
                            ],
                        )
                    )

            # Compare doc seller/buyer against latest deed
            if ctx.deeds:
                latest_deed = ctx.deeds[-1]
                deed_buyer = str(latest_deed.get("buyer", "")).strip()
                deed_id = str(latest_deed.get("id") or latest_deed.get("deed_no"))
                d_no = latest_deed.get("deed_no", "অজ্ঞাত")

                if deed_buyer and doc.get("seller"):
                    seller_doc = str(doc.get("seller")).strip()
                    sim_deed = fuzzy_compare_names(seller_doc, deed_buyer)
                    if sim_deed < threshold:
                        alerts.append(
                            RuleAlert(
                                rule_id=self.id,
                                severity=severity,
                                title_bn="সম্ভাব্য অসঙ্গতি, যাচাই প্রয়োজন",
                                reason_bn=(
                                    f"নথির বিক্রেতার নাম ({seller_doc}) এবং পূর্ববর্তী দলিলের ক্রেতার "
                                    f"নামের ({deed_buyer}) মধ্যে গরমিল রয়েছে (সাদৃশ্য {sim_deed:.0f}%)।"
                                ),
                                evidence=[
                                    AlertEvidence(
                                        source_type="document",
                                        source_id=doc_id,
                                        field="seller",
                                        value=seller_doc,
                                        document_ref=f"নথি ({doc_type})",
                                    ),
                                    AlertEvidence(
                                        source_type="deed",
                                        source_id=deed_id,
                                        field="buyer",
                                        value=deed_buyer,
                                        document_ref=f"দলিল নং {d_no}",
                                    ),
                                ],
                            )
                        )

        return alerts
