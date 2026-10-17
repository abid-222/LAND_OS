"""
Unit Tests for Document Consistency Checker (Feature 5).
Verifies:
- Flags mismatches (document vs record)
- Flags missing fields
- Flags implausible values (dag number format/out of range, area outside range <= 0 or > 500 acres)
- Shows each issue with severity (CRITICAL, HIGH, MEDIUM, LOW, INFO)
"""

from app.modules.documents.verification import check_document_consistency


def test_consistency_checker_flags_missing_fields():
    doc_fields = {
        "party_names": "আব্দুল করিম",
    }
    issues = check_document_consistency(doc_fields)

    severities = {issue["field"]: issue["severity"] for issue in issues}
    issue_types = {issue["field"]: issue["issue_type"] for issue in issues}

    assert "dag_no" in severities
    assert severities["dag_no"] == "CRITICAL"
    assert issue_types["dag_no"] == "missing"

    assert "khatian_no" in severities
    assert severities["khatian_no"] == "HIGH"
    assert issue_types["khatian_no"] == "missing"

    assert "mouza" in severities
    assert severities["mouza"] == "HIGH"

    assert "area" in severities
    assert severities["area"] == "HIGH"


def test_consistency_checker_flags_implausible_dag_number():
    # 1. Non-numeric / malformed dag number
    doc_fields = {
        "dag_no": "ABC_INVALID",
        "khatian_no": "100",
        "mouza": "তেজগাঁও",
        "area": "0.33 একর",
    }
    issues = check_document_consistency(doc_fields, mouza_max_no=5000)
    dag_issues = [i for i in issues if i["field"] == "dag_no"]
    assert len(dag_issues) >= 1
    assert dag_issues[0]["issue_type"] == "implausible"
    assert dag_issues[0]["severity"] == "HIGH"

    # 2. Dag exceeding mouza maximum (e.g. 12345 when max is 5000)
    doc_fields_high = {
        "dag_no": "12345",
        "khatian_no": "100",
        "mouza": "তেজগাঁও",
        "area": "0.33 একর",
    }
    issues_high = check_document_consistency(doc_fields_high, mouza_max_no=5000)
    dag_issues_high = [i for i in issues_high if i["field"] == "dag_no"]
    assert len(dag_issues_high) >= 1
    assert dag_issues_high[0]["issue_type"] == "implausible"
    assert dag_issues_high[0]["severity"] == "HIGH"
    assert "স্বাভাবিক সীমা" in dag_issues_high[0]["message_bn"]


def test_consistency_checker_flags_implausible_area():
    # 1. Negative or zero area -> CRITICAL
    doc_fields_zero = {
        "dag_no": "105",
        "khatian_no": "20",
        "mouza": "জিনজিরা",
        "area": "-5 শতাংশ",
    }
    issues_zero = check_document_consistency(doc_fields_zero)
    area_issues = [i for i in issues_zero if i["field"] == "area"]
    assert len(area_issues) >= 1
    assert area_issues[0]["issue_type"] == "implausible"
    assert "শূন্য বা ঋণাত্মক" in area_issues[0]["message_bn"]

    # 2. Area > 500 acres -> CRITICAL
    doc_fields_massive = {
        "dag_no": "105",
        "khatian_no": "20",
        "mouza": "জিনজিরা",
        "area": "600 একর",
    }
    issues_massive = check_document_consistency(doc_fields_massive)
    area_massive_issues = [i for i in issues_massive if i["field"] == "area"]
    assert len(area_massive_issues) >= 1
    assert area_massive_issues[0]["severity"] == "CRITICAL"
    assert "অস্বাভাবিক রকমের বেশি" in area_massive_issues[0]["message_bn"]


def test_consistency_checker_flags_mismatches_against_record():
    doc_fields = {
        "dag_no": "999",  # Mismatch vs record 1205
        "khatian_no": "888",  # Mismatch vs record 340
        "mouza": "তেজগাঁও",
        "area": "100 শতাংশ",  # 100 vs 33 (severe mismatch)
        "party_names": "রহিম মোল্লা",  # Mismatch vs আব্দুল করিম
    }
    record_data = {
        "dag_no": "1205",
        "khatian_no": "340",
        "mouza": "তেজগাঁও",
        "area_acres": 0.33,
        "owner_names_bn": "আব্দুল করিম",
    }

    issues = check_document_consistency(doc_fields, record_data)
    mismatches = [i for i in issues if i["issue_type"] == "mismatch"]

    mismatch_fields = {m["field"]: m["severity"] for m in mismatches}
    assert "dag_no" in mismatch_fields
    assert mismatch_fields["dag_no"] == "CRITICAL"

    assert "khatian_no" in mismatch_fields
    assert mismatch_fields["khatian_no"] == "CRITICAL"

    assert "area" in mismatch_fields
    assert mismatch_fields["area"] in ("CRITICAL", "HIGH")

    assert "party_names" in mismatch_fields
    assert mismatch_fields["party_names"] == "HIGH"
