"""
Unit tests for Name and Area Normalization in Bangladesh LandOS.
Tests cover:
- Bangla honorific stripping, zero-width chars, punctuation, NFC normalization.
- Name fuzzy comparison using token-sort ratio.
- Area parsing with Bangla and ASCII digits.
- Well-defined unit conversion (decimal, acre, sq ft, sq m).
- Regional unit conversion via config/area_units.yaml per region.
- Flagging 'unit needs region' when region is missing or unmapped.
- Idempotency guarantees: normalize(normalize(x)) == normalize(x).
"""

import pytest

from app.core.normalize import (
    fuzzy_compare_names,
    normalize_area,
    normalize_name,
)

# ==============================================================================
# NAME NORMALIZATION TESTS (15+ cases)
# ==============================================================================

@pytest.mark.parametrize(
    "raw_name,expected_normalized,expected_honorific",
    [
        ("মোঃ আব্দুল করিম", "আব্দুল করিম", "মোঃ"),
        ("মো: রফিকুল ইসলাম", "রফিকুল ইসলাম", "মো:"),
        ("মোহাম্মদ জসীম উদ্দীন", "জসীম উদ্দীন", "মোহাম্মদ"),
        ("মোছাঃ ফাতেমা খাতুন", "ফাতেমা খাতুন", "মোছাঃ"),
        ("মোছা: রহিমা বেগম", "রহিমা বেগম", "মোছা:"),
        ("মোসাম্মৎ আয়েশা সিদ্দিকা", "আয়েশা সিদ্দিকা", "মোসাম্মৎ"),
        ("শ্রী সুবোধ কুমার দাস", "সুবোধ কুমার দাস", "শ্রী"),
        ("শ্রীমতি অঞ্জলি রানী", "অঞ্জলি রানী", "শ্রীমতি"),
        ("ড. মোঃ আমিনুল হক", "আমিনুল হক", "ড."),
        ("প্রফেসর ড. রফিকুল ইসলাম", "রফিকুল ইসলাম", "প্রফেসর"),
        ("আলহাজ্ব শেখ মোহাম্মদ আলী", "শেখ মোহাম্মদ আলী", "আলহাজ্ব"),
        ("মরহুম হাজী আকমল হোসেন", "আকমল হোসেন", "মরহুম"),
        ("ইঞ্জি: তানভীর আহমেদ", "তানভীর আহমেদ", "ইঞ্জি:"),
        ("জনাব মোজাম্মেল হক", "মোজাম্মেল হক", "জনাব"),
        ("বেগম রোকয়া সাখাওয়াত", "রোকয়া সাখাওয়াত", "বেগম"),
    ],
)
def test_name_honorific_stripping(raw_name, expected_normalized, expected_honorific):
    res = normalize_name(raw_name)
    import unicodedata
    assert res.normalized_name == unicodedata.normalize("NFC", expected_normalized)
    assert expected_honorific in res.stripped_honorifics
    assert res.confidence >= 0.90
    assert not res.is_empty


def test_name_zero_width_and_punctuation():
    # Embedded zero-width characters and punctuation: "মোঃ\u200B কামাল\u200C উদ্দিন, (মালিক)"
    raw = "মোঃ\u200b কামাল\u200c উদ্দিন, (মালিক)"
    res = normalize_name(raw)
    assert res.normalized_name == "কামাল উদ্দিন মালিক"
    assert "মোঃ" in res.stripped_honorifics


def test_name_idempotency():
    name = "মোঃ রফিকুল ইসলাম"
    res1 = normalize_name(name)
    res2 = normalize_name(res1.normalized_name)
    assert res1.normalized_name == res2.normalized_name


def test_name_empty_and_none():
    assert normalize_name("").is_empty
    assert normalize_name(None).is_empty
    assert normalize_name("   \u200b  ").is_empty


def test_name_fuzzy_comparison():
    # Exact after normalization
    assert fuzzy_compare_names("মোঃ আব্দুল করিম", "আব্দুল করিম") == 100.0
    # Token reordering (token sort ratio)
    score = fuzzy_compare_names("করিম আব্দুল", "আব্দুল করিম")
    assert score == 100.0
    # Minor spelling variation
    score_close = fuzzy_compare_names("মোঃ রফিকুল ইসলাম", "রফিকুল ইসলাম চৌধুরী")
    assert score_close >= 75.0
    # Disparate names
    assert fuzzy_compare_names("আব্দুল করিম", "সুবোধ কুমার") < 40.0


# ==============================================================================
# AREA NORMALIZATION & UNIT CONVERSION TESTS (20+ cases)
# ==============================================================================

@pytest.mark.parametrize(
    "raw_input,expected_val,expected_unit,expected_decimal",
    [
        # Well-defined: Decimal / শতাংশ
        ("৩৩ শতাংশ", 33.0, "শতাংশ", 33.0),
        ("১০.৫ শতক", 10.5, "শতক", 10.5),
        ("50 decimal", 50.0, "decimal", 50.0),
        ("১২.২৫ ডেসিমাল", 12.25, "ডেসিমাল", 12.25),
        # Well-defined: Acre / একর (1 acre = 100 decimal)
        ("১ একর", 1.0, "একর", 100.0),
        ("০.৫ একর", 0.5, "একর", 50.0),
        ("2.5 acre", 2.5, "acre", 250.0),
        ("১/২ একর", 0.5, "একর", 50.0),
        # Well-defined: Square feet (435.6 sq ft = 1 decimal)
        ("৪৩৫.৬ বর্গফুট", 435.6, "বর্গফুট", 1.0),
        ("871.2 sq ft", 871.2, "sq ft", 2.0),
    ],
)
def test_well_defined_area_conversions(raw_input, expected_val, expected_unit, expected_decimal):
    res = normalize_area(raw_input)
    assert res.parsed_value == pytest.approx(expected_val, abs=1e-3)
    assert res.original_unit == expected_unit
    assert res.area_decimal == pytest.approx(expected_decimal, abs=1e-2)
    assert not res.flagged
    assert res.converted


@pytest.mark.parametrize(
    "raw_input,region,expected_decimal",
    [
        # Dhaka region (1 bigha = 33 decimal, 1 katha = 1.65 decimal, 1 ganda = 0.0825 decimal)
        ("১ বিঘা", "DHAKA", 33.0),
        ("২ বিঘা", "dhaka", 66.0),
        ("১০ কাঠা", "DHAKA", 16.5),
        ("২০ কাঠা", "DHAKA", 33.0),
        ("৪ গণ্ডা", "DHAKA", 0.33),
        # Chittagong region (1 kani = 40 decimal)
        ("১ কানি", "CHITTAGONG", 40.0),
        ("০.৫ কানি", "chittagong", 20.0),
        # Rajshahi region (1 bigha = 33 decimal)
        ("৩ বিঘা", "RAJSHAHI", 99.0),
        # Sylhet region (1 kani = 40 decimal)
        ("২ কানি", "SYLHET", 80.0),
    ],
)
def test_regional_area_conversions_with_valid_region(raw_input, region, expected_decimal):
    res = normalize_area(raw_input, region_code=region)
    assert res.converted is True
    assert not res.flagged
    assert res.area_decimal == pytest.approx(expected_decimal, abs=1e-2)
    assert res.status == "converted"


@pytest.mark.parametrize(
    "raw_input",
    [
        "১ বিঘা",
        "১০ কাঠা",
        "৫ গণ্ডা",
        "২ কানি",
        "5 bigha",
        "20 katha",
    ],
)
def test_regional_area_without_region_flags_unit_needs_region(raw_input):
    res = normalize_area(raw_input, region_code=None)
    assert res.converted is False
    assert res.area_decimal is None
    assert res.flagged is True
    assert res.flag_reason == "unit needs region"
    assert res.status == "needs_region"


def test_area_idempotency():
    res1 = normalize_area("১ একর")
    res2 = normalize_area(res1)
    assert res1.area_decimal == res2.area_decimal
    assert res1.parsed_value == res2.parsed_value
    assert res1.original_unit == res2.original_unit


def test_area_empty_and_invalid():
    res_empty = normalize_area("")
    assert res_empty.status == "invalid"
    assert res_empty.flagged is True

    res_none = normalize_area(None)
    assert res_none.status == "invalid"

    res_no_num = normalize_area("শুধু জমি")
    assert res_no_num.status == "invalid"
    assert res_no_num.flag_reason == "no_numeric_area"
