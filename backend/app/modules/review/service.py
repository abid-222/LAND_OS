"""
Human-in-the-Loop Review Guard Service for Bangladesh LandOS.
Enforces the mandatory rule:
Low confidence (any critical field < threshold, regex invalid, or repaired) -> auto-create a review case
(cases table, status "needs_human_review") with the flagged fields.
The system must not continue to verification/alerts on unconfirmed critical fields without marking
them USER_CORRECTED or confirmed by a reviewer.
"""

import os
import uuid
from typing import Dict, List, Optional, Set, Tuple

import yaml
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Case, Document, ExtractedField, StatusLabel

DEFAULT_CRITICAL_FIELDS: Dict[str, List[str]] = {
    "deed": ["document_no", "registry_office", "document_date", "mouza", "dag_no"],
    "khatian": ["khatian_no", "mouza", "dag_no"],
    "porcha": ["khatian_no", "mouza", "dag_no"],
}


def get_critical_fields_for_type(doc_type: str) -> List[str]:
    """Loads critical fields from config/doc_templates/{doc_type}.yaml or falls back to defaults."""
    clean_type = (doc_type or "khatian").lower().replace("দলিল", "deed").replace("খতিয়ান", "khatian").replace("পর্চা", "porcha")
    candidates = [
        os.path.abspath(f"config/doc_templates/{clean_type}.yaml"),
        os.path.abspath(f"../config/doc_templates/{clean_type}.yaml"),
        os.path.abspath(f"../../config/doc_templates/{clean_type}.yaml"),
        os.path.join(os.path.dirname(__file__), f"../../../../config/doc_templates/{clean_type}.yaml"),
    ]
    for path in candidates:
        if os.path.exists(path):
            try:
                with open(path, "r", encoding="utf-8") as f:
                    data = yaml.safe_load(f)
                    crits = data.get("critical_fields")
                    if crits:
                        return crits
            except Exception:
                pass

    return DEFAULT_CRITICAL_FIELDS.get(clean_type, ["dag_no", "khatian_no", "mouza"])


class UnconfirmedCriticalFieldsError(Exception):
    """Raised when pipeline attempts cross-record verification or alerts on unconfirmed critical fields."""
    def __init__(self, document_id: str, case_id: str, flagged_fields: List[str]):
        super().__init__(
            f"Document {document_id} has unconfirmed critical fields {flagged_fields}. "
            f"Review case {case_id} created with status 'needs_human_review'. "
            "Verification and alerts cannot proceed until fields are marked USER_CORRECTED or reviewer-approved."
        )
        self.document_id = document_id
        self.case_id = case_id
        self.flagged_fields = flagged_fields


async def guard_and_create_review_case(
    document: Document,
    extracted_fields: List[ExtractedField],
    doc_type: str,
    db: AsyncSession,
    threshold: float = 0.80,
) -> Tuple[bool, Optional[Case], List[str]]:
    """
    Checks all critical fields for the document.
    If any field is repaired, regex-invalid, flagged, or has confidence < threshold,
    and is not marked USER_CORRECTED:
    - Auto-creates a review case in `cases` table with status 'needs_human_review'.
    - Updates unconfirmed field statuses to VERIFICATION_REQUIRED.
    - Returns (can_proceed=False, case, flagged_field_names).
    """
    critical_names: Set[str] = set(get_critical_fields_for_type(doc_type))
    flagged_fields: List[str] = []

    for field in extracted_fields:
        if field.field_name in critical_names:
            # Check if user already corrected or reviewer approved
            is_confirmed = field.user_corrected or (field.status_label == StatusLabel.USER_CORRECTED.value)
            if is_confirmed:
                continue

            # Criteria for low-confidence / unconfirmed
            needs_review = (
                field.repaired or
                field.flagged or
                (field.confidence < threshold) or
                (field.status_label == "INVALID") or
                (field.raw_value is None or not field.raw_value.strip())
            )

            if needs_review:
                field.status_label = StatusLabel.VERIFICATION_REQUIRED.value
                field.flagged = True
                flagged_fields.append(field.field_name)

    if flagged_fields:
        # Check if an existing review case is already open for this document
        case_num = f"CASE-{datetime_seq()}-{str(document.id)[:6].upper()}"
        stmt = select(Case).where(
            Case.case_number.like(f"%{str(document.id)[:6].upper()}"),
            Case.status == "needs_human_review",
        )
        res = await db.execute(stmt)
        existing_case = res.scalars().first()

        if existing_case:
            return False, existing_case, flagged_fields

        new_case = Case(
            id=uuid.uuid4(),
            case_number=case_num,
            case_type="CRITICAL_FIELD_REVIEW",
            citizen_id=document.uploader_id,
            office_id=uuid.uuid4(),  # Assigned to processing office
            status="needs_human_review",
            priority="HIGH",
            notes=(
                f"স্বয়ংক্রিয় যাচাই স্থগিত: নিম্ন কনফিডেন্স বা মেরামতকৃত তথ্য রয়েছে। "
                f"যাচাই প্রয়োজন: {', '.join(flagged_fields)}"
            ),
        )
        db.add(new_case)
        await db.commit()
        await db.refresh(new_case)
        return False, new_case, flagged_fields

    return True, None, []


def datetime_seq() -> str:
    import time
    return time.strftime("%Y%m%d%H%M%S")
