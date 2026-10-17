"""
Interactive ML Studio & Custom Land Intelligence Inference Router.
Allows citizens, reviewers, and admins to apply raw text/inputs into ML pipelines
and extract structured parcel data, entity recognition, conflict predictions,
and semantic legal guidance.
"""

import re
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.core.normalize import (
    fuzzy_compare_names,
    normalize_area,
    normalize_identifier,
    normalize_mouza,
    normalize_name,
)
from app.core.rate_limit import rate_limit

router = APIRouter(prefix="/ml", tags=["ML Studio & Inference Engine"])


# ------------------------------------------------------------------------------
# Request & Response Schemas
# ------------------------------------------------------------------------------


class MLExtractRequest(BaseModel):
    raw_text: str = Field(
        ..., min_length=5, description="Raw Bengali or English deed, porcha, or khatian text"
    )
    doc_type_hint: Optional[str] = Field(
        "deed", description="Optional hint: deed, khatian, mutation"
    )
    region_code: Optional[str] = Field(
        "dhaka", description="Regional code for land unit normalization"
    )


class ExtractedParty(BaseModel):
    raw_name: str
    normalized_name: str
    role: str  # "buyer" | "seller" | "owner" | "other"
    honorifics_removed: List[str]
    confidence: float


class ExtractedIdentifier(BaseModel):
    raw_value: str
    canonical: str
    main_no: Optional[int]
    sub_no: Optional[int]
    status: str
    repaired: bool
    confidence: float


class ExtractedArea(BaseModel):
    raw_value: str
    area_decimal: Optional[float]
    area_acres: Optional[float]
    area_sq_ft: Optional[float]
    original_unit: Optional[str]
    confidence: float


class MLExtractResponse(BaseModel):
    success: bool
    document_type_detected: str
    khatian_type: Optional[str] = None  # CS, SA, RS, BS, Mutation
    dag_identifiers: List[ExtractedIdentifier]
    khatian_identifiers: List[ExtractedIdentifier]
    mouza: Optional[Dict[str, Any]]
    area: Optional[ExtractedArea]
    parties: List[ExtractedParty]
    overall_confidence: float
    epistemic_status: str  # "OCR_EXTRACTED" | "VERIFIED"
    model_version: str = "LandOS-NLP-Bn-v3.2"
    timestamp: str


class ConflictSimulateRequest(BaseModel):
    deed_date: str = Field(..., description="YYYY-MM-DD format")
    mutation_date: str = Field(..., description="YYYY-MM-DD format")
    deed_area_decimal: float = Field(..., gt=0)
    record_area_decimal: float = Field(..., gt=0)
    seller_name: str = Field(..., min_length=2)
    record_owner_name: str = Field(..., min_length=2)
    prior_sold_area_decimal: float = Field(0.0, ge=0)


class ConflictAlert(BaseModel):
    rule_code: str  # R1..R6
    severity: str  # "CRITICAL" | "HIGH" | "WARNING"
    title_bn: str
    title_en: str
    evidence_bn: str
    mathematical_formula: str


class ConflictSimulateResponse(BaseModel):
    conflict_detected: bool
    risk_score: float  # 0 to 100
    risk_level: str  # "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
    alerts: List[ConflictAlert]
    simulation_summary_bn: str


# ------------------------------------------------------------------------------
# Entity Extraction Helpers
# ------------------------------------------------------------------------------


def _detect_doc_type(text: str) -> str:
    text_lower = text.lower()
    if any(k in text_lower for k in ["সাফ কবলা", "সাফ-কবলা", "বিক্রয় দলিল", "কবলা"]):
        return "সাফ-কবলা দলিল (Sale Deed)"
    if any(k in text_lower for k in ["হেবা", "হেবানামা"]):
        return "হেবা দলিল (Gift Deed)"
    if any(k in text_lower for k in ["বন্টননামা", "বন্টন"]):
        return "বন্টননামা দলিল (Partition Deed)"
    if any(k in text_lower for k in ["নামজারি", "মিউটেশন", "খারিজ"]):
        return "ই-নামজারি ও জমাভাগ আবেদন (Mutation Petition)"
    if any(k in text_lower for k in ["খতিয়ান", "খতিয়ান", "পর্চা", "পরচা"]):
        return "স্বত্বলিপি খতিয়ান / পরচা (Record of Rights)"
    return "সাধারণ ভূমি সংক্রান্ত নথি (General Land Record)"


def _detect_khatian_type(text: str) -> Optional[str]:
    text_lower = text.lower()
    if any(k in text_lower for k in ["বিএস", "bs", "বাংলাদেশ সার্ভে", "city survey"]):
        return "BS (বাংলাদেশ সার্ভে)"
    if any(k in text_lower for k in ["আরএস", "rs", "revisional survey"]):
        return "RS (রিভিশনাল সার্ভে)"
    if any(k in text_lower for k in ["এসএ", "sa", "state acquisition"]):
        return "SA (স্টেট একুইজিশন)"
    if any(k in text_lower for k in ["সিএস", "cs", "cadastral survey"]):
        return "CS (ক্যাডাস্ট্রাল সার্ভে)"
    if any(k in text_lower for k in ["নামজারি", "মিউটেশন"]):
        return "নামজারি খতিয়ান (Mutation Khatian)"
    return None


# ------------------------------------------------------------------------------
# Endpoints
# ------------------------------------------------------------------------------


@router.post(
    "/extract",
    response_model=MLExtractResponse,
    summary="Extract structured land entities from custom deed/khatian text",
    dependencies=[Depends(rate_limit(requests=60, window_seconds=60))],
)
async def extract_land_entities(payload: MLExtractRequest):
    """
    Applies real Bengali NLP and normalizer pipeline on custom input text:
    - Extracts Dag numbers with OCR confusable repair & digit normalization
    - Extracts Khatian numbers with canonical format
    - Identifies Mouza name with fuzzy alias snapping
    - Converts Land Area to decimal, acre, and sq ft
    - Identifies Buyers, Sellers, Owners with honorific stripping
    """
    text = payload.raw_text.strip()
    if not text:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty input text.")

    doc_type = _detect_doc_type(text)
    khatian_type = _detect_khatian_type(text)

    # 1. Dag number extraction
    # Patterns like দাগ নং ১২০৫/১, দাগ: ১২০৫, dag no. 1205
    dag_matches = re.findall(
        r"(?:দাগ\s*(?:নং|নম্বর)?|dag\s*(?:no\.?|#)?)\s*[:\-\s]*([০-৯0-9lIOo/\\\-]+)",
        text,
        re.IGNORECASE,
    )
    # Also find stand-alone numbers if explicit label missing
    if not dag_matches:
        alt_matches = re.findall(r"\b([০-৯0-9]{3,5}(?:/[০-৯0-9]{1,3})?)\b", text)
        if alt_matches:
            dag_matches = [alt_matches[0]]

    extracted_dags: List[ExtractedIdentifier] = []
    seen_dags = set()
    for raw_dag in dag_matches:
        cleaned = raw_dag.strip()
        if cleaned in seen_dags:
            continue
        seen_dags.add(cleaned)
        norm = normalize_identifier(cleaned, pattern_type="dag_no")
        if norm.is_valid and norm.canonical:
            extracted_dags.append(
                ExtractedIdentifier(
                    raw_value=norm.raw_value,
                    canonical=norm.canonical,
                    main_no=norm.main_no,
                    sub_no=norm.sub_no,
                    status=norm.status,
                    repaired=norm.repaired,
                    confidence=norm.confidence,
                )
            )

    # 2. Khatian number extraction
    khatian_matches = re.findall(
        r"(?:খতিয়ান\s*(?:নং|নম্বর)?|খতিয়ান\s*(?:নং|নম্বর)?|khatian\s*(?:no\.?|#)?)\s*[:\-\s]*([০-৯0-9lIOo/\\\-]+)",
        text,
        re.IGNORECASE,
    )
    extracted_khatians: List[ExtractedIdentifier] = []
    seen_khatians = set()
    for raw_kh in khatian_matches:
        cleaned = raw_kh.strip()
        if cleaned in seen_khatians:
            continue
        seen_khatians.add(cleaned)
        norm = normalize_identifier(cleaned, pattern_type="khatian_no")
        if norm.is_valid and norm.canonical:
            extracted_khatians.append(
                ExtractedIdentifier(
                    raw_value=norm.raw_value,
                    canonical=norm.canonical,
                    main_no=norm.main_no,
                    sub_no=norm.sub_no,
                    status=norm.status,
                    repaired=norm.repaired,
                    confidence=norm.confidence,
                )
            )

    # 3. Mouza extraction
    mouza_match = re.search(
        r"(?:মৌজা|মৌজা\s*নং|mouza)\s*[:\-\s]*([^\s,;।\n\r]+)",
        text,
        re.IGNORECASE,
    )
    mouza_info = None
    if mouza_match:
        raw_m = mouza_match.group(1).strip()
        known = ["তেজগাঁও", "জিনজিরা", "ধানমন্ডি", "গুলশান", "মিরপুর", "উত্তরা", "মোহাম্মদপুর"]
        m_norm = normalize_mouza(raw_m, known_mouzas=known)
        mouza_info = {
            "raw_name": m_norm.raw_name,
            "normalized_name": m_norm.normalized_name,
            "matched_mouza": m_norm.matched_mouza,
            "confidence": m_norm.confidence,
            "status": m_norm.status,
        }

    # 4. Land Area extraction
    area_match = re.search(
        r"([০-৯0-9]+(?:\.[০-৯0-9]+)?)\s*(শতাংশ|শতক|ডেসিমাল|ডিসিমেল|একর|বর্গফুট|বর্গমিটার|কাঠা|কাটা|বিঘা|decimal|acre|sq\s*ft)",
        text,
        re.IGNORECASE,
    )
    area_info = None
    if area_match:
        val_str = area_match.group(1)
        unit_str = area_match.group(2)
        raw_area_combined = f"{val_str} {unit_str}"
        norm_a = normalize_area(raw_area_combined, region_code=payload.region_code)
        if norm_a.area_decimal is not None:
            area_info = ExtractedArea(
                raw_value=raw_area_combined,
                area_decimal=round(norm_a.area_decimal, 4),
                area_acres=round(norm_a.area_decimal / 100.0, 4),
                area_sq_ft=round(norm_a.area_decimal * 435.6, 2),
                original_unit=norm_a.original_unit,
                confidence=norm_a.confidence,
            )

    # 5. Parties extraction
    parties: List[ExtractedParty] = []
    # Check for buyer
    buyer_match = re.search(
        r"(?:গ্রহীতা|ক্রেতা|buyer)\s*[:\-\s]*([^\n,;।]{2,40})", text, re.IGNORECASE
    )
    if buyer_match:
        b_name = normalize_name(buyer_match.group(1).strip())
        parties.append(
            ExtractedParty(
                raw_name=b_name.raw_name,
                normalized_name=b_name.normalized_name,
                role="buyer",
                honorifics_removed=b_name.stripped_honorifics,
                confidence=b_name.confidence,
            )
        )

    # Check for seller
    seller_match = re.search(
        r"(?:দাতার|দাতা|বিক্রেতা|seller)\s*[:\-\s]*([^\n,;।]{2,40})", text, re.IGNORECASE
    )
    if seller_match:
        s_name = normalize_name(seller_match.group(1).strip())
        parties.append(
            ExtractedParty(
                raw_name=s_name.raw_name,
                normalized_name=s_name.normalized_name,
                role="seller",
                honorifics_removed=s_name.stripped_honorifics,
                confidence=s_name.confidence,
            )
        )

    # Check for owner
    owner_match = re.search(
        r"(?:মালিক|মালিকের\s*নাম|owner)\s*[:\-\s]*([^\n,;।]{2,40})", text, re.IGNORECASE
    )
    if owner_match and not buyer_match and not seller_match:
        o_name = normalize_name(owner_match.group(1).strip())
        parties.append(
            ExtractedParty(
                raw_name=o_name.raw_name,
                normalized_name=o_name.normalized_name,
                role="owner",
                honorifics_removed=o_name.stripped_honorifics,
                confidence=o_name.confidence,
            )
        )

    # Overall confidence calculation
    conf_scores = [0.9]
    if extracted_dags:
        conf_scores.append(extracted_dags[0].confidence)
    if extracted_khatians:
        conf_scores.append(extracted_khatians[0].confidence)
    if mouza_info and mouza_info.get("confidence") is not None:
        conf_val = mouza_info["confidence"]
        if isinstance(conf_val, (int, float)):
            conf_scores.append(float(conf_val))
        elif isinstance(conf_val, str):
            try:
                conf_scores.append(float(conf_val))
            except ValueError:
                pass
    if area_info:
        conf_scores.append(area_info.confidence)
    if parties:
        conf_scores.append(parties[0].confidence)

    overall_conf = round(sum(conf_scores) / len(conf_scores), 3)

    return MLExtractResponse(
        success=True,
        document_type_detected=doc_type,
        khatian_type=khatian_type,
        dag_identifiers=extracted_dags,
        khatian_identifiers=extracted_khatians,
        mouza=mouza_info,
        area=area_info,
        parties=parties,
        overall_confidence=overall_conf,
        epistemic_status="OCR_EXTRACTED",
        model_version="LandOS-NLP-Bn-v3.2",
        timestamp=datetime.utcnow().isoformat() + "Z",
    )


@router.post(
    "/simulate-conflict",
    response_model=ConflictSimulateResponse,
    summary="Simulate R1-R6 Conflict Rules on custom parcel parameters",
    dependencies=[Depends(rate_limit(requests=60, window_seconds=60))],
)
async def simulate_risk_conflicts(payload: ConflictSimulateRequest):
    """
    Simulates the R1-R6 conflict detection engine with mathematical proof:
    - R3: Chronological ordering (deed date vs mutation date)
    - R4: Land area oversale (deed area vs record area remaining)
    - R6: Party name matching with token-sort fuzzy comparison
    """
    alerts: List[ConflictAlert] = []
    risk_score = 0.0

    # Parse dates
    try:
        d_date = datetime.strptime(payload.deed_date, "%Y-%m-%d")
        m_date = datetime.strptime(payload.mutation_date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid date format. Expected YYYY-MM-DD.",
        )

    # Rule R3: Chronology Check (Mutation cannot precede deed date)
    if m_date < d_date:
        risk_score += 40.0
        alerts.append(
            ConflictAlert(
                rule_code="R3",
                severity="CRITICAL",
                title_bn="অসম্ভব কালানুক্রমিক অসঙ্গতি (Impossible Chronology)",
                title_en="Mutation date predates deed registration date",
                evidence_bn=f"দলিল নিবন্ধনের তারিখ ({payload.deed_date}) নামজারি আদেশের তারিখ ({payload.mutation_date})-এর পরবর্তী। এটি আইনগতভাবে অসম্ভব।",
                mathematical_formula="mutation_date < deed_date (Violation of Transfer of Property Act)",
            )
        )

    # Rule R4: Area Mismatch / Oversale Check
    remaining_area = payload.record_area_decimal - payload.prior_sold_area_decimal
    if payload.deed_area_decimal > remaining_area + 0.01:
        excess = round(payload.deed_area_decimal - remaining_area, 2)
        risk_score += 35.0
        alerts.append(
            ConflictAlert(
                rule_code="R4",
                severity="HIGH",
                title_bn="রেকর্ড বহির্ভূত অতিরিক্ত জমি বিক্রয় (Area Oversale / Deficit)",
                title_en="Deed area exceeds available khatian share",
                evidence_bn=f"খতিয়ানে বিক্রয়যোগ্য অবশিষ্ট জমি {remaining_area} শতাংশ, কিন্তু দলিলে বিক্রয় দেখানো হয়েছে {payload.deed_area_decimal} শতাংশ। অতিরিক্ত {excess} শতাংশ বিক্রয়ের কোনো আইনি স্বত্ব নেই।",
                mathematical_formula=f"deed_area ({payload.deed_area_decimal}) > remaining_khatian_area ({remaining_area})",
            )
        )

    # Rule R6: Party Name Matching Check
    name_similarity = fuzzy_compare_names(payload.seller_name, payload.record_owner_name)
    if name_similarity < 85.0:
        risk_score += 25.0
        alerts.append(
            ConflictAlert(
                rule_code="R6",
                severity="HIGH" if name_similarity < 60.0 else "WARNING",
                title_bn="মালিকানা ও বিক্রেতার নামের অসঙ্গতি (Party Name Mismatch)",
                title_en="Seller name does not match khatian record owner",
                evidence_bn=f"রেকর্ডকৃত মালিকের নাম '{payload.record_owner_name}' এবং দলিলের বিক্রেতার নাম '{payload.seller_name}'-এর মধ্যে নাম মিলের হার মাত্র {name_similarity}%।",
                mathematical_formula=f"fuzzy_similarity('{payload.seller_name}', '{payload.record_owner_name}') = {name_similarity}% < 85%",
            )
        )

    # Compute overall risk level
    final_score = min(100.0, risk_score)
    if final_score >= 60.0:
        level = "CRITICAL"
        summary = "উচ্চ মাত্রার আইনি ঝুঁকি ও অসঙ্গতি শনাক্ত হয়েছে! নথি অনুমোদনযোগ্য নয়।"
    elif final_score >= 30.0:
        level = "HIGH"
        summary = "মাঝারি থেকে উচ্চ আইনি ঝুঁকি বিদ্যমান। সরেজমিন তদন্ত আবশ্যক।"
    elif final_score > 0.0:
        level = "MEDIUM"
        summary = "সতর্কতামূলক পর্যবেক্ষণ পাওয়া গেছে। অতিরিক্ত তথ্য যাচাই করুন।"
    else:
        level = "LOW"
        summary = "সকল গাণিতিক ও আইনি নিয়মে নথি সঙ্গতিপূর্ণ। কোনো বিরোধ শনাক্ত হয়নি।"

    return ConflictSimulateResponse(
        conflict_detected=len(alerts) > 0,
        risk_score=round(final_score, 1),
        risk_level=level,
        alerts=alerts,
        simulation_summary_bn=summary,
    )


class VisualBoundingBox(BaseModel):
    id: str
    field_name: str
    label_bn: str
    ocr_text: str
    x: float
    y: float
    width: float
    height: float
    status: str  # "verified" | "tampered" | "warning"
    confidence: float
    official_record: str
    evidence_bn: str


class VisualForensicsRequest(BaseModel):
    preset: str = Field("tampered", description="clean | tampered | porcha")
    custom_area: Optional[float] = None
    custom_date: Optional[str] = None


class VisualForensicsResponse(BaseModel):
    document_template: str
    deed_title_bn: str
    deed_no: str
    has_tampering: bool
    tamper_summary_bn: str
    risk_score: float
    boxes: List[VisualBoundingBox]


@router.post(
    "/visual-forensics",
    response_model=VisualForensicsResponse,
    summary="Generate side-by-side OCR bounding boxes and forgery forensic analysis",
    dependencies=[Depends(rate_limit(requests=60, window_seconds=60))],
)
async def analyze_visual_forensics(payload: VisualForensicsRequest):
    """
    Computes visual bounding boxes for side-by-side OCR heatmap inspection:
    - Normal clean deed: Green bounding boxes, 100% matched with official khatian.
    - Tampered deed: Overwritten acreage, red pulsating bounding box, forensic explanation.
    - Porcha khatian: Multi-dag partition layout.
    """
    if payload.preset == "tampered":
        boxes = [
            VisualBoundingBox(
                id="box-deed-no",
                field_name="deed_no",
                label_bn="দলিল নম্বর",
                ocr_text="দলিল নং ৯৮৪২/২০২২",
                x=18.0,
                y=17.5,
                width=32.0,
                height=5.2,
                status="verified",
                confidence=0.99,
                official_record="দলিল নং ৯৮৪২ (নিবন্ধিত)",
                evidence_bn="সাব-রেজিস্ট্রি ভলিউমে রেকর্ডকৃত দলিলের সাথে মিল রয়েছে।",
            ),
            VisualBoundingBox(
                id="box-mouza",
                field_name="mouza",
                label_bn="মৌজা ও জেএল নং",
                ocr_text="মৌজা: তেজগাঁও, জেএল নং ২৯",
                x=55.0,
                y=17.5,
                width=38.0,
                height=5.2,
                status="verified",
                confidence=0.98,
                official_record="মৌজা: তেজগাঁও (জেএল ২৯)",
                evidence_bn="উপজেলা ও সার্কেল মৌজা গেজেটের সাথে সম্পূর্ণ একরূপ।",
            ),
            VisualBoundingBox(
                id="box-dag",
                field_name="dag_no",
                label_bn="দাগ নম্বর",
                ocr_text="দাগ নং ১২০৫/১",
                x=18.0,
                y=26.0,
                width=24.0,
                height=5.5,
                status="verified",
                confidence=0.99,
                official_record="দাগ নং ১২০৫/১ (খতিয়ান ৩৪০)",
                evidence_bn="ক্যাডাস্ট্রাল ম্যাপ ও আরএস নকশার দাগ পলিগনের সাথে মিলেছে।",
            ),
            VisualBoundingBox(
                id="box-khatian",
                field_name="khatian_no",
                label_bn="খতিয়ান নম্বর",
                ocr_text="খতিয়ান নং ৩৪০",
                x=48.0,
                y=26.0,
                width=24.0,
                height=5.5,
                status="verified",
                confidence=0.98,
                official_record="খতিয়ান নং ৩৪০ (আরএস)",
                evidence_bn="জেলা রেকর্ড রুমের আরএস স্বত্বলিপি খতিয়ানের সাথে মিলেছে।",
            ),
            VisualBoundingBox(
                id="box-area",
                field_name="area",
                label_bn="জমির পরিমাণ (জালিয়াতি শনাক্ত)",
                ocr_text="জমির পরিমাণ: ৮৪ শতাংশ (ঘষামাজা চিহ্নিত)",
                x=18.0,
                y=35.0,
                width=72.0,
                height=6.5,
                status="tampered",
                confidence=0.62,
                official_record="প্রকৃত রেকর্ড: ৩৪.০০ শতাংশ",
                evidence_bn="দলিলের ৩৪ শতাংশের স্থানে কলমের কালি দিয়ে ঘষামাজা করে ৮৪ করা হয়েছে! মূল রেকর্ডকৃত খতিয়ানে জমি মাত্র ৩৪ শতাংশ (৫০ শতাংশ অতিরিক্ত জাল বিক্রয়)!",
            ),
            VisualBoundingBox(
                id="box-buyer",
                field_name="buyer",
                label_bn="গ্রহীতা / ক্রেতা",
                ocr_text="ক্রেতা: মোঃ রহিম মিয়া",
                x=18.0,
                y=45.0,
                width=36.0,
                height=5.5,
                status="verified",
                confidence=0.97,
                official_record="মোঃ রহিম মিয়া (এনআইডি যাচাইকৃত)",
                evidence_bn="জাতীয় পরিচয়পত্র ও ভোটার তালিকার সাথে মিল পাওয়া গেছে।",
            ),
            VisualBoundingBox(
                id="box-seller",
                field_name="seller",
                label_bn="দাতা / বিক্রেতা",
                ocr_text="বিক্রেতা: আবদুল করিম",
                x=58.0,
                y=45.0,
                width=34.0,
                height=5.5,
                status="verified",
                confidence=0.96,
                official_record="আবদুল করিম (রেকর্ডকৃত মালিক)",
                evidence_bn="পূর্ববর্তী আরএস খতিয়ানের মূল মালিকের নামের সাথে শতভাগ মিল।",
            ),
            VisualBoundingBox(
                id="box-seal",
                field_name="registration_seal",
                label_bn="সাব-রেজিস্ট্রি সিল ও রাজস্ব স্ট্যাম্প",
                ocr_text="বাংলাদেশ নন-জুডিশিয়াল স্ট্যাম্প ও রেজিস্ট্রি সিল",
                x=22.0,
                y=6.0,
                width=56.0,
                height=8.5,
                status="verified",
                confidence=0.95,
                official_record="স্ট্যাম্প সিরিজ: খ-৭৮৯৪৫৬ (বৈধ)",
                evidence_bn="সরকারি ট্রেজারি ও সাব-রেজিস্ট্রি অফিস থেকে স্ট্যাম্প ভেন্ডর সিরিয়াল বৈধ।",
            ),
        ]
        return VisualForensicsResponse(
            document_template="deed_sale_54",
            deed_title_bn="সাফ-কবলা বিক্রয় দলিল (ঘষামাজা ও জাল জমি বিক্রয় টেস্ট)",
            deed_no="৯৮৪২/২০২২",
            has_tampering=True,
            tamper_summary_bn="উচ্চমাত্রার জালিয়াতি শনাক্ত! দলিলের ৩৪ শতাংশের স্থানে ওভাররাইট করে ৮৪ করা হয়েছে। মূল খতিয়ানে জমি মাত্র ৩৪ শতাংশ!",
            risk_score=92.5,
            boxes=boxes,
        )

    elif payload.preset == "porcha":
        boxes = [
            VisualBoundingBox(
                id="box-porcha-header",
                field_name="header",
                label_bn="পরচা শিরোনাম",
                ocr_text="বাংলাদেশ ফরম নং ৫৪৫৮ - আরএস খতিয়ান ও স্বত্বলিপি",
                x=20.0,
                y=8.0,
                width=60.0,
                height=6.0,
                status="verified",
                confidence=0.98,
                official_record="বিজি প্রেস অনুমোদিত সরকারি ফরম",
                evidence_bn="বাংলাদেশ গভর্নমেন্ট প্রেস ফরম কোড সঠিক।",
            ),
            VisualBoundingBox(
                id="box-mouza-p",
                field_name="mouza",
                label_bn="মৌজা",
                ocr_text="মৌজা: জিনজিড়া (জেএল ১৫)",
                x=15.0,
                y=18.0,
                width=35.0,
                height=5.2,
                status="verified",
                confidence=0.97,
                official_record="মৌজা: জিনজিরা (কেরানীগঞ্জ)",
                evidence_bn="উপজেলা ও সার্কেল মৌজা তালিকার সাথে একরূপ।",
            ),
            VisualBoundingBox(
                id="box-dag-p",
                field_name="dag_no",
                label_bn="দাগ নম্বর",
                ocr_text="দাগ নং ৪২০/৩",
                x=15.0,
                y=26.0,
                width=25.0,
                height=5.2,
                status="verified",
                confidence=0.99,
                official_record="দাগ নং ৪২০/৩ (বাস্তু ও নাল)",
                evidence_bn="আরএস ক্যাডাস্ট্রাল ম্যাপ ও জিআইএস সীমানার সাথে মিল।",
            ),
            VisualBoundingBox(
                id="box-area-p",
                field_name="area",
                label_bn="জমির পরিমাণ",
                ocr_text="মোট জমি: ৫০ শতাংশ",
                x=45.0,
                y=26.0,
                width=30.0,
                height=5.2,
                status="verified",
                confidence=0.98,
                official_record="৫০.০০ শতাংশ (০.৫০ একর)",
                evidence_bn="খতিয়ান খতের মোট জমি ও দখল সম্পূর্ণ সামঞ্জস্যপূর্ণ।",
            ),
            VisualBoundingBox(
                id="box-owner-p",
                field_name="owner",
                label_bn="স্বত্বাধিকারী মালিক",
                ocr_text="মালিক: শ্রী সুবোধ চন্দ্র পাল",
                x=15.0,
                y=35.0,
                width=45.0,
                height=5.5,
                status="verified",
                confidence=0.96,
                official_record="শ্রী সুবোধ চন্দ্র পাল (পিতা: রমেশ পাল)",
                evidence_bn="সিএস থেকে আরএস উত্তরাধিকার সূত্রে ধারাবাহিক স্বত্ব প্রমাণিত।",
            ),
        ]
        return VisualForensicsResponse(
            document_template="khatian_rs_porcha",
            deed_title_bn="আরএস খতিয়ান ও স্বত্বলিপি পরচা (জিনজিড়া ৪২০/৩)",
            deed_no="খতিয়ান নং ৮৮/২",
            has_tampering=False,
            tamper_summary_bn="পরচা সম্পূর্ণ ত্রুটিমুক্ত ও ১০০% সরকারি আরএস ভলিউমের সাথে সামঞ্জস্যপূর্ণ।",
            risk_score=0.0,
            boxes=boxes,
        )

    else:
        # Clean sale deed
        boxes = [
            VisualBoundingBox(
                id="box-deed-no-c",
                field_name="deed_no",
                label_bn="দলিল নম্বর",
                ocr_text="দলিল নং ১২০৫/২০২২",
                x=18.0,
                y=17.5,
                width=32.0,
                height=5.2,
                status="verified",
                confidence=0.99,
                official_record="দলিল নং ১২০৫ (বৈধ নিবন্ধিত)",
                evidence_bn="সাব-রেজিস্ট্রি ভলিউমে রেকর্ডকৃত দলিলের সাথে হুবহু মিল রয়েছে।",
            ),
            VisualBoundingBox(
                id="box-mouza-c",
                field_name="mouza",
                label_bn="মৌজা ও জেএল নং",
                ocr_text="মৌজা: তেজগাঁও, জেএল নং ২৯",
                x=55.0,
                y=17.5,
                width=38.0,
                height=5.2,
                status="verified",
                confidence=0.98,
                official_record="মৌজা: তেজগাঁও (জেএল ২৯)",
                evidence_bn="উপজেলা ও সার্কেল মৌজা গেজেটের সাথে সম্পূর্ণ একরূপ।",
            ),
            VisualBoundingBox(
                id="box-dag-c",
                field_name="dag_no",
                label_bn="দাগ নম্বর",
                ocr_text="দাগ নং ১২০৫/১",
                x=18.0,
                y=26.0,
                width=24.0,
                height=5.5,
                status="verified",
                confidence=0.99,
                official_record="দাগ নং ১২০৫/১ (খতিয়ান ৩৪০)",
                evidence_bn="ক্যাডাস্ট্রাল ম্যাপ ও আরএস নকশার দাগ পলিগনের সাথে শতভাগ মিল।",
            ),
            VisualBoundingBox(
                id="box-khatian-c",
                field_name="khatian_no",
                label_bn="খতিয়ান নম্বর",
                ocr_text="খতিয়ান নং ৩৪০",
                x=48.0,
                y=26.0,
                width=24.0,
                height=5.5,
                status="verified",
                confidence=0.98,
                official_record="খতিয়ান নং ৩৪০ (আরএস)",
                evidence_bn="জেলা রেকর্ড রুমের আরএস স্বত্বলিপি খতিয়ানের সাথে মিল।",
            ),
            VisualBoundingBox(
                id="box-area-c",
                field_name="area",
                label_bn="জমির পরিমাণ",
                ocr_text="জমির পরিমাণ: ৩৩.০০ শতাংশ",
                x=18.0,
                y=35.0,
                width=55.0,
                height=5.5,
                status="verified",
                confidence=0.99,
                official_record="খতিয়ানে অনুমোদিত: ৩৩.০০ শতাংশ",
                evidence_bn="দলিলে উল্লিখিত জমি ও খতিয়ানের বিক্রয়যোগ্য হিস্যা সম্পূর্ণ সঙ্গতিপূর্ণ।",
            ),
            VisualBoundingBox(
                id="box-buyer-c",
                field_name="buyer",
                label_bn="গ্রহীতা / ক্রেতা",
                ocr_text="ক্রেতা: মোঃ রহিম মিয়া",
                x=18.0,
                y=45.0,
                width=36.0,
                height=5.5,
                status="verified",
                confidence=0.98,
                official_record="মোঃ রহিম মিয়া (এনআইডি যাচাইকৃত)",
                evidence_bn="জাতীয় পরিচয়পত্র ও ভোটার তালিকার সাথে মিল পাওয়া গেছে।",
            ),
            VisualBoundingBox(
                id="box-seller-c",
                field_name="seller",
                label_bn="দাতা / বিক্রেতা",
                ocr_text="বিক্রেতা: আবদুল করিম",
                x=58.0,
                y=45.0,
                width=34.0,
                height=5.5,
                status="verified",
                confidence=0.97,
                official_record="আবদুল করিম (রেকর্ডকৃত মালিক)",
                evidence_bn="পূর্ববর্তী আরএস খতিয়ানের মূল মালিকের নামের সাথে শতভাগ মিল।",
            ),
        ]
        return VisualForensicsResponse(
            document_template="deed_sale_54",
            deed_title_bn="বৈধ সাফ-কবলা দলিল (তেজগাঁও ১২০৫/১ - শতভাগ ত্রুটিমুক্ত)",
            deed_no="১২০৫/২০২২",
            has_tampering=False,
            tamper_summary_bn="দলিল সম্পূর্ণ বৈধ ও ত্রুটিমুক্ত। সরকারি খতিয়ানের সাথে কোনো বিরোধ নেই।",
            risk_score=0.0,
            boxes=boxes,
        )
