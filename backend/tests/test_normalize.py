import json
import os

import pytest

from app.core.normalize import normalize_identifier, normalize_mouza

CASES_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../../data/normalize_cases.json")
)


def load_normalize_cases():
    if not os.path.exists(CASES_PATH):
        pytest.skip(f"normalize_cases.json not found at {CASES_PATH}")
    with open(CASES_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


TEST_CASES = load_normalize_cases() if os.path.exists(CASES_PATH) else []


@pytest.mark.parametrize("case", TEST_CASES, ids=lambda c: c["id"])
def test_normalize_contract_cases(case):
    raw = case["raw"]
    expected_norm = case["expected_normalized"]
    expected_main = case["main_no"]
    expected_sub = case["sub_no"]

    res = normalize_identifier(raw, pattern_type="dag_no")

    assert res.normalized_value == expected_norm
    assert res.main_no == expected_main
    assert res.sub_no == expected_sub
    if expected_norm is not None:
        assert res.is_valid is True
    else:
        assert res.is_valid is False


def test_idempotency_all_valid_cases():
    for case in TEST_CASES:
        if case["expected_normalized"] is not None:
            first = normalize_identifier(case["raw"], pattern_type="dag_no")
            assert first.normalized_value is not None
            second = normalize_identifier(first.normalized_value, pattern_type="dag_no")
            assert second.normalized_value == first.normalized_value
            assert second.main_no == first.main_no
            assert second.sub_no == first.sub_no


def test_repaired_flag_and_confidence_penalty():
    res = normalize_identifier("O123", pattern_type="dag_no")
    assert res.normalized_value == "123"
    assert res.repaired is True
    assert res.status == "repaired"
    assert res.confidence < 1.0


def test_plausibility_flags():
    # Outside 1..99999
    res = normalize_identifier("12345", pattern_type="dag_no", mouza_max_no=5000)
    assert res.normalized_value == "12345"
    assert res.flagged is True
    assert res.flag_reason == "implausible"


def test_mouza_normalization_snap_and_ambiguity():
    known = ["জিনজিরা", "তেজগাঁও", "ধানমন্ডি"]

    # Alias collapse + exact
    res1 = normalize_mouza("জিনজিড়া", known_mouzas=known)
    assert res1.normalized_name == "জিনজিরা"
    assert res1.status == "valid"
    assert not res1.flagged

    # Unknown / ambiguous
    res2 = normalize_mouza("রংপুর", known_mouzas=known)
    assert res2.flagged is True
    assert res2.status == "flagged"
