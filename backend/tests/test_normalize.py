import json
import os

import pytest

from app.core.normalize import normalize_identifier

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
@pytest.mark.xfail(reason="Contract test: full normalization engine implemented in Prompt 4")
def test_normalize_contract_cases(case):
    raw = case["raw"]
    expected_norm = case["expected_normalized"]
    expected_main = case["main_no"]
    expected_sub = case["sub_no"]

    res = normalize_identifier(raw, pattern_type="dag_no")

    assert res.normalized_value == expected_norm
    assert res.main_no == expected_main
    assert res.sub_no == expected_sub
