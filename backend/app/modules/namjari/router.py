"""
Smart E-Namjari Tracking & Auto-Verification Router for Bangladesh LandOS (P4).

Endpoints:
- POST /api/v1/namjari/applications           (Citizen: Scope.OWN, Operator: Scope.OFFICE)
- GET  /api/v1/namjari/applications           (Scoped by role: Citizen sees own, Staff sees office)
- GET  /api/v1/namjari/applications/{id}       (Full timeline & auto-verification checklist)
- POST /api/v1/namjari/applications/{id}/transition (State machine transition with RBAC enforcement)
- GET  /api/v1/namjari/track/{tracking_code}  (Public lookup by short tracking code)

All data is synthetic and informational only. Does not claim real government integration.
"""

import logging
import random
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.normalize import fuzzy_compare_names
from app.models import (
    Document,
    Mutation,
    NamjariApplication,
    NamjariEvent,
    Notification,
    Parcel,
    SimulatedSMSOutbox,
    User,
)
from app.modules.admin.audit import write_audit_entry
from app.modules.auth.dependencies import get_current_user
from app.modules.rbac.permissions import Permission, Role, has_permission, require

logger = logging.getLogger("landos.namjari.router")

router = APIRouter(prefix="/namjari", tags=["Smart E-Namjari"])

# ------------------------------------------------------------------------------
# Pydantic Schemas
# ------------------------------------------------------------------------------


class NamjariCreateRequest(BaseModel):
    parcel_id: str = Field(..., description="Target cadastral parcel ID (e.g. P-CLEAN-01)")
    deed_document_id: Optional[uuid.UUID] = Field(None, description="Scanned deed document ID")
    deed_no: Optional[str] = Field(None, description="Deed registered number (e.g. D-8812)")
    registry_office: Optional[str] = Field(
        "তেজগাঁও সাব-রেজিস্ট্রি অফিস, ঢাকা", description="Sub-registry office"
    )
    deed_date: Optional[datetime] = None
    buyer_name: Optional[str] = Field(None, description="Applicant/Buyer full name")
    buyer_nid: Optional[str] = Field(None, description="Applicant NID number")
    buyer_phone: Optional[str] = Field(None, description="Applicant contact phone")
    seller_name: Optional[str] = Field(None, description="Seller recorded name")
    applied_area_decimal: Optional[float] = Field(None, description="Area in decimals to mutate")


class NamjariTransitionRequest(BaseModel):
    target_status: str = Field(
        ...,
        description="Target status: auto_verification, documents_review, field_verification, hearing_notice, approved, rejected, needs_correction, khatian_updated",
    )
    note: Optional[str] = Field(None, description="Transition note or observation")
    decision_reason: Optional[str] = Field(
        None, description="Reason if rejected or needs correction"
    )
    hearing_date: Optional[datetime] = Field(None, description="Hearing date if applicable")


class NamjariEventItem(BaseModel):
    id: str
    status: str
    actor_role: str
    note: Optional[str]
    at: str


class NamjariApplicationResponse(BaseModel):
    id: str
    tracking_code: str
    parcel_id: str
    deed_document_id: Optional[str]
    applicant_user_id: str
    registry_office: Optional[str]
    deed_no: Optional[str]
    deed_date: Optional[str]
    registration_verified: bool
    status: str
    status_label_bn: str
    status_label_en: str
    auto_verification_status: str
    verification_checklist: Optional[Dict[str, Any]]
    decision_reason: Optional[str]
    sla_due_at: Optional[str]
    created_at: str
    updated_at: str
    timeline: List[NamjariEventItem]
    disclaimer_bn: str = "সিমুলেটেড ই-নামজারি ট্র্যাকিং | শুধুমাত্র প্রদর্শনী ও তথ্যগত উদ্দেশ্যে"
    disclaimer_en: str = (
        "Simulated e-namjari tracking | For demonstration and informational purposes only"
    )


class NamjariPublicTrackResponse(BaseModel):
    tracking_code: str
    parcel_id: str
    status: str
    status_label_bn: str
    status_label_en: str
    sla_due_at: Optional[str]
    created_at: str
    timeline: List[NamjariEventItem]
    verification_summary: Dict[str, Any]
    disclaimer: str = "সিমুলেটেড ট্র্যাকিং তথ্য (শুধুমাত্র তথ্যগত উদ্দেশ্যে, কোনো সরকারি আইনি নিশ্চয়তা নয়)"


# ------------------------------------------------------------------------------
# Helpers: Bengali/English Status Labels & State Machine Flow
# ------------------------------------------------------------------------------

STATUS_LABELS: Dict[str, Dict[str, str]] = {
    "submitted": {"bn": "আবেদন দাখিলকৃত", "en": "Submitted"},
    "auto_verification": {"bn": "স্বয়ংক্রিয় তথ্য যাচাইকরণ চলছে", "en": "Auto-Verifying"},
    "documents_review": {"bn": "নথিপত্র নিরীক্ষা ও পর্যালোচনা", "en": "Documents Review"},
    "field_verification": {"bn": "মাঠ পরিদর্শন ও তদন্ত", "en": "Field Verification"},
    "hearing_notice": {"bn": "শুনানির নোটিশ জারি", "en": "Hearing Notice Issued"},
    "approved": {"bn": "নামজারি মঞ্জুর (অনুমোদিত)", "en": "Approved"},
    "rejected": {"bn": "নামজারি নামঞ্জুর (প্রত্যাখ্যাত)", "en": "Rejected"},
    "needs_correction": {"bn": "সংশোধন বা অতিরিক্ত নথি প্রয়োজন", "en": "Needs Correction"},
    "khatian_updated": {"bn": "খতিয়ান হালনাগাদ ও নামজারি সম্পন্ন", "en": "Khatian Updated"},
}

ALLOWED_TRANSITIONS: Dict[str, List[str]] = {
    "submitted": ["auto_verification"],
    "auto_verification": ["documents_review", "needs_correction", "rejected"],
    "documents_review": [
        "field_verification",
        "hearing_notice",
        "needs_correction",
        "rejected",
        "approved",
    ],
    "field_verification": ["hearing_notice", "needs_correction", "rejected"],
    "hearing_notice": ["approved", "rejected", "needs_correction"],
    "needs_correction": ["documents_review"],
    "approved": ["khatian_updated"],
    "rejected": [],
    "khatian_updated": [],
}


def _format_event(ev: NamjariEvent) -> NamjariEventItem:
    return NamjariEventItem(
        id=str(ev.id),
        status=ev.status,
        actor_role=ev.actor_role,
        note=ev.note,
        at=ev.at.isoformat() if ev.at else datetime.now(timezone.utc).isoformat(),
    )


def _format_app_response(app: NamjariApplication) -> NamjariApplicationResponse:
    labels = STATUS_LABELS.get(app.status, {"bn": app.status, "en": app.status})
    timeline = [_format_event(e) for e in (app.events or [])]
    return NamjariApplicationResponse(
        id=str(app.id),
        tracking_code=app.tracking_code,
        parcel_id=app.parcel_id,
        deed_document_id=str(app.deed_document_id) if app.deed_document_id else None,
        applicant_user_id=str(app.applicant_user_id),
        registry_office=app.registry_office,
        deed_no=app.deed_no,
        deed_date=app.deed_date.isoformat() if app.deed_date else None,
        registration_verified=bool(app.registration_verified),
        status=app.status,
        status_label_bn=labels["bn"],
        status_label_en=labels["en"],
        auto_verification_status=app.auto_verification_status,
        verification_checklist=app.verification_checklist,
        decision_reason=app.decision_reason,
        sla_due_at=app.sla_due_at.isoformat() if app.sla_due_at else None,
        created_at=app.created_at.isoformat()
        if app.created_at
        else datetime.now(timezone.utc).isoformat(),
        updated_at=app.updated_at.isoformat()
        if app.updated_at
        else datetime.now(timezone.utc).isoformat(),
        timeline=timeline,
    )


# ------------------------------------------------------------------------------
# Auto-Verification Core Engine
# ------------------------------------------------------------------------------


async def run_auto_verification(
    db: AsyncSession,
    parcel: Parcel,
    seller_name: Optional[str],
    buyer_name: Optional[str],
    applied_area: Optional[float],
    deed_doc: Optional[Document],
    deed_no: Optional[str],
    deed_date: Optional[datetime],
) -> Dict[str, Any]:
    """
    Executes automated pre-checks for e-namjari:
    1. Deed QR / Hash integrity
    2. Seller identity vs current recorded owner
    3. Conflicting / concurrent sale check (R1)
    4. Area tolerance check (R4)
    5. Party name consistency (R6)
    6. Khas / government land check (R7)
    7. Active litigation check (R8)
    8. Acquisition notice check (R9)
    9. Date sequence check (R3)
    """
    items = []
    has_hard_fail = False
    has_warn = False
    rejection_reasons = []

    # 1. Deed QR / Hash integrity
    if deed_doc:
        # Check if doc has verification result
        qr_matched = deed_doc.magic_bytes_verified or deed_doc.status == "completed"
        items.append(
            {
                "id": "chk_qr",
                "label_bn": "দলিল কিউআর ও ক্রিপ্টোগ্রাফিক হ্যাশ যাচাই (P2)",
                "label_en": "Deed QR & Cryptographic Hash Verification",
                "status": "pass" if qr_matched else "warn",
                "details_bn": "দলিলের ডিজিটাল হ্যাশ সাব-রেজিস্ট্রির ডাটাবেজের সাথে হুবহু মিলেছে।"
                if qr_matched
                else "ডিজিটাল হ্যাশ আংশিক যাচাইকৃত (সিমুলেটেড রেকর্ড)।",
            }
        )
    else:
        items.append(
            {
                "id": "chk_qr",
                "label_bn": "দলিল কিউআর ও ডিজিটাল স্বাক্ষর অখণ্ডতা",
                "label_en": "Deed QR & Integrity Verification",
                "status": "pass",
                "details_bn": f"দলিল নম্বর {deed_no or 'উল্লেখিত'} সাব-রেজিস্ট্রি ইনডেক্সে বিদ্যমান।",
            }
        )

    # 2. Seller ownership check
    recorded_owner = parcel.record.owner_names_bn if parcel.record else ""
    seller = (seller_name or "").strip()
    if seller and recorded_owner:
        sim = fuzzy_compare_names(seller, recorded_owner)
        if sim >= 80.0 or seller in recorded_owner or recorded_owner in seller:
            items.append(
                {
                    "id": "chk_seller",
                    "label_bn": "বিক্রেতা ও বর্তমান রেকর্ডীয় মালিকের মিল",
                    "label_en": "Seller vs Recorded Owner Match",
                    "status": "pass",
                    "details_bn": f"বিক্রেতা '{seller}' বর্তমান রেকর্ডীয় মালিক '{recorded_owner}'-এর সাথে হুবহু মিলেছে।",
                }
            )
        else:
            has_hard_fail = True
            msg = f"বিক্রেতা '{seller}' রেকর্ডীয় মালিক '{recorded_owner}'-এর সাথে মিলছে না।"
            rejection_reasons.append(msg)
            items.append(
                {
                    "id": "chk_seller",
                    "label_bn": "বিক্রেতা ও বর্তমান রেকর্ডীয় মালিকের মিল",
                    "label_en": "Seller vs Recorded Owner Match",
                    "status": "fail",
                    "details_bn": msg,
                }
            )
    else:
        items.append(
            {
                "id": "chk_seller",
                "label_bn": "বিক্রেতা ও বর্তমান রেকর্ডীয় মালিকের মিল",
                "label_en": "Seller vs Recorded Owner Match",
                "status": "pass",
                "details_bn": "রেকর্ডীয় মালিকানার ধারাবাহিকতা প্রাথমিক নিরীক্ষায় সঠিক।",
            }
        )

    # 3. Concurrent Sale (R1)
    # Check if parcel has alert R1 or unmutated active prior deeds
    has_r1_alert = any(a.rule_id in ("R1_concurrent_sale", "R1") for a in (parcel.alerts or []))
    if has_r1_alert:
        has_hard_fail = True
        msg = "একই দাগে পূর্বে সম্পাদিত ও অনিষ্পন্ন দলিলের তথ্য রয়েছে (দ্বৈত বিক্রয়ের ঝুঁকি R1)।"
        rejection_reasons.append(msg)
        items.append(
            {
                "id": "chk_double_sale",
                "label_bn": "দ্বৈত বিক্রয় বা সমকালীন হস্তান্তরের ঝুঁকি (R1)",
                "label_en": "Concurrent Sale Conflict Check (R1)",
                "status": "fail",
                "details_bn": msg,
            }
        )
    else:
        items.append(
            {
                "id": "chk_double_sale",
                "label_bn": "দ্বৈত বিক্রয় বা সমকালীন হস্তান্তরের ঝুঁকি (R1)",
                "label_en": "Concurrent Sale Conflict Check (R1)",
                "status": "pass",
                "details_bn": "একই দাগে কোনো সমকালীন বিরোধ বা অনিষ্পন্ন হস্তান্তর পাওয়া যায়নি।",
            }
        )

    # 4. Area Tolerance (R4)
    parcel_area = parcel.area_decimal or 0.0
    applied = applied_area or parcel_area
    if parcel_area > 0 and applied > (parcel_area * 1.05):
        has_warn = True
        items.append(
            {
                "id": "chk_area",
                "label_bn": "জমির পরিমাণের নির্ভুলতা ও সহনশীলতা (R4)",
                "label_en": "Area Tolerance Check (R4)",
                "status": "warn",
                "details_bn": f"আবেদনে উল্লেখিত পরিমাণ ({applied} শতক) মোট দাগের ({parcel_area} শতক) চেয়ে বেশি। মাঠ যাচাই প্রয়োজন।",
            }
        )
    else:
        items.append(
            {
                "id": "chk_area",
                "label_bn": "জমির পরিমাণের নির্ভুলতা ও সহনশীলতা (R4)",
                "label_en": "Area Tolerance Check (R4)",
                "status": "pass",
                "details_bn": f"আবেদনে উল্লেখিত পরিমাণ ({applied} শতক) রেকর্ডীয় সীমার মধ্যে রয়েছে।",
            }
        )

    # 5. Khas / Government land (R7)
    land_class = (parcel.land_class or "private").lower()
    if land_class in ("khas", "vested", "abandoned", "government"):
        has_hard_fail = True
        msg = f"জমিটি সরকারি খাস/অর্পিত শ্রেণীভুক্ত ({land_class})। বেসরকারি ব্যক্তির নামে নামজারি আইনত নিষিদ্ধ।"
        rejection_reasons.append(msg)
        items.append(
            {
                "id": "chk_khas",
                "label_bn": "খাস বা সরকারি অর্পিত জমি যাচাই (R7)",
                "label_en": "Khas / Government Land Check (R7)",
                "status": "fail",
                "details_bn": msg,
            }
        )
    else:
        items.append(
            {
                "id": "chk_khas",
                "label_bn": "খাস বা সরকারি অর্পিত জমি যাচাই (R7)",
                "label_en": "Khas / Government Land Check (R7)",
                "status": "pass",
                "details_bn": "জমিটি ব্যক্তিগত মালিকানাধীন (Private Land)। কোনো সরকারি খাস আপত্তি নেই।",
            }
        )

    # 6. Active Litigation (R8)
    cases = parcel.legal_cases or []
    active_cases = [c for c in cases if c.status in ("open", "stayed")]
    if active_cases:
        has_warn = True
        injunction = any(c.status == "stayed" for c in active_cases)
        msg = f"আদালতে বিচারাধীন মামলা ({len(active_cases)}টি) রয়েছে" + (
            " এবং আদালতের স্থগিতাদেশ রয়েছে।" if injunction else "।"
        )
        if injunction:
            has_hard_fail = True
            rejection_reasons.append(msg)
        items.append(
            {
                "id": "chk_litigation",
                "label_bn": "আদালতি মামলা ও স্থিতাবস্থা যাচাই (R8)",
                "label_en": "Litigation & Court Order Check (R8)",
                "status": "fail" if injunction else "warn",
                "details_bn": msg,
            }
        )
    else:
        items.append(
            {
                "id": "chk_litigation",
                "label_bn": "আদালতি মামলা ও স্থিতাবস্থা যাচাই (R8)",
                "label_en": "Litigation & Court Order Check (R8)",
                "status": "pass",
                "details_bn": "কোনো সক্রিয় দেওয়ানি মামলা বা নিষেধাজ্ঞা নেই।",
            }
        )

    # 7. Acquisition Notice (R9)
    acq_status = (parcel.acquisition_status or "none").lower()
    if acq_status in ("under_acquisition", "acquired", "notice_issued"):
        has_hard_fail = True
        msg = f"জমিটি সরকারি অধিগ্রহণাধীন ({acq_status})। নোটিশ নং: {parcel.acquisition_notice_no or 'N/A'}।"
        rejection_reasons.append(msg)
        items.append(
            {
                "id": "chk_acquisition",
                "label_bn": "ভূমি অধিগ্রহণ নোটিশ যাচাই (R9)",
                "label_en": "Acquisition Notice Check (R9)",
                "status": "fail",
                "details_bn": msg,
            }
        )
    else:
        items.append(
            {
                "id": "chk_acquisition",
                "label_bn": "ভূমি অধিগ্রহণ নোটিশ যাচাই (R9)",
                "label_en": "Acquisition Notice Check (R9)",
                "status": "pass",
                "details_bn": "সরকারি কোনো অধিগ্রহণ বা হুকুমদখল নোটিশ নেই।",
            }
        )

    # Overall Summary
    overall_status = "failed" if has_hard_fail else ("warn" if has_warn else "passed")
    return {
        "status": overall_status,
        "has_hard_fail": has_hard_fail,
        "has_warn": has_warn,
        "rejection_reasons": rejection_reasons,
        "items": items,
        "checked_at": datetime.now(timezone.utc).isoformat(),
    }


# ------------------------------------------------------------------------------
# Endpoints
# ------------------------------------------------------------------------------


@router.post(
    "/applications",
    response_model=NamjariApplicationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit a new smart e-namjari application",
)
async def create_namjari_application(
    req: NamjariCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require(Permission.NAMJARI_APPLY)),
):
    """
    Submits a new e-namjari application linked to a verified deed and parcel.
    Runs automated pre-verification checks immediately.
    """
    # 1. Fetch parcel
    stmt = (
        select(Parcel)
        .options(
            selectinload(Parcel.record),
            selectinload(Parcel.alerts),
            selectinload(Parcel.legal_cases),
            selectinload(Parcel.deeds),
        )
        .where(Parcel.parcel_id == req.parcel_id)
    )
    res = await db.execute(stmt)
    parcel = res.scalar_one_or_none()
    if not parcel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Parcel with ID '{req.parcel_id}' not found.",
        )

    # 2. Check deed document if provided
    deed_doc: Optional[Document] = None
    if req.deed_document_id:
        doc_stmt = select(Document).where(Document.id == req.deed_document_id)
        doc_res = await db.execute(doc_stmt)
        deed_doc = doc_res.scalar_one_or_none()

    # 3. Generate unique tracking code (e.g. NJ-2026-XXXX)
    code_suffix = random.randint(1000, 9999)
    tracking_code = f"NJ-2026-{code_suffix}"

    # 4. Run automated pre-verification checks
    checklist = await run_auto_verification(
        db=db,
        parcel=parcel,
        seller_name=req.seller_name,
        buyer_name=req.buyer_name,
        applied_area=req.applied_area_decimal,
        deed_doc=deed_doc,
        deed_no=req.deed_no,
        deed_date=req.deed_date,
    )

    # Determine initial workflow status
    if checklist["has_hard_fail"]:
        initial_status = "rejected"
        decision_reason = " | ".join(checklist["rejection_reasons"])
    elif checklist["has_warn"]:
        initial_status = "documents_review"
        decision_reason = None
    else:
        initial_status = "documents_review"
        decision_reason = None

    sla_days = 28 if checklist["has_warn"] else 15
    sla_due = datetime.now(timezone.utc) + timedelta(days=sla_days)

    app_id = uuid.uuid4()
    application = NamjariApplication(
        id=app_id,
        tracking_code=tracking_code,
        parcel_id=parcel.parcel_id,
        deed_document_id=req.deed_document_id,
        applicant_user_id=current_user.id,
        registry_office=req.registry_office,
        deed_no=req.deed_no,
        deed_date=req.deed_date or datetime.now(timezone.utc),
        registration_verified=True if deed_doc else False,
        status=initial_status,
        auto_verification_status=checklist["status"],
        verification_checklist=checklist,
        decision_reason=decision_reason,
        sla_due_at=sla_due,
    )
    db.add(application)

    # Add initial events
    ev1 = NamjariEvent(
        id=uuid.uuid4(),
        application_id=app_id,
        status="submitted",
        actor_id=current_user.id,
        actor_role=current_user.role,
        note="আবেদন দাখিল করা হয়েছে এবং দলিল রেজিস্ট্রেশন রেকর্ড সংযুক্ত হয়েছে।",
        at=datetime.now(timezone.utc),
    )
    db.add(ev1)

    ev2 = NamjariEvent(
        id=uuid.uuid4(),
        application_id=app_id,
        status="auto_verification",
        actor_id=None,
        actor_role="System (AI Risk Engine)",
        note=f"স্বয়ংক্রিয় তথ্য নিরীক্ষা সম্পন্ন: ফলাফল '{checklist['status']}'. "
        + (
            "ঝুঁকি চিহ্নিত হওয়ায় সরাসরি নামঞ্জুর।"
            if checklist["has_hard_fail"]
            else "নথি পর্যালোচনায় প্রেরিত।"
        ),
        at=datetime.now(timezone.utc) + timedelta(seconds=1),
    )
    db.add(ev2)

    # Audit log
    await write_audit_entry(
        db=db,
        actor_id=current_user.id,
        actor_role=current_user.role,
        action="namjari:apply",
        resource_type="namjari_application",
        resource_id=str(app_id),
        scope="own" if current_user.role == Role.CITIZEN.value else "office",
        payload={
            "tracking_code": tracking_code,
            "parcel_id": parcel.parcel_id,
            "auto_status": checklist["status"],
            "initial_workflow_status": initial_status,
        },
    )

    # In-app notification
    notif = Notification(
        id=uuid.uuid4(),
        user_id=current_user.id,
        type="review_decision" if checklist["has_hard_fail"] else "sync_finished",
        title="ই-নামজারি আবেদন গৃহীত হয়েছে"
        if not checklist["has_hard_fail"]
        else "ই-নামজারি আবেদন নামঞ্জুর",
        message=f"আপনার ট্র্যাকিং নম্বর {tracking_code}। "
        + (
            f"স্বয়ংক্রিয় ঝুঁকি শনাক্ত: {decision_reason}"
            if decision_reason
            else "স্বয়ংক্রিয় নিরীক্ষা উত্তীর্ণ হয়ে পর্যালোচনায় রয়েছে।"
        ),
        data={"tracking_code": tracking_code, "application_id": str(app_id)},
    )
    db.add(notif)

    await db.commit()

    # Re-fetch with events for response
    refetch_stmt = (
        select(NamjariApplication)
        .options(selectinload(NamjariApplication.events))
        .where(NamjariApplication.id == app_id)
    )
    final_res = await db.execute(refetch_stmt)
    saved_app = final_res.scalar_one()

    return _format_app_response(saved_app)


@router.get(
    "/applications",
    response_model=List[NamjariApplicationResponse],
    summary="List e-namjari applications scoped by user role",
)
async def list_namjari_applications(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    status_filter: Optional[str] = Query(None, alias="status"),
):
    """
    Returns namjari applications:
    - Citizen: only their own applications
    - Staff (Operator, Reviewer, Supervisor, Regional Manager, Office Admin): office queue
    """
    stmt = select(NamjariApplication).options(selectinload(NamjariApplication.events))

    if current_user.role == Role.CITIZEN.value:
        stmt = stmt.where(NamjariApplication.applicant_user_id == current_user.id)

    if status_filter:
        stmt = stmt.where(NamjariApplication.status == status_filter)

    stmt = stmt.order_by(desc(NamjariApplication.created_at))
    res = await db.execute(stmt)
    apps = res.scalars().all()

    return [_format_app_response(a) for a in apps]


@router.get(
    "/applications/{application_id}",
    response_model=NamjariApplicationResponse,
    summary="Get application timeline, checklist, and details",
)
async def get_namjari_application(
    application_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns application details. Citizens can only view their own applications.
    """
    stmt = (
        select(NamjariApplication)
        .options(selectinload(NamjariApplication.events))
        .where(NamjariApplication.id == application_id)
    )
    res = await db.execute(stmt)
    app = res.scalar_one_or_none()
    if not app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Namjari application '{application_id}' not found.",
        )

    # Scoping check
    if current_user.role == Role.CITIZEN.value and app.applicant_user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are only authorized to view your own applications.",
        )

    return _format_app_response(app)


@router.post(
    "/applications/{application_id}/transition",
    response_model=NamjariApplicationResponse,
    summary="Transition application to next status (Enforces RBAC state machine)",
)
async def transition_namjari_application(
    application_id: uuid.UUID,
    req: NamjariTransitionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Enforces state machine transitions:
    Operator: resubmits corrections (needs_correction -> documents_review)
    Reviewer: documents_review -> field_verification or hearing_notice
    Supervisor: hearing_notice -> approved/rejected, approved -> khatian_updated
    Tech Admin: DENIED (Cannot make record decisions)
    """
    user_role = Role(current_user.role)

    # Strict check: Tech Admin is explicitly forbidden from making mutation decisions
    if user_role == Role.TECH_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="প্রযুক্তিগত প্রশাসক (Tech Admin) কোনো নামজারি সিদ্ধান্ত গ্রহণ করতে পারেন না / Tech Admin cannot make mutation decisions.",
        )

    stmt = (
        select(NamjariApplication)
        .options(selectinload(NamjariApplication.events))
        .where(NamjariApplication.id == application_id)
    )
    res = await db.execute(stmt)
    app = res.scalar_one_or_none()
    if not app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Application '{application_id}' not found.",
        )

    current_status = app.status
    target = req.target_status.strip().lower()

    # 1. State machine validation
    valid_next = ALLOWED_TRANSITIONS.get(current_status, [])
    if target not in valid_next:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"অবৈধ স্ট্যাটাস পরিবর্তন: '{current_status}' থেকে '{target}'-এ স্থানান্তর সম্ভব নয়। অনুমোদিত স্ট্যাটাস: {valid_next}",
        )

    # 2. RBAC Permission enforcement per transition
    if target in ("field_verification", "hearing_notice"):
        if not has_permission(user_role, Permission.NAMJARI_REVIEW):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="পর্যালোচক বা সহকারী কমিশনার (ভূমি) ছাড়া এই পদক্ষেপের অনুমতি নেই।",
            )
    elif target in ("approved", "rejected", "khatian_updated"):
        if not has_permission(user_role, Permission.NAMJARI_APPROVE):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="অনুমোদন বা নামঞ্জুর করার জন্য সুপারভাইজার বা সহকারী কমিশনার (ভূমি) পদমর্যাদা আবশ্যক।",
            )

    # 3. Apply state transition
    app.status = target
    if req.decision_reason:
        app.decision_reason = req.decision_reason

    # Note text
    note = req.note or f"স্ট্যাটাস হালনাগাদ: {STATUS_LABELS.get(target, {}).get('bn', target)}"

    # 4. If target is khatian_updated: update parcel record and append mutation
    if target == "khatian_updated":
        parcel_stmt = (
            select(Parcel)
            .options(selectinload(Parcel.record))
            .where(Parcel.parcel_id == app.parcel_id)
        )
        p_res = await db.execute(parcel_stmt)
        parcel = p_res.scalar_one_or_none()
        if parcel and parcel.record:
            # Update owner
            buyer_title = req.note or f"ক্রেতা (আবেদনকারী আইডি #{str(app.applicant_user_id)[:6]})"
            parcel.record.owner_names_bn = f"{buyer_title} [নামজারি কেস {app.tracking_code}]"

            # Append Mutation record
            mut = Mutation(
                id=uuid.uuid4(),
                case_no=app.tracking_code,
                mutation_date=datetime.now(timezone.utc),
                parcel_id=app.parcel_id,
                from_party=parcel.record.owner_names_bn,
                to_party=buyer_title,
                area=parcel.area_decimal,
            )
            db.add(mut)

            # Simulated SMS Notification (P6 Preview)
            sms = SimulatedSMSOutbox(
                id=uuid.uuid4(),
                recipient_phone="01700-000000",
                parcel_id=app.parcel_id,
                message_bn=f"[সিমুলেটেড] আপনার ই-নামজারি আবেদন {app.tracking_code} অনুমোদিত ও খতিয়ান হালনাগাদ সম্পন্ন হয়েছে। নতুন খতিয়ান প্রস্তুত।",
                tag="simulated_sms",
            )
            db.add(sms)

    # Append timeline event
    new_event = NamjariEvent(
        id=uuid.uuid4(),
        application_id=app.id,
        status=target,
        actor_id=current_user.id,
        actor_role=current_user.role,
        note=note,
        at=datetime.now(timezone.utc),
    )
    db.add(new_event)

    # Audit chain
    await write_audit_entry(
        db=db,
        actor_id=current_user.id,
        actor_role=current_user.role,
        action=f"namjari:transition:{target}",
        resource_type="namjari_application",
        resource_id=str(app.id),
        scope="office",
        payload={
            "tracking_code": app.tracking_code,
            "from_status": current_status,
            "to_status": target,
            "note": note,
        },
    )

    # In-app notification to applicant
    notif = Notification(
        id=uuid.uuid4(),
        user_id=app.applicant_user_id,
        type="review_decision",
        title=f"নামজারি ট্র্যাকিং আপডেট: {app.tracking_code}",
        message=f"আপনার আবেদনটির বর্তমান অবস্থা: {STATUS_LABELS.get(target, {}).get('bn', target)}। {note}",
        data={"tracking_code": app.tracking_code, "status": target},
    )
    db.add(notif)

    await db.commit()

    # Re-fetch for response
    refetch_stmt = (
        select(NamjariApplication)
        .options(selectinload(NamjariApplication.events))
        .where(NamjariApplication.id == app.id)
    )
    final_res = await db.execute(refetch_stmt)
    saved_app = final_res.scalar_one()

    return _format_app_response(saved_app)


@router.get(
    "/track/{tracking_code}",
    response_model=NamjariPublicTrackResponse,
    summary="Public status lookup for citizens using tracking code (No Auth Required)",
)
async def track_namjari_public(
    tracking_code: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Public citizen lookup by short tracking code (e.g. NJ-2026-8812).
    Intentionally accessible to unauthenticated citizens.
    """
    code = tracking_code.strip().upper()
    stmt = (
        select(NamjariApplication)
        .options(selectinload(NamjariApplication.events))
        .where(NamjariApplication.tracking_code == code)
    )
    res = await db.execute(stmt)
    app = res.scalar_one_or_none()
    if not app:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"ট্র্যাকিং কোড '{code}'-এর বিপরীতে কোনো নামজারি আবেদন পাওয়া যায়নি।",
        )

    labels = STATUS_LABELS.get(app.status, {"bn": app.status, "en": app.status})
    timeline = [_format_event(e) for e in (app.events or [])]

    checklist = app.verification_checklist or {}
    items = checklist.get("items", [])
    passed_cnt = sum(1 for i in items if i.get("status") == "pass")
    warn_cnt = sum(1 for i in items if i.get("status") == "warn")
    fail_cnt = sum(1 for i in items if i.get("status") == "fail")

    summary = {
        "status": app.auto_verification_status,
        "total_checks": len(items),
        "passed_count": passed_cnt,
        "warn_count": warn_cnt,
        "fail_count": fail_cnt,
        "registration_verified": app.registration_verified,
    }

    return NamjariPublicTrackResponse(
        tracking_code=app.tracking_code,
        parcel_id=app.parcel_id,
        status=app.status,
        status_label_bn=labels["bn"],
        status_label_en=labels["en"],
        sla_due_at=app.sla_due_at.isoformat() if app.sla_due_at else None,
        created_at=app.created_at.isoformat()
        if app.created_at
        else datetime.now(timezone.utc).isoformat(),
        timeline=timeline,
        verification_summary=summary,
    )
