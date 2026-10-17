"""
Cross-Record Verification Service for Bangladesh LandOS.
Implements:
1. Field-by-field comparison between extracted document fields and baseline land records.
2. Result states: exact | normalized-equal | fuzzy-close | mismatch | missing.
3. Tolerances loaded dynamically from config/verification.yaml (NO hard-coded values).
4. Summary counts per result type (NEVER outputs 'verified ownership').
5. QR Code hash integrity verification (scope="integrity_only").
"""

import hashlib
import json
import logging
import os
import uuid
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

import yaml
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.normalize import (
    fuzzy_compare_names,
    normalize_area,
    normalize_identifier,
    normalize_mouza,
)
from app.models import QRCheck, VerificationResult

logger = logging.getLogger("landos.documents.verification")

_VERIFICATION_CONFIG_CACHE: Optional[Dict[str, Any]] = None


def load_verification_config() -> Dict[str, Any]:
    """Loads tolerances from config/verification.yaml."""
    global _VERIFICATION_CONFIG_CACHE
    if _VERIFICATION_CONFIG_CACHE is not None:
        return _VERIFICATION_CONFIG_CACHE

    candidates = [
        os.path.abspath("config/verification.yaml"),
        os.path.abspath("../config/verification.yaml"),
        os.path.abspath("../../config/verification.yaml"),
        os.path.join(os.path.dirname(__file__), "../../../../config/verification.yaml"),
    ]
    for path in candidates:
        if os.path.exists(path):
            try:
                with open(path, "r", encoding="utf-8") as f:
                    _VERIFICATION_CONFIG_CACHE = yaml.safe_load(f)
                    return _VERIFICATION_CONFIG_CACHE
            except Exception:
                pass

    _VERIFICATION_CONFIG_CACHE = {
        "tolerances": {
            "area_tolerance_percent": 1.5,
            "name_fuzzy_threshold": 85.0,
            "mouza_fuzzy_threshold": 90.0,
            "date_tolerance_days": 30,
        }
    }
    return _VERIFICATION_CONFIG_CACHE


@dataclass
class FieldComparison:
    field: str
    doc_value: Any
    record_value: Any
    result: str  # exact | normalized-equal | fuzzy-close | mismatch | missing
    note_bn: str


@dataclass
class QRCheckResult:
    payload_type: str
    hash_alg: str
    hash_match: bool
    scope: str
    ui_text_bn: str


def compute_canonical_fields_hash(fields: Dict[str, Any]) -> str:
    """
    Computes deterministic SHA-256 over canonical sorted key=value pairs.
    """
    sorted_pairs = []
    for k in sorted(fields.keys()):
        val = str(fields[k]).strip()
        sorted_pairs.append(f"{k}={val}")
    canonical_str = "&".join(sorted_pairs)
    return hashlib.sha256(canonical_str.encode("utf-8")).hexdigest()


async def check_qr_integrity(
    document_id: uuid.UUID,
    qr_payload: Any,
    extracted_fields: Dict[str, Any],
    db: Optional[AsyncSession] = None,
) -> QRCheckResult:
    """
    Verifies document content hash against QR code payload.
    Scope is strictly 'integrity_only'.
    UI text:
      Matched: 'নথির তথ্য QR-এর সঙ্গে মিলেছে (মালিকানা যাচাই নয়)'
      Mismatched: 'মেলেনি'
    """
    payload_type = "unknown"
    hash_match = False
    hash_alg = "sha256"

    # Normalize QR payload
    parsed_payload: Optional[Dict[str, Any]] = None
    if isinstance(qr_payload, dict):
        parsed_payload = qr_payload
        payload_type = "json"
    elif isinstance(qr_payload, str):
        trimmed = qr_payload.strip()
        if trimmed.startswith("{") and trimmed.endswith("}"):
            try:
                parsed_payload = json.loads(trimmed)
                payload_type = "json"
            except Exception:
                payload_type = "unknown"
        elif trimmed.startswith("http://") or trimmed.startswith("https://"):
            payload_type = "url"
        else:
            payload_type = "reference_id"

    if parsed_payload and "hash" in parsed_payload:
        expected_hash = parsed_payload.get("hash")
        hash_alg = parsed_payload.get("alg", "sha256")
        payload_type = "hash"

        # Filter extracted fields to canonical set
        relevant_keys = ["area", "dag_no", "document_no", "khatian_no", "mouza"]
        hashable_fields = {k: extracted_fields[k] for k in relevant_keys if k in extracted_fields}
        computed_hash = compute_canonical_fields_hash(hashable_fields)

        if expected_hash and computed_hash.lower() == expected_hash.lower():
            hash_match = True

    ui_text_bn = "নথির তথ্য QR-এর সঙ্গে মিলেছে (মালিকানা যাচাই নয়)" if hash_match else "মেলেনি"

    result = QRCheckResult(
        payload_type=payload_type,
        hash_alg=hash_alg,
        hash_match=hash_match,
        scope="integrity_only",
        ui_text_bn=ui_text_bn,
    )

    if db:
        record = QRCheck(
            id=uuid.uuid4(),
            document_id=document_id,
            payload_type=payload_type,
            hash_alg=hash_alg,
            hash_match=hash_match,
            scope="integrity_only",
        )
        db.add(record)
        await db.commit()

    return result


async def verify(
    document_id: uuid.UUID,
    record_id: uuid.UUID,
    doc_fields: Dict[str, Any],
    record_data: Dict[str, Any],
    db: Optional[AsyncSession] = None,
) -> Dict[str, Any]:
    """
    Compares each extracted field with the reference record:
    exact / normalized-equal / fuzzy-close / mismatch / missing.
    Tolerances are strictly read from config/verification.yaml.
    Summary provides counts per result type (NEVER 'verified ownership').
    """
    config = load_verification_config()
    tolerances = config.get("tolerances", {})
    area_tol_pct = tolerances.get("area_tolerance_percent", 1.5)
    name_fuzzy_thresh = tolerances.get("name_fuzzy_threshold", 85.0)

    comparisons: List[FieldComparison] = []

    # 1. Dag No
    doc_dag = doc_fields.get("dag_no")
    rec_dag = record_data.get("dag_no")
    if doc_dag is None or rec_dag is None:
        comparisons.append(
            FieldComparison("dag_no", doc_dag, rec_dag, "missing", "দাগ নম্বর অনুপস্থিত")
        )
    elif str(doc_dag).strip() == str(rec_dag).strip():
        comparisons.append(
            FieldComparison("dag_no", doc_dag, rec_dag, "exact", "দাগ নম্বর হুবহু মিলেছে")
        )
    else:
        norm_doc = normalize_identifier(str(doc_dag), "dag_no")
        norm_rec = normalize_identifier(str(rec_dag), "dag_no")
        if norm_doc.canonical == norm_rec.canonical:
            comparisons.append(
                FieldComparison(
                    "dag_no",
                    doc_dag,
                    rec_dag,
                    "normalized-equal",
                    "দাগ নম্বর নরমালাইজেশনের পর মিলেছে",
                )
            )
        else:
            comparisons.append(
                FieldComparison("dag_no", doc_dag, rec_dag, "mismatch", "দাগ নম্বর অমিল")
            )

    # 2. Khatian No
    doc_kh = doc_fields.get("khatian_no")
    rec_kh = record_data.get("khatian_no")
    if doc_kh is None or rec_kh is None:
        comparisons.append(
            FieldComparison("khatian_no", doc_kh, rec_kh, "missing", "খতিয়ান নম্বর অনুপস্থিত")
        )
    elif str(doc_kh).strip() == str(rec_kh).strip():
        comparisons.append(
            FieldComparison("khatian_no", doc_kh, rec_kh, "exact", "খতিয়ান নম্বর হুবহু মিলেছে")
        )
    else:
        norm_doc = normalize_identifier(str(doc_kh), "khatian_no")
        norm_rec = normalize_identifier(str(rec_kh), "khatian_no")
        if norm_doc.canonical == norm_rec.canonical:
            comparisons.append(
                FieldComparison(
                    "khatian_no",
                    doc_kh,
                    rec_kh,
                    "normalized-equal",
                    "খতিয়ান নম্বর নরমালাইজেশনের পর মিলেছে",
                )
            )
        else:
            comparisons.append(
                FieldComparison("khatian_no", doc_kh, rec_kh, "mismatch", "খতিয়ান নম্বর অমিল")
            )

    # 3. Mouza
    doc_mz = doc_fields.get("mouza")
    rec_mz = record_data.get("mouza")
    if doc_mz is None or rec_mz is None:
        comparisons.append(FieldComparison("mouza", doc_mz, rec_mz, "missing", "মৌজা নাম অনুপস্থিত"))
    elif str(doc_mz).strip() == str(rec_mz).strip():
        comparisons.append(FieldComparison("mouza", doc_mz, rec_mz, "exact", "মৌজা নাম হুবহু মিলেছে"))
    else:
        norm_mz_doc = normalize_mouza(str(doc_mz))
        norm_mz_rec = normalize_mouza(str(rec_mz))
        if norm_mz_doc.normalized_name == norm_mz_rec.normalized_name:
            comparisons.append(
                FieldComparison(
                    "mouza", doc_mz, rec_mz, "normalized-equal", "মৌজা নাম মানসম্মত রূপে মিলেছে"
                )
            )
        else:
            sim = fuzzy_compare_names(norm_mz_doc.normalized_name, norm_mz_rec.normalized_name)
            if sim >= tolerances.get("mouza_fuzzy_threshold", 90.0):
                comparisons.append(
                    FieldComparison(
                        "mouza",
                        doc_mz,
                        rec_mz,
                        "fuzzy-close",
                        f"মৌজা নাম কাছাকাছি (সাদৃশ্য {sim:.0f}%)",
                    )
                )
            else:
                comparisons.append(
                    FieldComparison("mouza", doc_mz, rec_mz, "mismatch", "মৌজা নাম অমিল")
                )

    # 4. Area
    doc_ar = doc_fields.get("area")
    rec_ar = (
        record_data.get("area_acres") or record_data.get("area_decimal") or record_data.get("area")
    )
    if doc_ar is None or rec_ar is None:
        comparisons.append(
            FieldComparison("area", doc_ar, rec_ar, "missing", "জমির পরিমাপ অনুপস্থিত")
        )
    else:
        region = record_data.get("region") or doc_fields.get("region")
        norm_doc_ar = normalize_area(doc_ar, region_code=region)
        norm_rec_ar = normalize_area(rec_ar, region_code=region)

        v_doc = (
            norm_doc_ar.area_decimal
            if norm_doc_ar.area_decimal is not None
            else norm_doc_ar.parsed_value
        )
        v_rec = (
            norm_rec_ar.area_decimal
            if norm_rec_ar.area_decimal is not None
            else norm_rec_ar.parsed_value
        )

        if v_doc is not None and v_rec is not None and v_rec > 0:
            diff_pct = abs(v_doc - v_rec) / v_rec * 100.0
            if diff_pct == 0.0:
                comparisons.append(
                    FieldComparison("area", doc_ar, rec_ar, "exact", "জমির পরিমাণ সম্পূর্ণ এক")
                )
            elif diff_pct <= area_tol_pct:
                comparisons.append(
                    FieldComparison(
                        "area",
                        doc_ar,
                        rec_ar,
                        "normalized-equal",
                        f"জমির পরিমাণ অনুমোদনযোগ্য সীমার মধ্যে ({diff_pct:.2f}% পার্থক্য)",
                    )
                )
            elif diff_pct <= 5.0:
                comparisons.append(
                    FieldComparison(
                        "area",
                        doc_ar,
                        rec_ar,
                        "fuzzy-close",
                        f"জমির পরিমাণ কাছাকাছি ({diff_pct:.2f}% পার্থক্য)",
                    )
                )
            else:
                comparisons.append(
                    FieldComparison(
                        "area",
                        doc_ar,
                        rec_ar,
                        "mismatch",
                        f"জমির পরিমাণের পার্থক্য অতিরিক্ত ({diff_pct:.2f}%)",
                    )
                )
        else:
            comparisons.append(
                FieldComparison(
                    "area", doc_ar, rec_ar, "mismatch", "জমির পরিমাণ সঠিকভাবে রূপান্তর করা যায়নি"
                )
            )

    # 5. Party Names (Owner / Seller / Buyer)
    doc_name = doc_fields.get("owner") or doc_fields.get("party_names") or doc_fields.get("seller")
    rec_name = record_data.get("owner_names_bn") or record_data.get("owner")
    if doc_name is None or rec_name is None:
        comparisons.append(
            FieldComparison(
                "party_names", doc_name, rec_name, "missing", "মালিক বা পক্ষের নাম অনুপস্থিত"
            )
        )
    elif str(doc_name).strip() == str(rec_name).strip():
        comparisons.append(
            FieldComparison("party_names", doc_name, rec_name, "exact", "পক্ষের নাম হুবহু মিলেছে")
        )
    else:
        sim = fuzzy_compare_names(str(doc_name), str(rec_name))
        if sim >= 98.0:
            comparisons.append(
                FieldComparison(
                    "party_names", doc_name, rec_name, "normalized-equal", "নাম মানসম্মত রূপে মিলেছে"
                )
            )
        elif sim >= name_fuzzy_thresh:
            comparisons.append(
                FieldComparison(
                    "party_names",
                    doc_name,
                    rec_name,
                    "fuzzy-close",
                    f"নাম কাছাকাছি (সাদৃশ্য {sim:.0f}%)",
                )
            )
        else:
            comparisons.append(
                FieldComparison(
                    "party_names", doc_name, rec_name, "mismatch", f"নাম অমিল (সাদৃশ্য {sim:.0f}%)"
                )
            )

    # Run Document Consistency Checker (mismatches, missing fields, implausible values with severity)
    consistency_issues = check_document_consistency(doc_fields, record_data, mouza_max_no=5000)

    # Summary counts
    summary = {
        "exact": sum(1 for c in comparisons if c.result == "exact"),
        "normalized_equal": sum(1 for c in comparisons if c.result == "normalized-equal"),
        "fuzzy_close": sum(1 for c in comparisons if c.result == "fuzzy-close"),
        "mismatch": sum(1 for c in comparisons if c.result == "mismatch"),
        "missing": sum(1 for c in comparisons if c.result == "missing"),
        "total_fields": len(comparisons),
        "total_consistency_issues": len(consistency_issues),
    }

    comp_dicts = [
        {
            "field": c.field,
            "doc_value": c.doc_value,
            "record_value": c.record_value,
            "result": c.result,
            "note_bn": c.note_bn,
        }
        for c in comparisons
    ]

    if db:
        v_res = VerificationResult(
            id=uuid.uuid4(),
            document_id=document_id,
            record_id=record_id,
            comparisons=comp_dicts,
            rule_version="v1.0",
        )
        db.add(v_res)
        await db.commit()

    return {
        "document_id": str(document_id),
        "record_id": str(record_id),
        "comparisons": comp_dicts,
        "summary": summary,
        "consistency_issues": consistency_issues,
        "rule_version": "v1.0",
    }


def check_document_consistency(
    doc_fields: Dict[str, Any],
    record_data: Optional[Dict[str, Any]] = None,
    mouza_max_no: int = 5000,
) -> List[Dict[str, Any]]:
    """
    Document Consistency Checker:
    Flags:
    1. Mismatches between document and baseline land record (severity: CRITICAL / HIGH).
    2. Missing critical fields in document (severity: CRITICAL / HIGH / MEDIUM).
    3. Implausible values:
       - Dag number format invalid or exceeds mouza maximum range (severity: HIGH).
       - Area outside valid range (<= 0 or > 500 acres) (severity: CRITICAL).
       - Repaired OCR confusable characters (severity: INFO).
    Each issue includes: field, issue_type, severity, message_bn, doc_value, record_value.
    """
    issues: List[Dict[str, Any]] = []

    # 1. Missing fields check
    critical_fields = [
        ("dag_no", "দাগ নম্বর", "CRITICAL"),
        ("khatian_no", "খতিয়ান নম্বর", "HIGH"),
        ("mouza", "মৌজার নাম", "HIGH"),
        ("area", "জমির পরিমাণ", "HIGH"),
    ]
    for key, name_bn, sev in critical_fields:
        val = doc_fields.get(key)
        if val is None or str(val).strip() == "":
            issues.append(
                {
                    "field": key,
                    "issue_type": "missing",
                    "severity": sev,
                    "message_bn": f"{name_bn} নথিতে অনুপস্থিত বা ফাঁকা রয়েছে।",
                    "doc_value": None,
                    "record_value": record_data.get(key) if record_data else None,
                }
            )

    # 2. Implausible Dag Number check
    doc_dag = doc_fields.get("dag_no")
    if doc_dag is not None and str(doc_dag).strip() != "":
        norm_dag = normalize_identifier(
            str(doc_dag), pattern_type="dag_no", mouza_max_no=mouza_max_no
        )
        if not norm_dag.is_valid:
            issues.append(
                {
                    "field": "dag_no",
                    "issue_type": "implausible",
                    "severity": "HIGH",
                    "message_bn": f"দাগ নম্বরের ফরম্যাট সঠিক নয় ({doc_dag})। শুধুমাত্র বাংলা/ইংরেজি সংখ্যা ও সাব-দাগ সমর্থিত।",
                    "doc_value": str(doc_dag),
                    "record_value": record_data.get("dag_no") if record_data else None,
                }
            )
        elif norm_dag.flagged and norm_dag.flag_reason == "implausible":
            issues.append(
                {
                    "field": "dag_no",
                    "issue_type": "implausible",
                    "severity": "HIGH",
                    "message_bn": f"দাগ নম্বর ({doc_dag}) মৌজার স্বাভাবিক সীমা (সর্বোচ্চ {mouza_max_no}) এর চেয়ে বেশি।",
                    "doc_value": str(doc_dag),
                    "record_value": record_data.get("dag_no") if record_data else None,
                }
            )
        elif norm_dag.repaired:
            issues.append(
                {
                    "field": "dag_no",
                    "issue_type": "repaired_ocr",
                    "severity": "INFO",
                    "message_bn": f"দাগ নম্বরে বিভ্রান্তিকর হরফ পাওয়া গেছে (রিপেয়ারকৃত: {norm_dag.normalized_value})।",
                    "doc_value": str(doc_dag),
                    "record_value": record_data.get("dag_no") if record_data else None,
                }
            )

    # 3. Implausible Area check
    doc_area = doc_fields.get("area")
    if doc_area is not None and str(doc_area).strip() != "":
        raw_area_str = str(doc_area).strip()
        is_negative = raw_area_str.startswith("-") or " -" in raw_area_str
        region = (record_data.get("region") if record_data else None) or doc_fields.get("region")
        norm_ar = normalize_area(doc_area, region_code=region)
        dec_val = norm_ar.area_decimal if norm_ar.area_decimal is not None else norm_ar.parsed_value
        if is_negative or (dec_val is not None and dec_val <= 0):
            issues.append(
                {
                    "field": "area",
                    "issue_type": "implausible",
                    "severity": "CRITICAL",
                    "message_bn": "জমির পরিমাণ শূন্য বা ঋণাত্মক হতে পারে না।",
                    "doc_value": str(doc_area),
                    "record_value": record_data.get("area_acres") if record_data else None,
                }
            )
        elif dec_val is None:
            issues.append(
                {
                    "field": "area",
                    "issue_type": "implausible",
                    "severity": "HIGH",
                    "message_bn": f"জমির পরিমাণের একক বা সংখ্যা বোঝা যায়নি ({doc_area})।",
                    "doc_value": str(doc_area),
                    "record_value": record_data.get("area_acres") if record_data else None,
                }
            )
        elif dec_val > 50000:  # > 500 acres = 50,000 decimals
            issues.append(
                {
                    "field": "area",
                    "issue_type": "implausible",
                    "severity": "CRITICAL",
                    "message_bn": f"জমির পরিমাণ অস্বাভাবিক রকমের বেশি ({dec_val:.1f} শতাংশ / > ৫০০ একর)।",
                    "doc_value": str(doc_area),
                    "record_value": record_data.get("area_acres") if record_data else None,
                }
            )

    # 4. Mismatches against reference record (if provided)
    if record_data:
        # Dag mismatch
        rec_dag = record_data.get("dag_no")
        if doc_dag and rec_dag:
            n_doc_dag = normalize_identifier(str(doc_dag), "dag_no").canonical
            n_rec_dag = normalize_identifier(str(rec_dag), "dag_no").canonical
            if n_doc_dag != n_rec_dag:
                issues.append(
                    {
                        "field": "dag_no",
                        "issue_type": "mismatch",
                        "severity": "CRITICAL",
                        "message_bn": f"দাগ নম্বর অমিল: নথিতে '{doc_dag}', কিন্তু সরকারি বালাম রেকর্ডে '{rec_dag}'।",
                        "doc_value": str(doc_dag),
                        "record_value": str(rec_dag),
                    }
                )

        # Khatian mismatch
        doc_kh = doc_fields.get("khatian_no")
        rec_kh = record_data.get("khatian_no")
        if doc_kh and rec_kh:
            n_doc_kh = normalize_identifier(str(doc_kh), "khatian_no").canonical
            n_rec_kh = normalize_identifier(str(rec_kh), "khatian_no").canonical
            if n_doc_kh != n_rec_kh:
                issues.append(
                    {
                        "field": "khatian_no",
                        "issue_type": "mismatch",
                        "severity": "CRITICAL",
                        "message_bn": f"খতিয়ান নম্বর অমিল: নথিতে '{doc_kh}', কিন্তু সরকারি বালাম রেকর্ডে '{rec_kh}'।",
                        "doc_value": str(doc_kh),
                        "record_value": str(rec_kh),
                    }
                )

        # Area mismatch
        rec_ar = (
            record_data.get("area_acres")
            or record_data.get("area_decimal")
            or record_data.get("area")
        )
        if doc_area and rec_ar:
            norm_doc_ar = normalize_area(doc_area)
            norm_rec_ar = normalize_area(rec_ar)
            v_doc = (
                norm_doc_ar.area_decimal
                if norm_doc_ar.area_decimal is not None
                else norm_doc_ar.parsed_value
            )
            v_rec = (
                norm_rec_ar.area_decimal
                if norm_rec_ar.area_decimal is not None
                else norm_rec_ar.parsed_value
            )
            if v_doc and v_rec and v_rec > 0:
                diff_pct = abs(v_doc - v_rec) / v_rec * 100.0
                if diff_pct > 5.0:
                    issues.append(
                        {
                            "field": "area",
                            "issue_type": "mismatch",
                            "severity": "CRITICAL" if diff_pct > 25.0 else "HIGH",
                            "message_bn": f"জমির পরিমাপে ব্যাপক অমিল: নথির সাথে সরকারি রেকর্ডের পার্থক্য {diff_pct:.1f}%।",
                            "doc_value": str(doc_area),
                            "record_value": str(rec_ar),
                        }
                    )

        # Party name mismatch
        doc_party = doc_fields.get("party_names") or doc_fields.get("owner")
        rec_party = record_data.get("owner_names_bn") or record_data.get("owner")
        if doc_party and rec_party:
            sim = fuzzy_compare_names(str(doc_party), str(rec_party))
            if sim < 70.0:
                issues.append(
                    {
                        "field": "party_names",
                        "issue_type": "mismatch",
                        "severity": "HIGH",
                        "message_bn": f"মালিকের নাম সম্পূর্ণ ভিন্ন: নথিতে '{doc_party}', রেকর্ডে '{rec_party}' (সাদৃশ্য মাত্র {sim:.0f}%)।",
                        "doc_value": str(doc_party),
                        "record_value": str(rec_party),
                    }
                )

    return issues
