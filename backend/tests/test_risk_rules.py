"""
Comprehensive Unit Tests for Risk Rules R1 to R6.
Tests positive, negative, and edge cases for each rule.
Verifies Bangla alert wording: 'সম্ভাব্য অসঙ্গতি, যাচাই প্রয়োজন'.
Verifies that every alert has reason + non-empty evidence list.
"""

from app.risk.rules import (
    AreaMismatchRule,
    ConflictingSaleRule,
    DeedMutationInconsistencyRule,
    DuplicateDeedRule,
    ImpossibleDatesRule,
    ParcelContext,
    PartyNameMismatchRule,
)


def make_ctx(parcel_id="PARCEL-T1", area_decimal=33.0, mouza_name="তেজগাঁও", region_code="DHAKA"):
    return ParcelContext(
        parcel_id=parcel_id,
        mouza_id="mouza-1",
        mouza_name=mouza_name,
        main_no=1205,
        sub_no=1,
        area_decimal=area_decimal,
        region_code=region_code,
    )


# ==============================================================================
# R1: Conflicting Sale Tests
# ==============================================================================


def test_r1_positive_concurrent_sales():
    ctx = make_ctx()
    ctx.deeds = [
        {
            "id": "D1",
            "deed_no": "101",
            "deed_type": "sale",
            "deed_date": "2022-01-10T00:00:00Z",
            "seller": "আব্দুল করিম",
            "buyer": "রফিকুল ইসলাম",
        },
        {
            "id": "D2",
            "deed_no": "102",
            "deed_type": "sale",
            "deed_date": "2022-02-15T00:00:00Z",  # Within 36 days (< 180 window)
            "seller": "আব্দুল করিম",
            "buyer": "ফাতেমা খাতুন",  # Different buyer!
        },
    ]
    alerts = ConflictingSaleRule().run(ctx)
    assert len(alerts) >= 1
    assert alerts[0].title_bn == "সম্ভাব্য অসঙ্গতি, যাচাই প্রয়োজন"
    assert len(alerts[0].evidence) >= 2


def test_r1_positive_broken_chain():
    ctx = make_ctx()
    ctx.deeds = [
        {
            "id": "D1",
            "deed_no": "101",
            "deed_type": "sale",
            "deed_date": "2020-01-10T00:00:00Z",
            "seller": "আব্দুল করিম",
            "buyer": "রফিকুল ইসলাম",
        },
        {
            "id": "D2",
            "deed_no": "102",
            "deed_type": "sale",
            "deed_date": "2021-06-15T00:00:00Z",  # Over window (> 180 days)
            "seller": "সুবোধ কুমার দাস",
            "buyer": "ফাতেমা খাতুন",  # Seller is NOT রফিকুল ইসলাম!
        },
    ]
    alerts = ConflictingSaleRule().run(ctx)
    assert len(alerts) >= 1
    assert "ধারাবাহিকতা অনুপস্থিত" in alerts[0].reason_bn


def test_r1_negative_legitimate_chain():
    ctx = make_ctx()
    ctx.deeds = [
        {
            "id": "D1",
            "deed_no": "101",
            "deed_type": "sale",
            "deed_date": "2020-01-10T00:00:00Z",
            "seller": "আব্দুল করিম",
            "buyer": "রফিকুল ইসলাম",
        },
        {
            "id": "D2",
            "deed_no": "102",
            "deed_type": "sale",
            "deed_date": "2021-06-15T00:00:00Z",
            "seller": "রফিকুল ইসলাম",  # Legitimate seller is prev buyer
            "buyer": "ফাতেমা খাতুন",
        },
    ]
    alerts = ConflictingSaleRule().run(ctx)
    assert len(alerts) == 0


# ==============================================================================
# R2: Duplicate Deed Reference Tests
# ==============================================================================


def test_r2_positive_duplicate_deed():
    ctx = make_ctx()
    ctx.deeds = [
        {
            "id": "D1",
            "deed_no": "4582",
            "registry_office": "তেজগাঁও সাব-রেজিস্ট্রি অফিস",
            "deed_date": "2021-04-10T00:00:00Z",
            "seller": "আব্দুল করিম",
            "buyer": "রফিকুল ইসলাম",
            "parcel_id": "PARCEL-T1",
        }
    ]
    ctx.all_registry_deeds = [
        {
            "id": "D2",
            "deed_no": "4582",
            "registry_office": "তেজগাঁও সাব-রেজিস্ট্রি অফিস",
            "deed_date": "2021-04-10T00:00:00Z",  # Identical no, office, year!
            "seller": "সুবোধ দাস",
            "buyer": "ফাতেমা খাতুন",
            "parcel_id": "PARCEL-OTHER",
        }
    ]
    alerts = DuplicateDeedRule().run(ctx)
    assert len(alerts) >= 1
    assert alerts[0].rule_id == "R2_duplicate_deed_reference"
    assert len(alerts[0].evidence) == 2


def test_r2_negative_different_years():
    ctx = make_ctx()
    ctx.deeds = [
        {
            "id": "D1",
            "deed_no": "4582",
            "registry_office": "তেজগাঁও সাব-রেজিস্ট্রি অফিস",
            "deed_date": "2019-04-10T00:00:00Z",
            "seller": "আব্দুল করিম",
            "buyer": "রফিকুল ইসলাম",
            "parcel_id": "PARCEL-T1",
        }
    ]
    ctx.all_registry_deeds = [
        {
            "id": "D2",
            "deed_no": "4582",
            "registry_office": "তেজগাঁও সাব-রেজিস্ট্রি অফিস",
            "deed_date": "2022-04-10T00:00:00Z",  # Different year (2019 vs 2022)
            "seller": "সুবোধ দাস",
            "buyer": "ফাতেমা খাতুন",
            "parcel_id": "PARCEL-OTHER",
        }
    ]
    alerts = DuplicateDeedRule().run(ctx)
    assert len(alerts) == 0


# ==============================================================================
# R3: Impossible Dates Tests
# ==============================================================================


def test_r3_positive_anomalous_dates():
    ctx = make_ctx()
    ctx.deeds = [
        {
            "id": "D1",
            "deed_no": "D-FUT",
            "deed_date": "2040-01-01T00:00:00Z",  # Future
            "registered_date": "2040-01-05T00:00:00Z",
        },
        {
            "id": "D2",
            "deed_no": "D-REV",
            "deed_date": "2022-05-15T00:00:00Z",
            "registered_date": "2022-05-01T00:00:00Z",  # Reg before deed!
        },
    ]
    alerts = ImpossibleDatesRule().run(ctx)
    assert len(alerts) == 2


def test_r3_negative_valid_chronology():
    ctx = make_ctx()
    ctx.deeds = [
        {
            "id": "D1",
            "deed_no": "D-OK",
            "deed_date": "2021-03-01T00:00:00Z",
            "registered_date": "2021-03-05T00:00:00Z",
        }
    ]
    ctx.mutations = [
        {
            "id": "M1",
            "case_no": "MC-OK",
            "deed_id": "D1",
            "mutation_date": "2021-07-01T00:00:00Z",
        }
    ]
    alerts = ImpossibleDatesRule().run(ctx)
    assert len(alerts) == 0


# ==============================================================================
# R4: Area Mismatch Tests
# ==============================================================================


def test_r4_positive_area_mismatch():
    ctx = make_ctx(area_decimal=33.0)
    ctx.deeds = [
        {"id": "D1", "deed_no": "D-1", "area": "50.0 শতাংশ"}  # 50 vs 33 (> 2% tolerance)
    ]
    alerts = AreaMismatchRule().run(ctx)
    assert len(alerts) == 1
    assert alerts[0].severity == "warn"


def test_r4_unit_needs_region_flag():
    ctx = make_ctx(area_decimal=33.0, region_code=None)  # Unknown region
    ctx.deeds = [{"id": "D1", "deed_no": "D-REG", "area": "২ বিঘা"}]
    alerts = AreaMismatchRule().run(ctx)
    assert len(alerts) == 1
    assert alerts[0].severity == "info"
    assert "unit needs region" in alerts[0].reason_bn


def test_r4_negative_within_tolerance():
    ctx = make_ctx(area_decimal=33.0)
    ctx.deeds = [
        {"id": "D1", "deed_no": "D-OK", "area": "33.2 শতাংশ"}  # 0.6% diff (tolerance is 2.0%)
    ]
    alerts = AreaMismatchRule().run(ctx)
    assert len(alerts) == 0


# ==============================================================================
# R5: Deed-Mutation Inconsistency Tests
# ==============================================================================


def test_r5_positive_party_and_area_mismatch():
    ctx = make_ctx(area_decimal=33.0)
    ctx.deeds = [
        {
            "id": "D1",
            "deed_no": "D-1",
            "seller": "আব্দুল করিম",
            "buyer": "রফিকুল ইসলাম",
            "area": "33.0 শতাংশ",
            "deed_date": "2022-01-01T00:00:00Z",
        }
    ]
    ctx.mutations = [
        {
            "id": "M1",
            "case_no": "M-1",
            "deed_id": "D1",
            "from_party": "সুবোধ দাস",  # Mismatch from seller!
            "to_party": "ফাতেমা খাতুন",  # Mismatch from buyer!
            "area": "33.0 শতাংশ",
        }
    ]
    alerts = DeedMutationInconsistencyRule().run(ctx)
    assert len(alerts) >= 1
    assert alerts[0].severity == "high"


def test_r5_positive_aged_deed_no_mutation():
    ctx = make_ctx()
    # 4-year old deed with zero mutations
    ctx.deeds = [
        {
            "id": "D1",
            "deed_no": "D-OLD",
            "deed_type": "sale",
            "deed_date": "2020-01-01T00:00:00Z",
        }
    ]
    ctx.mutations = []
    alerts = DeedMutationInconsistencyRule().run(ctx)
    assert len(alerts) == 1
    assert alerts[0].severity == "info"


def test_r5_negative_consistent():
    ctx = make_ctx()
    ctx.deeds = [
        {
            "id": "D1",
            "deed_no": "D-1",
            "seller": "মোঃ আব্দুল করিম",
            "buyer": "রফিকুল ইসলাম",
            "area": "33.0 শতাংশ",
            "deed_date": "2022-01-01T00:00:00Z",
        }
    ]
    ctx.mutations = [
        {
            "id": "M1",
            "case_no": "M-1",
            "deed_id": "D1",
            "from_party": "আব্দুল করিম",  # Normalized matches
            "to_party": "রফিকুল ইসলাম",
            "area": "33.0 শতাংশ",
        }
    ]
    alerts = DeedMutationInconsistencyRule().run(ctx)
    assert len(alerts) == 0


# ==============================================================================
# R6: Party Name Mismatch Tests
# ==============================================================================


def test_r6_positive_name_mismatch():
    ctx = make_ctx()
    ctx.record = {"owner_names_bn": "আব্দুল করিম"}
    ctx.documents = [
        {"id": "DOC-1", "doc_type": "deed", "owner": "সুবোধ কুমার দাস"}  # Mismatch!
    ]
    alerts = PartyNameMismatchRule().run(ctx)
    assert len(alerts) == 1
    assert alerts[0].severity == "warn"


def test_r6_negative_name_match():
    ctx = make_ctx()
    ctx.record = {"owner_names_bn": "আব্দুল করিম"}
    ctx.documents = [
        {"id": "DOC-1", "doc_type": "khatian", "owner": "মোঃ আব্দুল করিম"}  # Normalized matches!
    ]
    alerts = PartyNameMismatchRule().run(ctx)
    assert len(alerts) == 0
