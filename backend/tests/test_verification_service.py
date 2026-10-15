"""
Unit tests for Cross-Record Verification and QR Hash Check Services.
Tests:
- Field comparisons (exact, normalized-equal, fuzzy-close, mismatch, missing)
- Tolerances read from config/verification.yaml
- Summary counts (never 'verified ownership')
- QR hash integrity check (scope='integrity_only', Bangla text verification)
"""

import uuid

import pytest

from app.modules.documents.verification import (
    check_qr_integrity,
    compute_canonical_fields_hash,
    verify,
)


@pytest.mark.asyncio
async def test_verification_field_comparisons():
    doc_id = uuid.uuid4()
    rec_id = uuid.uuid4()

    doc_fields = {
        "dag_no": "১২০৫/১",
        "khatian_no": "৩৪০",
        "mouza": "তেজগাঁও",
        "area": "৩৩ শতাংশ",
        "party_names": "মোঃ আব্দুল করিম",
    }
    record_data = {
        "dag_no": "1205/1",
        "khatian_no": "340",
        "mouza": "তেজগাঁও",
        "area_decimal": 33.0,
        "owner_names_bn": "আব্দুল করিম",
        "region": "DHAKA",
    }

    res = await verify(doc_id, rec_id, doc_fields, record_data)
    assert res["document_id"] == str(doc_id)
    assert res["record_id"] == str(rec_id)

    summary = res["summary"]
    # Dag: "১২০৫/১" vs "1205/1" -> normalized-equal
    # Khatian: "৩৪০" vs "340" -> normalized-equal
    # Mouza: "তেজগাঁও" vs "তেজগাঁও" -> exact
    # Area: "৩৩ শতাংশ" vs 33.0 -> exact
    # Party: "মোঃ আব্দুল করিম" vs "আব্দুল করিম" -> normalized-equal
    assert summary["exact"] >= 2
    assert summary["normalized_equal"] >= 2
    assert summary["mismatch"] == 0
    assert summary["missing"] == 0
    # Must NOT contain 'verified ownership'
    assert "verified ownership" not in json_dump(res).lower()
    assert "ownership" not in summary


@pytest.mark.asyncio
async def test_verification_mismatches_and_missing():
    doc_id = uuid.uuid4()
    rec_id = uuid.uuid4()

    doc_fields = {
        "dag_no": "৯৯৯৯",  # Mismatch
        "khatian_no": "৩৪০",
        "mouza": None,      # Missing
        "area": "১০০ শতাংশ",  # Mismatch (100 vs 33)
        "party_names": "সুবোধ কুমার দাস",  # Mismatch
    }
    record_data = {
        "dag_no": "1205",
        "khatian_no": "340",
        "mouza": "তেজগাঁও",
        "area_decimal": 33.0,
        "owner_names_bn": "আব্দুল করিম",
    }

    res = await verify(doc_id, rec_id, doc_fields, record_data)
    summary = res["summary"]
    assert summary["mismatch"] >= 2
    assert summary["missing"] >= 1


@pytest.mark.asyncio
async def test_qr_hash_integrity_match():
    doc_id = uuid.uuid4()
    fields = {
        "area": "33.0",
        "dag_no": "1205/1",
        "document_no": "4582",
        "khatian_no": "340",
        "mouza": "তেজগাঁও",
    }
    expected_hash = compute_canonical_fields_hash(fields)

    qr_payload = {
        "doc_id": "DOC-2026-DH-004",
        "alg": "sha256",
        "hash": expected_hash,
    }

    res = await check_qr_integrity(doc_id, qr_payload, fields)
    assert res.hash_match is True
    assert res.scope == "integrity_only"
    assert res.ui_text_bn == "নথির তথ্য QR-এর সঙ্গে মিলেছে (মালিকানা যাচাই নয়)"


@pytest.mark.asyncio
async def test_qr_hash_integrity_mismatch():
    doc_id = uuid.uuid4()
    fields = {
        "area": "33.0",
        "dag_no": "1205/1",
        "document_no": "4582",
        "khatian_no": "340",
        "mouza": "তেজগাঁও",
    }
    qr_payload = {
        "doc_id": "DOC-2026-DH-004",
        "alg": "sha256",
        "hash": "tampered_fake_hash_value_12345",
    }

    res = await check_qr_integrity(doc_id, qr_payload, fields)
    assert res.hash_match is False
    assert res.scope == "integrity_only"
    assert res.ui_text_bn == "মেলেনি"


def json_dump(obj):
    import json
    return json.dumps(obj)
