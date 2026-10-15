"""
Identifier Normalization Engine for Bangladesh LandOS.
Implements the exact pipeline for Dag, Khatian, Document identifiers and Mouza names:
1. Unicode NFC; strip zero-width chars; NBSP -> space
2. Strip label prefixes (e.g. দাগ নং, Dag:, etc.)
3. Map Bangla digits U+09E6..U+09EF to ASCII 0-9
4. Strip whitespace inside numeric identifiers; unify separators ( / \\ - . | । ) to /
5. OCR confusable repair (O/o->0, l/I/|/।->1, S->5, B->8) with repaired flag & confidence penalty
6. Strip leading zeros per numeric part
7. Validate with regex from config/identifier_patterns.yaml
8. Output NormalizedId / ParsedIdentifier
9. Plausibility check (soft flag outside 1..99999 or mouza limit)
Also includes Mouza normalization with alias collapse and rapidfuzz threshold snapping.
"""

import os
import re
import unicodedata
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

import yaml

# Zero-width characters to strip
ZERO_WIDTH_CHARS = {"\u200b", "\u200c", "\u200d", "\ufeff"}

# Bangla digits mapping: U+09E6 to U+09EF -> '0'..'9'
BANGLA_DIGITS_TRANS = str.maketrans("০১২৩৪৫৬৭৮৯", "0123456789")

# Separators unified to '/'
SEPARATOR_PATTERN = re.compile(r"[/\\.\-—|।]+")

# Prefix labels commonly found in OCR outputs
PREFIX_PATTERN = re.compile(
    r"^(?:দাগ\s*নং|খতিয়ান\s*নং|খতিয়ান\s*নং|দলিল\s*নং|দাগ|খতিয়ান|খতিয়ান|দলিল|"
    r"dag\s*no\.?|dag:|dag|khatian\s*no\.?|khatian:|khatian|নং[:\-\s]*|no\.?[:\s]*)\s*[:\-\.]*\s*",
    re.IGNORECASE,
)

# OCR confusable table when expecting digits
CONFUSABLE_MAP: Dict[str, str] = {
    "O": "0",
    "o": "0",
    "l": "1",
    "I": "1",
    "|": "1",
    "।": "1",
    "S": "5",
    "s": "5",
    "B": "8",
    "Z": "2",
    "z": "2",
}

DEFAULT_PATTERNS = {
    "dag_no": r"^(?P<main>\d{1,5})(?:/(?P<sub>\d{1,4}))?$",
    "khatian_no": r"^(?P<main>\d{1,6})(?:/(?P<sub>\d{1,3}))?$",
    "document_no": r"^(?P<main>\d{1,7})(?:/(?P<sub>\d{1,4}))?$",
}


def _load_patterns() -> Dict[str, str]:
    """Load regex patterns dynamically from config/identifier_patterns.yaml."""
    candidates = [
        os.path.abspath("config/identifier_patterns.yaml"),
        os.path.abspath("../config/identifier_patterns.yaml"),
        os.path.abspath("../../config/identifier_patterns.yaml"),
        os.path.join(os.path.dirname(__file__), "../../../config/identifier_patterns.yaml"),
    ]
    for path in candidates:
        if os.path.exists(path):
            try:
                with open(path, "r", encoding="utf-8") as f:
                    data = yaml.safe_load(f)
                    if data and "patterns" in data:
                        patterns = dict(DEFAULT_PATTERNS)
                        patterns.update(data["patterns"])
                        return patterns
            except Exception:
                pass
    return DEFAULT_PATTERNS


PATTERNS = _load_patterns()


@dataclass(frozen=True)
class ParsedIdentifier:
    raw_value: str
    normalized_value: Optional[str]
    main_no: Optional[int]
    sub_no: Optional[int]
    is_valid: bool
    repaired: bool = False
    confidence: float = 1.0
    status: str = "valid"
    flagged: bool = False
    flag_reason: Optional[str] = None

    @property
    def canonical(self) -> Optional[str]:
        return self.normalized_value

    @property
    def main(self) -> Optional[int]:
        return self.main_no

    @property
    def sub(self) -> Optional[int]:
        return self.sub_no


NormalizedId = ParsedIdentifier


def normalize_identifier(
    raw: str,
    pattern_type: str = "dag_no",
    mouza_max_no: Optional[int] = None,
    base_confidence: float = 1.0,
) -> ParsedIdentifier:
    """
    Normalizes a Dag, Khatian, or Document number following the strict 8-step pipeline.
    """
    if raw is None or not str(raw).strip():
        return ParsedIdentifier(
            raw_value=raw if raw is not None else "",
            normalized_value=None,
            main_no=None,
            sub_no=None,
            is_valid=False,
            confidence=0.0,
            status="invalid",
            flagged=True,
            flag_reason="EMPTY_INPUT",
        )

    # 1. Unicode NFC; delete zero-width chars; NBSP -> space
    text = unicodedata.normalize("NFC", str(raw))
    for zw in ZERO_WIDTH_CHARS:
        text = text.replace(zw, "")
    text = text.replace("\u00a0", " ").strip()

    if not text:
        return ParsedIdentifier(
            raw_value=raw,
            normalized_value=None,
            main_no=None,
            sub_no=None,
            is_valid=False,
            confidence=0.0,
            status="invalid",
            flagged=True,
            flag_reason="EMPTY_INPUT",
        )

    # Strip prefix labels (দাগ নং, খতিয়ান নং, etc.)
    text = PREFIX_PATTERN.sub("", text).strip()

    # 2. Map Bangla digits U+09E6..U+09EF to ASCII 0-9
    text = text.translate(BANGLA_DIGITS_TRANS)

    # 3. Unify separators ( / \ - . | । ) to "/" and strip ALL whitespace inside
    text = SEPARATOR_PATTERN.sub("/", text)
    # Remove any whitespace
    text = re.sub(r"\s+", "", text)

    # Strip trailing slash if present (e.g., '12/' -> '12')
    if text.endswith("/"):
        text = text.rstrip("/")

    # Check for empty after stripping
    if not text or text == "/":
        return ParsedIdentifier(
            raw_value=raw,
            normalized_value=None,
            main_no=None,
            sub_no=None,
            is_valid=False,
            confidence=0.0,
            status="invalid",
            flagged=True,
            flag_reason="INVALID_FORMAT",
        )

    # 4. OCR confusable repair ONLY where digits are expected
    repaired = False
    repaired_chars = 0
    clean_chars: List[str] = []

    for char in text:
        if char in "0123456789/":
            clean_chars.append(char)
        elif char in CONFUSABLE_MAP:
            clean_chars.append(CONFUSABLE_MAP[char])
            repaired = True
            repaired_chars += 1
        else:
            clean_chars.append(char)

    text = "".join(clean_chars)

    # 5. Strip leading zeros of each numeric part for matching, keeping raw untouched
    parts = text.split("/")
    if len(parts) > 2:
        # More than one separator is invalid for land identifiers
        return ParsedIdentifier(
            raw_value=raw,
            normalized_value=None,
            main_no=None,
            sub_no=None,
            is_valid=False,
            repaired=repaired,
            confidence=0.0,
            status="invalid",
            flagged=True,
            flag_reason="TOO_MANY_PARTS",
        )

    stripped_parts: List[str] = []
    for p in parts:
        # Check if digits only
        if re.match(r"^\d+$", p):
            stripped = p.lstrip("0")
            stripped_parts.append(stripped if stripped else "0")
        else:
            stripped_parts.append(p)

    normalized_candidate = "/".join(stripped_parts)

    # 6. Validate with regex
    pattern_str = PATTERNS.get(pattern_type, DEFAULT_PATTERNS.get(pattern_type, DEFAULT_PATTERNS["dag_no"]))
    match = re.match(pattern_str, normalized_candidate)

    if not match:
        return ParsedIdentifier(
            raw_value=raw,
            normalized_value=None,
            main_no=None,
            sub_no=None,
            is_valid=False,
            repaired=repaired,
            confidence=0.0,
            status="invalid",
            flagged=True,
            flag_reason="REGEX_MISMATCH",
        )

    # Extract main and sub
    main_val = int(match.group("main"))
    sub_val = int(match.group("sub")) if match.groupdict().get("sub") else None

    # Canonical string representation
    canonical = f"{main_val}/{sub_val}" if sub_val is not None else str(main_val)

    # 7. Plausibility check (soft flag, never auto-reject)
    flagged = False
    flag_reason = None
    if main_val < 1 or main_val > 99999 or (mouza_max_no and main_val > mouza_max_no):
        flagged = True
        flag_reason = "implausible"

    # Confidence computation
    confidence = base_confidence
    if repaired:
        confidence = max(0.5, confidence - (0.15 * repaired_chars))

    status = "repaired" if repaired else "valid"

    if status != "valid" or repaired or confidence < 0.80:
        flagged = True
        if not flag_reason:
            flag_reason = "LOW_CONFIDENCE_OR_REPAIRED"

    return ParsedIdentifier(
        raw_value=raw,
        normalized_value=canonical,
        main_no=main_val,
        sub_no=sub_val,
        is_valid=True,
        repaired=repaired,
        confidence=round(confidence, 2),
        status=status,
        flagged=flagged,
        flag_reason=flag_reason,
    )


# Common Mouza spelling aliases
MOUZA_ALIASES = {
    "জিনজিড়া": "জিনজিরা",
    "জিনজিরা": "জিনজিরা",
    "তেজগাঁও": "তেজগাঁও",
    "তেজগাও": "তেজগাঁও",
    "ধানমন্ডি": "ধানমন্ডি",
    "ধানমণ্ডি": "ধানমন্ডি",
    "গুলশান": "গুলশান",
    "গুলশাণ": "গুলশান",
    "মিরপুর": "মিরপুর",
    "মীরপুর": "মিরপুর",
    "উত্তরা": "উত্তরা",
    "মোহাম্মদপুর": "মোহাম্মদপুর",
    "মোহাম্মাদপুর": "মোহাম্মদপুর",
}


@dataclass(frozen=True)
class MouzaNormalized:
    raw_name: str
    normalized_name: str
    matched_mouza: Optional[str]
    confidence: float
    status: str
    flagged: bool
    flag_reason: Optional[str] = None


def normalize_mouza(
    raw: str,
    known_mouzas: Optional[List[str]] = None,
    alias_table: Optional[Dict[str, str]] = None,
) -> MouzaNormalized:
    """
    Mouza: NFC, trim punctuation, collapse spelling variants via alias table,
    then rapidfuzz snap only if best >= 90 AND the best is unique by >= 5 points;
    otherwise keep raw and flag.
    """
    if not raw or not raw.strip():
        return MouzaNormalized(
            raw_name=raw or "",
            normalized_name="",
            matched_mouza=None,
            confidence=0.0,
            status="invalid",
            flagged=True,
            flag_reason="EMPTY_MOUZA",
        )

    # 1. NFC, trim punctuation
    name = unicodedata.normalize("NFC", str(raw)).strip()
    name = re.sub(r"[\.,;:!\?\'\"।\-]+", "", name).strip()

    # 2. Alias table collapse with NFC keys
    raw_aliases = dict(MOUZA_ALIASES)
    if alias_table:
        raw_aliases.update(alias_table)
    aliases = {unicodedata.normalize("NFC", k): unicodedata.normalize("NFC", v) for k, v in raw_aliases.items()}
    collapsed = aliases.get(name, name)

    if not known_mouzas:
        return MouzaNormalized(
            raw_name=raw,
            normalized_name=collapsed,
            matched_mouza=collapsed,
            confidence=0.90,
            status="valid",
            flagged=False,
        )

    # 3. Rapidfuzz snap
    try:
        from rapidfuzz import fuzz, process

        results = process.extract(collapsed, known_mouzas, scorer=fuzz.ratio, limit=2)
        if results and len(results) >= 1:
            best_match, best_score, _ = results[0]
            if len(results) > 1:
                _, second_score, _ = results[1]
                margin = best_score - second_score
            else:
                margin = 100.0

            # Snap only if best >= 90 and best is unique by >= 5 points
            if best_score >= 90.0 and margin >= 5.0:
                return MouzaNormalized(
                    raw_name=raw,
                    normalized_name=best_match,
                    matched_mouza=best_match,
                    confidence=round(best_score / 100.0, 2),
                    status="valid",
                    flagged=False,
                )
    except ImportError:
        pass

    # Otherwise keep raw and flag
    return MouzaNormalized(
        raw_name=raw,
        normalized_name=collapsed,
        matched_mouza=None,
        confidence=0.60,
        status="flagged",
        flagged=True,
        flag_reason="AMBIGUOUS_MOUZA_SNAP",
    )


# ==============================================================================
# NAME NORMALIZATION & FUZZY COMPARISON (PART 1)
# ==============================================================================

@dataclass
class NormalizedName:
    raw_name: str
    normalized_name: str
    stripped_honorifics: List[str]
    confidence: float
    is_empty: bool = False


# Common Bangla honorific prefixes & titles
NAME_HONORIFICS = [
    "মোঃ", "মো:", "মোহাম্মদ", "মুহাম্মদ", "মোছাঃ", "মোছা:", "মোসাম্মৎ",
    "শ্রীমতি", "শ্রীমতী", "শ্রী", "বাবু", "জনাব", "জনাবা", "বেগম",
    "ড.", "ডক্টর", "প্রফেসর", "ইঞ্জি:", "ইঞ্জিনিয়ার", "অ্যাডভোকেট", "ব্যারিস্টার",
    "আলহাজ্ব", "আলহাজ", "হাজী", "মাওলানা", "মুফতি", "ক্বারী",
    "মৌলভী", "মরহুম", "লে.", "ক্যাপ্টেন", "মেজর"
]

# Punctuation to strip from personal names
NAME_PUNCTUATION_PATTERN = re.compile(r"[\.,\-—_:;!?'\"’‘\(\)\[\]\{\}\<\>/\\|।]+")


def normalize_name(name: Optional[str]) -> NormalizedName:
    """
    Normalizes a Bengali personal name:
    1. Unicode NFC normalization.
    2. Zero-width character and NBSP removal.
    3. Stripping of honorifics and titles (মোঃ, মোছা:, শ্রী, ড., etc.).
    4. Punctuation removal and whitespace collapsing.
    5. Retains raw text for audit and privacy protection.
    """
    if name is None or not str(name).strip():
        return NormalizedName(
            raw_name="" if name is None else str(name),
            normalized_name="",
            stripped_honorifics=[],
            confidence=0.0,
            is_empty=True,
        )

    raw = str(name)
    # 1. NFC and zero-width
    text = unicodedata.normalize("NFC", raw)
    for zw in ZERO_WIDTH_CHARS:
        text = text.replace(zw, "")
    text = text.replace("\u00a0", " ").strip()

    # 2. Tokenize and identify honorifics
    tokens = text.split()
    stripped_honorifics: List[str] = []
    cleaned_tokens: List[str] = []

    # Strip honorifics primarily from the prefix/title position
    stripping_prefix = True
    for token in tokens:
        clean_tok = NAME_PUNCTUATION_PATTERN.sub("", token).strip()
        is_honorific = False
        if stripping_prefix:
            for hon in NAME_HONORIFICS:
                clean_hon = NAME_PUNCTUATION_PATTERN.sub("", hon)
                if token == hon or clean_tok == clean_hon:
                    stripped_honorifics.append(token)
                    is_honorific = True
                    break
        if not is_honorific:
            stripping_prefix = False
            if clean_tok:
                cleaned_tokens.append(clean_tok)

    normalized_text = " ".join(cleaned_tokens).strip()

    # If all tokens were honorifics or punctuation, retain stripped tokens
    if not normalized_text and tokens:
        normalized_text = " ".join(NAME_PUNCTUATION_PATTERN.sub("", t) for t in tokens).strip()

    confidence = 0.95 if normalized_text else 0.0

    return NormalizedName(
        raw_name=raw,
        normalized_name=normalized_text,
        stripped_honorifics=stripped_honorifics,
        confidence=confidence,
        is_empty=(len(normalized_text) == 0),
    )


def fuzzy_compare_names(name1: Optional[str], name2: Optional[str]) -> float:
    """
    Fuzzy compares two names using token-sort ratio on normalized names.
    Returns similarity score in range 0.0 to 100.0.
    """
    n1 = normalize_name(name1).normalized_name
    n2 = normalize_name(name2).normalized_name

    if not n1 or not n2:
        return 0.0
    if n1 == n2:
        return 100.0

    try:
        from rapidfuzz import fuzz
        return float(fuzz.token_sort_ratio(n1, n2))
    except ImportError:
        # Fallback ratio if rapidfuzz not present
        from difflib import SequenceMatcher
        return round(SequenceMatcher(None, n1, n2).ratio() * 100.0, 2)


# ==============================================================================
# AREA NORMALIZATION & REGIONAL UNIT CONVERSION (PART 1)
# ==============================================================================

@dataclass
class NormalizedArea:
    raw_value: str
    parsed_value: Optional[float]
    original_unit: Optional[str]
    area_decimal: Optional[float]
    converted: bool
    flagged: bool
    flag_reason: Optional[str]
    status: str  # "valid" | "converted" | "needs_region" | "invalid"
    confidence: float


# Cached area units mapping
_AREA_UNITS_CACHE: Optional[Dict[str, Any]] = None


def _load_area_units() -> Dict[str, Any]:
    """Load regional area unit conversions dynamically from config/area_units.yaml."""
    global _AREA_UNITS_CACHE
    if _AREA_UNITS_CACHE is not None:
        return _AREA_UNITS_CACHE

    candidates = [
        os.path.abspath("config/area_units.yaml"),
        os.path.abspath("../config/area_units.yaml"),
        os.path.abspath("../../config/area_units.yaml"),
        os.path.join(os.path.dirname(__file__), "../../../config/area_units.yaml"),
    ]
    for path in candidates:
        if os.path.exists(path):
            try:
                with open(path, "r", encoding="utf-8") as f:
                    data = yaml.safe_load(f)
                    _AREA_UNITS_CACHE = data.get("regions", {})
                    return _AREA_UNITS_CACHE
            except Exception:
                pass

    _AREA_UNITS_CACHE = {}
    return _AREA_UNITS_CACHE


# Global well-defined unit factors to Decimal (শতাংশ)
WELL_DEFINED_UNITS = {
    # 1 decimal = 1.0 decimal
    "decimal": ("decimal", 1.0),
    "dec": ("decimal", 1.0),
    "শতাংশ": ("decimal", 1.0),
    "শতক": ("decimal", 1.0),
    "ডেসিমাল": ("decimal", 1.0),
    "ডিসিমেল": ("decimal", 1.0),
    # 1 acre = 100 decimal
    "acre": ("acre", 100.0),
    "ac": ("acre", 100.0),
    "একর": ("acre", 100.0),
    # 1 sq ft = 1 / 435.6 decimal
    "sq ft": ("sq_ft", 1.0 / 435.6),
    "sqft": ("sq_ft", 1.0 / 435.6),
    "sq.ft": ("sq_ft", 1.0 / 435.6),
    "বর্গফুট": ("sq_ft", 1.0 / 435.6),
    "বর্গ ফুট": ("sq_ft", 1.0 / 435.6),
    # 1 sq m = 10.76391 / 435.6 decimal
    "sq m": ("sq_m", 10.76391 / 435.6),
    "sqm": ("sq_m", 10.76391 / 435.6),
    "sq.m": ("sq_m", 10.76391 / 435.6),
    "বর্গমিটার": ("sq_m", 10.76391 / 435.6),
    "বর্গ মিটার": ("sq_m", 10.76391 / 435.6),
}

# Regional units requiring regional config
REGIONAL_UNITS = {
    "bigha", "বিঘা",
    "katha", "কাঠা", "কাটা", "cotta",
    "ganda", "গণ্ডা", "গন্ডা", "gonda",
    "kani", "কানি",
}


def normalize_area(raw_area: Any, region_code: Optional[str] = None) -> NormalizedArea:
    """
    Parses land area value and unit:
    - Retains original unit and value.
    - Converts well-defined units (শতাংশ/decimal, একর/acre, sq ft, sq m) globally.
    - Converts regional units (বিঘা, কাঠা, গণ্ডা, কানি) ONLY through config/area_units.yaml.
    - If region is unknown or unmapped for regional units, flags 'unit needs region' without converting.
    - Completely idempotent: normalize_area(normalize_area(x)) == normalize_area(x).
    """
    if isinstance(raw_area, NormalizedArea):
        # Idempotency check: if region matches or already converted, return as-is
        if raw_area.converted or not region_code or raw_area.original_unit not in REGIONAL_UNITS:
            return raw_area
        raw_area = raw_area.raw_value

    if raw_area is None or not str(raw_area).strip():
        return NormalizedArea(
            raw_value="" if raw_area is None else str(raw_area),
            parsed_value=None,
            original_unit=None,
            area_decimal=None,
            converted=False,
            flagged=True,
            flag_reason="empty_area",
            status="invalid",
            confidence=0.0,
        )

    raw_str = str(raw_area).strip()
    # 1. NFC and digits translate
    text = unicodedata.normalize("NFC", raw_str)
    for zw in ZERO_WIDTH_CHARS:
        text = text.replace(zw, "")
    text = text.replace("\u00a0", " ").strip()

    # Extract digits and unit tokens
    # Map Bangla digits to ASCII
    ascii_text = text.translate(BANGLA_DIGITS_TRANS)

    # Regex to extract number (including simple fractions \d+/\d+ or decimal)
    num_match = re.search(r"(\d+/\d+|\d+(?:\.\d+)?)", ascii_text)
    if not num_match:
        return NormalizedArea(
            raw_value=raw_str,
            parsed_value=None,
            original_unit=None,
            area_decimal=None,
            converted=False,
            flagged=True,
            flag_reason="no_numeric_area",
            status="invalid",
            confidence=0.0,
        )

    val_str = num_match.group(1)
    if "/" in val_str:
        num, den = val_str.split("/")
        parsed_val = float(num) / float(den) if float(den) != 0 else 0.0
    else:
        parsed_val = float(val_str)

    # Find unit substring
    unit_part = ascii_text.replace(num_match.group(0), "").strip()
    # Also clean punctuation from unit part
    clean_unit = re.sub(r"[\.,:;()\[\]{}]", "", unit_part).strip().lower()

    # Match against well-defined units
    matched_well_defined = None
    for k, v in WELL_DEFINED_UNITS.items():
        if k in clean_unit or clean_unit == k:
            matched_well_defined = v
            clean_unit = k
            break

    if matched_well_defined:
        std_unit_name, factor = matched_well_defined
        converted_decimal = round(parsed_val * factor, 4)
        return NormalizedArea(
            raw_value=raw_str,
            parsed_value=parsed_val,
            original_unit=clean_unit,
            area_decimal=converted_decimal,
            converted=True,
            flagged=False,
            flag_reason=None,
            status="converted" if factor != 1.0 else "valid",
            confidence=0.98,
        )

    # Check if regional unit
    matched_regional = None
    for r_unit in REGIONAL_UNITS:
        if r_unit in clean_unit:
            matched_regional = r_unit
            break

    if matched_regional:
        # Must look up in config/area_units.yaml
        area_units = _load_area_units()
        reg_key = region_code.upper() if region_code else None

        if reg_key and reg_key in area_units:
            reg_dict = area_units[reg_key].get("units", {})
            rate = reg_dict.get(matched_regional) or reg_dict.get(matched_regional.lower())
            if rate is not None:
                converted_decimal = round(parsed_val * float(rate), 4)
                return NormalizedArea(
                    raw_value=raw_str,
                    parsed_value=parsed_val,
                    original_unit=matched_regional,
                    area_decimal=converted_decimal,
                    converted=True,
                    flagged=False,
                    flag_reason=None,
                    status="converted",
                    confidence=0.95,
                )

        # Unknown region or unit not configured for region -> do not convert and flag
        return NormalizedArea(
            raw_value=raw_str,
            parsed_value=parsed_val,
            original_unit=matched_regional,
            area_decimal=None,
            converted=False,
            flagged=True,
            flag_reason="unit needs region",
            status="needs_region",
            confidence=0.60,
        )

    # If no recognized unit but has positive numeric value, default as decimal with soft flag
    return NormalizedArea(
        raw_value=raw_str,
        parsed_value=parsed_val,
        original_unit=clean_unit if clean_unit else "unknown",
        area_decimal=parsed_val if not clean_unit else None,
        converted=False,
        flagged=(clean_unit != ""),
        flag_reason="unknown_unit" if clean_unit else None,
        status="valid" if not clean_unit else "invalid",
        confidence=0.70 if not clean_unit else 0.40,
    )

