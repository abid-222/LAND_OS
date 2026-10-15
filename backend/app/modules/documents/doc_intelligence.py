"""
Document Intelligence v2 Service for Bangladesh LandOS.
Extracts structured land document fields from Deed (দলিল), Khatian (খতিয়ান), and Porcha (পর্চা)
fixtures and OCR tokens according to config/doc_templates/{doc_type}.yaml.

Key Capabilities:
- Extracts number (document_no / khatian_no), mouza, dag_no, area (+ original unit), and party names.
- Integrates with Unicode NFC normalizers and regional area unit parsers.
- Detects low-confidence or repaired critical fields and auto-triggers Human-in-the-Loop review case.
"""

import os
import uuid
from typing import Any, Dict, List, Optional, Tuple

import yaml
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.normalize import (
    normalize_area,
    normalize_identifier,
    normalize_mouza,
    normalize_name,
)
from app.models import Case, Document, ExtractedField, StatusLabel
from app.modules.review.service import guard_and_create_review_case


class ExtractedFieldData:
    def __init__(
        self,
        field_name: str,
        raw_value: Any,
        normalized_value: Optional[str] = None,
        confidence: float = 1.0,
        repaired: bool = False,
        flagged: bool = False,
        flag_reason: Optional[str] = None,
        original_unit: Optional[str] = None,
        area_decimal: Optional[float] = None,
        status_label: str = StatusLabel.OCR_EXTRACTED.value,
    ):
        self.field_name = field_name
        self.raw_value = str(raw_value) if raw_value is not None else ""
        self.normalized_value = normalized_value
        self.confidence = confidence
        self.repaired = repaired
        self.flagged = flagged
        self.flag_reason = flag_reason
        self.original_unit = original_unit
        self.area_decimal = area_decimal
        self.status_label = status_label


class DocumentIntelligenceV2:
    """Document Intelligence v2 parsing engine for Deed, Khatian, and Porcha."""

    @staticmethod
    def load_template(doc_type: str) -> Dict[str, Any]:
        clean_type = (doc_type or "khatian").lower().replace("দলিল", "deed").replace("খতিয়ান", "khatian").replace("পর্চা", "porcha")
        candidates = [
            os.path.abspath(f"config/doc_templates/{clean_type}.yaml"),
            os.path.abspath(f"../config/doc_templates/{clean_type}.yaml"),
            os.path.abspath(f"../../config/doc_templates/{clean_type}.yaml"),
            os.path.join(os.path.dirname(__file__), f"../../../../config/doc_templates/{clean_type}.yaml"),
        ]
        for path in candidates:
            if os.path.exists(path):
                with open(path, "r", encoding="utf-8") as f:
                    return yaml.safe_load(f)
        return {"doc_type": clean_type, "critical_fields": ["dag_no", "khatian_no", "mouza"]}

    @classmethod
    def extract_from_fixture(
        cls,
        doc_type: str,
        fixture_data: Dict[str, Any],
        region_code: Optional[str] = None,
    ) -> Dict[str, ExtractedFieldData]:
        """
        Extracts number, mouza, dag, area (+ original unit) and names from document fixture.
        """
        extracted: Dict[str, ExtractedFieldData] = {}
        clean_type = (doc_type or "khatian").lower().replace("দলিল", "deed").replace("খতিয়ান", "khatian").replace("পর্চা", "porcha")

        # 1. Number extraction (document_no for deed/porcha; khatian_no for khatian/porcha)
        if clean_type == "deed":
            raw_no = fixture_data.get("document_no") or fixture_data.get("deed_no") or fixture_data.get("number")
            conf = float(fixture_data.get("confidences", {}).get("document_no", 0.98))
            norm_no = normalize_identifier(str(raw_no), pattern_type="document_no") if raw_no else None
            extracted["document_no"] = ExtractedFieldData(
                field_name="document_no",
                raw_value=raw_no,
                normalized_value=norm_no.normalized_value if norm_no else None,
                confidence=conf,
                repaired=norm_no.repaired if norm_no else False,
            )
        else:
            raw_khatian = fixture_data.get("khatian_no") or fixture_data.get("number")
            conf = float(fixture_data.get("confidences", {}).get("khatian_no", 0.98))
            norm_kh = normalize_identifier(str(raw_khatian), pattern_type="khatian_no") if raw_khatian else None
            extracted["khatian_no"] = ExtractedFieldData(
                field_name="khatian_no",
                raw_value=raw_khatian,
                normalized_value=norm_kh.normalized_value if norm_kh else None,
                confidence=conf,
                repaired=norm_kh.repaired if norm_kh else False,
            )

        # 2. Mouza extraction
        raw_mouza = fixture_data.get("mouza") or fixture_data.get("mouza_name")
        conf_mouza = float(fixture_data.get("confidences", {}).get("mouza", 0.97))
        norm_mouza = normalize_mouza(str(raw_mouza)) if raw_mouza else None
        extracted["mouza"] = ExtractedFieldData(
            field_name="mouza",
            raw_value=raw_mouza,
            normalized_value=norm_mouza.normalized_name if norm_mouza else None,
            confidence=conf_mouza,
            repaired=False,
        )

        # 3. Dag extraction
        raw_dag = fixture_data.get("dag_no") or fixture_data.get("dag")
        conf_dag = float(fixture_data.get("confidences", {}).get("dag_no", 0.99))
        norm_dag = normalize_identifier(str(raw_dag), pattern_type="dag_no") if raw_dag else None
        extracted["dag_no"] = ExtractedFieldData(
            field_name="dag_no",
            raw_value=raw_dag,
            normalized_value=norm_dag.normalized_value if norm_dag else None,
            confidence=conf_dag,
            repaired=norm_dag.repaired if norm_dag else False,
            flagged=norm_dag.status == "invalid" if norm_dag else False,
        )

        # 4. Area extraction (+ original unit preservation)
        raw_area = fixture_data.get("area") or fixture_data.get("land_area")
        conf_area = float(fixture_data.get("confidences", {}).get("area", 0.96))
        if raw_area:
            norm_area = normalize_area(str(raw_area), region_code=region_code)
            extracted["area"] = ExtractedFieldData(
                field_name="area",
                raw_value=raw_area,
                normalized_value=str(norm_area.area_decimal) if norm_area.area_decimal is not None else None,
                confidence=conf_area,
                original_unit=norm_area.original_unit,
                area_decimal=norm_area.area_decimal,
                flagged=norm_area.flagged,
                flag_reason=norm_area.flag_reason,
            )
        else:
            extracted["area"] = ExtractedFieldData(
                field_name="area",
                raw_value="",
                confidence=0.0,
                flagged=True,
                flag_reason="Missing area field",
            )

        # 5. Names extraction (seller/buyer for deed, owner for khatian/porcha)
        if clean_type == "deed":
            raw_seller = fixture_data.get("seller") or fixture_data.get("seller_name")
            conf_seller = float(fixture_data.get("confidences", {}).get("seller", 0.95))
            norm_seller = normalize_name(str(raw_seller)) if raw_seller else None
            extracted["seller"] = ExtractedFieldData(
                field_name="seller",
                raw_value=raw_seller,
                normalized_value=norm_seller.normalized_name if norm_seller else None,
                confidence=conf_seller,
            )

            raw_buyer = fixture_data.get("buyer") or fixture_data.get("buyer_name")
            conf_buyer = float(fixture_data.get("confidences", {}).get("buyer", 0.95))
            norm_buyer = normalize_name(str(raw_buyer)) if raw_buyer else None
            extracted["buyer"] = ExtractedFieldData(
                field_name="buyer",
                raw_value=raw_buyer,
                normalized_value=norm_buyer.normalized_name if norm_buyer else None,
                confidence=conf_buyer,
            )
        else:
            raw_owner = fixture_data.get("owner") or fixture_data.get("owner_name") or fixture_data.get("party_names")
            conf_owner = float(fixture_data.get("confidences", {}).get("owner", 0.95))
            norm_owner = normalize_name(str(raw_owner)) if raw_owner else None
            extracted["owner"] = ExtractedFieldData(
                field_name="owner",
                raw_value=raw_owner,
                normalized_value=norm_owner.normalized_name if norm_owner else None,
                confidence=conf_owner,
            )

        return extracted

    @classmethod
    async def process_document_and_guard(
        cls,
        doc_type: str,
        fixture_data: Dict[str, Any],
        document: Document,
        db: AsyncSession,
        region_code: Optional[str] = None,
        confidence_threshold: float = 0.80,
    ) -> Tuple[Dict[str, ExtractedFieldData], bool, Optional[Case], List[str]]:
        """
        Extracts fields and immediately evaluates the Human-in-the-Loop review guard.
        If any critical field has confidence < threshold, is repaired, or invalid,
        creates a review case in `cases` table with status 'needs_human_review'.
        """
        extracted = cls.extract_from_fixture(doc_type, fixture_data, region_code=region_code)

        db_fields: List[ExtractedField] = []
        for name, field_data in extracted.items():
            db_field = ExtractedField(
                id=uuid.uuid4(),
                document_id=document.id,
                field_name=name,
                raw_value=field_data.raw_value,
                normalized_value=field_data.normalized_value,
                confidence=field_data.confidence,
                repaired=field_data.repaired,
                flagged=field_data.flagged,
                flag_reason=field_data.flag_reason,
                status_label=field_data.status_label,
                user_corrected=False,
            )
            db_fields.append(db_field)

        can_proceed, case, flagged = await guard_and_create_review_case(
            document=document,
            extracted_fields=db_fields,
            doc_type=doc_type,
            db=db,
            threshold=confidence_threshold,
        )

        return extracted, can_proceed, case, flagged
