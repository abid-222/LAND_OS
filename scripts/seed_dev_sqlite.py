#!/usr/bin/env python3
"""
Seeds the local development SQLite database (landos_dev.db) with:
1. 8 RBAC demo accounts (Citizen, Operator, Reviewer, Supervisor, Office Admin, Regional Manager, Security Officer, Tech Admin)
2. Regions & Upazila AC Land Offices
3. 40 Mouzas
4. 5,250 Land records
5. 12 Grounded Knowledge Base articles
6. Cadastral demo parcels and conflict deeds
"""

import asyncio
import glob
import json
import os
import sys
import uuid
from datetime import datetime, timedelta, timezone

current_dir = os.path.dirname(os.path.abspath(__file__))
repo_root = os.path.abspath(os.path.join(current_dir, ".."))
backend_dir = os.path.join(repo_root, "backend")

for p in [repo_root, backend_dir]:
    if p not in sys.path:
        sys.path.insert(0, p)

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from app.core.config import settings
from app.core.database import Base
from app.core.security import hash_password
from app.models import (
    Region, Office, User, Mouza, LandRecord, Document, ExtractedField,
    Case, Alert, AuditLog, BuyerReport, KBArticle, Deed, Mutation,
    QRCheck, VerificationResult, ConsentRecord, FeedbackCorrection, Notification, Parcel,
    LegalCase, NamjariApplication, NamjariEvent, ParcelWatch, SimulatedSMSOutbox
)
from app.modules.rbac.permissions import Role

DB_FILE = os.path.join(repo_root, "landos_dev.db")
SQLITE_URL = f"sqlite+aiosqlite:///{DB_FILE.replace(chr(92), '/')}"

DEMO_PASSWORD = os.getenv("DEMO_PASSWORD", "Password123!")
DEMO_MFA_SECRET = os.getenv("DEMO_MFA_SECRET", "JBSWY3DPEHPK3PXP")

def utc_now():
    return datetime.now(timezone.utc)

def parse_frontmatter(content: str) -> tuple[dict, str]:
    if not content.startswith("---"):
        return {}, content
    parts = content.split("---", 2)
    if len(parts) < 3:
        return {}, content
    fm_text = parts[1]
    body = parts[2].strip()
    meta = {}
    for line in fm_text.strip().splitlines():
        if ":" in line:
            key, val = line.split(":", 1)
            meta[key.strip()] = val.strip().strip('"').strip("'")
    return meta, body

async def seed():
    if os.path.exists(DB_FILE):
        try:
            os.remove(DB_FILE)
            print("Removed existing dev database for fresh seed.")
        except Exception:
            pass
    print(f"Connecting to {SQLITE_URL}...")
    engine = create_async_engine(SQLITE_URL, echo=False)

    target_table_names = [
        "regions", "offices", "users", "mouzas", "land_records",
        "documents", "extracted_fields", "cases", "alerts",
        "audit_logs", "buyer_reports", "kb_articles", "deeds",
        "mutations", "qr_checks", "verification_results",
        "consent_records", "feedback_corrections", "notifications",
        "parcels", "legal_cases", "namjari_applications", "namjari_events",
        "parcel_watches", "simulated_sms_outbox",
    ]
    target_tables = [
        Base.metadata.tables[name]
        for name in target_table_names
        if name in Base.metadata.tables
    ]

    async with engine.begin() as conn:
        await conn.run_sync(lambda sync_conn: Base.metadata.drop_all(sync_conn, tables=list(reversed(target_tables))))
        await conn.run_sync(lambda sync_conn: Base.metadata.create_all(sync_conn, tables=target_tables))

    session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with session_maker() as session:
        # 1. Regions
        reg_dhaka = Region(
            id=uuid.uuid4(),
            code="REG_DHAKA",
            name_bn="ঢাকা বিভাগ",
            name_en="Dhaka Division",
            division="Dhaka",
        )
        reg_ctg = Region(
            id=uuid.uuid4(),
            code="REG_CTG",
            name_bn="চট্টগ্রাম বিভাগ",
            name_en="Chattogram Division",
            division="Chattogram",
        )
        session.add_all([reg_dhaka, reg_ctg])
        await session.commit()

        # 2. Offices
        off_tejgaon = Office(
            id=uuid.uuid4(),
            code="OFF-TEJGAON",
            name_bn="সহকারী কমিশনার (ভূমি) কার্যালয়, তেজগাঁও সার্কেল",
            name_en="AC Land Office, Tejgaon",
            office_type="AC_LAND",
            region_id=reg_dhaka.id,
        )
        session.add(off_tejgaon)
        await session.commit()

        # 3. Demo Users
        hashed_pw = hash_password(DEMO_PASSWORD)
        demo_users = [
            ("citizen@landos.gov.bd", "Citizen", "নাগরিক ডেমো ব্যবহারকারী", "Demo Citizen User", None, None, False, None),
            ("operator@landos.gov.bd", "Operator", "ইউনিয়ন ভূমি সহকারী কর্মকর্তা", "Union Land Assistant Officer", off_tejgaon.id, reg_dhaka.id, False, None),
            ("reviewer@landos.gov.bd", "Reviewer", "কানুনগো / সার্ভেয়ার পর্যালোচক", "Kanungo / Survey Reviewer", off_tejgaon.id, reg_dhaka.id, False, None),
            ("supervisor@landos.gov.bd", "Supervisor", "সহকারী কমিশনার (ভূমি) পর্যবেক্ষক", "Assistant Commissioner (Land) Supervisor", off_tejgaon.id, reg_dhaka.id, False, None),
            ("officeadmin@landos.gov.bd", "Office Admin", "উপজেলা ভূমি রেকর্ড কর্মকর্তা", "Upazila Land Administrator", off_tejgaon.id, reg_dhaka.id, False, None),
            ("regionalmanager@landos.gov.bd", "Regional Manager", "অতিরিক্ত জেলা প্রশাসক (রাজস্ব)", "Additional Deputy Commissioner (Revenue)", None, reg_dhaka.id, False, None),
            ("securityofficer@landos.gov.bd", "Security Officer", "সাইবার নিরাপত্তা কর্মকর্তা", "Cyber Security Officer", None, None, True, DEMO_MFA_SECRET),
            ("techadmin@landos.gov.bd", "Tech Admin", "সিস্টেম টেকনিক্যাল অ্যাডমিন", "System Technical Administrator", off_tejgaon.id, reg_dhaka.id, True, DEMO_MFA_SECRET),
        ]
        demo_user_map = {}
        for email, role, bn, en, off_id, reg_id, mfa, secret in demo_users:
            u_id = uuid.uuid4()
            u = User(
                id=u_id,
                email=email,
                phone="01700000000",
                full_name_bn=bn,
                full_name_en=en,
                hashed_password=hashed_pw,
                role=role,
                office_id=off_id,
                region_id=reg_id,
                is_active=True,
                mfa_enabled=mfa,
                mfa_secret=secret,
            )
            session.add(u)
            demo_user_map[role] = u_id
        await session.commit()
        print("Seeded 8 RBAC demo accounts.")

        # 4. Mouzas
        from data.synthetic.bangla_data import MOUZAS
        mouza_db_map = {}
        for m in MOUZAS:
            m_obj = Mouza(
                id=uuid.uuid4(),
                jl_no=m["jl_no"],
                name_bn=m["name_bn"],
                name_en=m["name_en"],
                upazila=m["upazila"],
                district=m["district"],
                office_id=off_tejgaon.id,
            )
            session.add(m_obj)
            mouza_db_map[m["name_en"]] = m_obj.id
        await session.commit()
        print(f"Seeded {len(MOUZAS)} mouzas.")

        # 5. Land Records (5,250 records)
        rec_path = os.path.join(repo_root, "data", "seed", "land_records_5000.json")
        if os.path.exists(rec_path):
            with open(rec_path, "r", encoding="utf-8") as f:
                records = json.load(f)
            default_m_id = list(mouza_db_map.values())[0]
            batch = []
            for r in records:
                m_id = mouza_db_map.get(r.get("mouza_name_en"), default_m_id)
                batch.append(
                    LandRecord(
                        id=uuid.UUID(r["id"]) if "id" in r else uuid.uuid4(),
                        record_no=r["record_no"],
                        mouza_id=m_id,
                        survey_type=r["survey_type"],
                        khatian_no=r["khatian_no"],
                        dag_no=r["dag_no"],
                        main_no=r.get("main_no"),
                        sub_no=r.get("sub_no"),
                        owner_names_bn=r["owner_names_bn"],
                        land_class_bn=r["land_type"],
                        area_acres=r["area_acres"],
                        status="ACTIVE",
                        trust_status=r.get("trust_status", "POSSIBLE_MATCH"),
                        raw_metadata={
                            "source_ref": r.get("source_ref", "SYNTHETIC-DEMO"),
                            "version": r.get("version", 1),
                            "area_decimal": r.get("area_decimal"),
                        },
                    )
                )
                if len(batch) >= 500:
                    session.add_all(batch)
                    await session.commit()
                    batch = []
            if batch:
                session.add_all(batch)
                await session.commit()
            print(f"Seeded {len(records)} land records.")

        # 6. Seed Demo Parcels, Conflict Deeds, Mutations, and Legal Cases
        conflict_file = os.path.join(repo_root, "data", "synthetic", "conflict_truth.json")
        default_m_id = list(mouza_db_map.values())[0]

        if os.path.exists(conflict_file):
            with open(conflict_file, "r", encoding="utf-8") as f:
                c_data = json.load(f)
            c_parcels = c_data.get("parcels", [])
            for p_item in c_parcels:
                acq_date = None
                if p_item.get("acquisition_notice_date"):
                    try:
                        acq_date = datetime.fromisoformat(p_item["acquisition_notice_date"].replace("Z", "+00:00"))
                    except Exception:
                        pass

                p_obj = Parcel(
                    parcel_id=p_item["parcel_id"],
                    record_id=None,
                    mouza_id=default_m_id,
                    main_no=p_item["main_no"],
                    sub_no=p_item.get("sub_no"),
                    area_decimal=p_item["area_decimal"],
                    land_class=p_item.get("land_class", "private"),
                    acquisition_status=p_item.get("acquisition_status", "none"),
                    acquisition_notice_no=p_item.get("acquisition_notice_no"),
                    acquisition_notice_date=acq_date,
                    acquisition_authority=p_item.get("acquisition_authority"),
                )
                session.add(p_obj)
                await session.flush()

                for d_item in p_item.get("deeds", []):
                    try:
                        d_date = datetime.fromisoformat(d_item["deed_date"].replace("Z", "+00:00"))
                    except Exception:
                        d_date = utc_now()
                    try:
                        r_date = datetime.fromisoformat(d_item["registered_date"].replace("Z", "+00:00"))
                    except Exception:
                        r_date = d_date
                    ar_val = d_item.get("area", p_item["area_decimal"])
                    if isinstance(ar_val, str):
                        import re
                        m_re = re.search(r"(\d+(?:\.\d+)?)", ar_val)
                        ar_val = float(m_re.group(1)) if m_re else p_item["area_decimal"]

                    session.add(Deed(
                        id=uuid.uuid4(),
                        deed_no=d_item.get("deed_no", "D-0"),
                        deed_type=d_item.get("deed_type", "sale"),
                        registry_office=d_item.get("registry_office", "তেজগাঁও সাব-রেজিস্ট্রি অফিস"),
                        deed_date=d_date,
                        registered_date=r_date,
                        seller=d_item.get("seller", "বিক্রেতা"),
                        buyer=d_item.get("buyer", "ক্রেতা"),
                        parcel_id=p_item["parcel_id"],
                        area=float(ar_val),
                    ))

                for m_item in p_item.get("mutations", []):
                    try:
                        m_date = datetime.fromisoformat(m_item["mutation_date"].replace("Z", "+00:00"))
                    except Exception:
                        m_date = utc_now()
                    m_ar = m_item.get("area", p_item["area_decimal"])
                    if isinstance(m_ar, str):
                        import re
                        m_re = re.search(r"(\d+(?:\.\d+)?)", m_ar)
                        m_ar = float(m_re.group(1)) if m_re else p_item["area_decimal"]

                    session.add(Mutation(
                        id=uuid.uuid4(),
                        case_no=m_item.get("case_no", "MC-0"),
                        mutation_date=m_date,
                        deed_id=None,
                        parcel_id=p_item["parcel_id"],
                        from_party=m_item.get("from_party", "পক্ষ"),
                        to_party=m_item.get("to_party", "পক্ষ"),
                        area=float(m_ar),
                    ))

                for lc_item in p_item.get("legal_cases", []):
                    f_date = None
                    if lc_item.get("filed_date"):
                        try:
                            f_date = datetime.fromisoformat(lc_item["filed_date"].replace("Z", "+00:00"))
                        except Exception:
                            f_date = utc_now()

                    session.add(LegalCase(
                        id=uuid.uuid4(),
                        parcel_id=p_item["parcel_id"],
                        case_no=lc_item["case_no"],
                        court=lc_item["court"],
                        case_type=lc_item.get("type", "title_suit"),
                        status=lc_item.get("status", "open"),
                        filed_date=f_date,
                        parties=lc_item.get("parties", ""),
                        summary=lc_item.get("summary", ""),
                    ))

            await session.commit()
            print(f"Seeded {len(c_parcels)} cadastral parcels with deeds, mutations, and legal cases.")

        # Also ensure P-4520 exists
        p_4520 = Parcel(
            parcel_id="P-4520",
            mouza_id=default_m_id,
            main_no=1205,
            sub_no=None,
            area_decimal=33.0,
            land_class="private",
            acquisition_status="none",
        )
        session.add(p_4520)
        session.add_all([
            Deed(
                id=uuid.uuid4(),
                parcel_id="P-4520",
                deed_no="DEED-2023-01",
                deed_type="sale",
                registry_office="Tejgaon",
                seller="আব্দুর রহিম",
                buyer="মোহাম্মদ রফিকুল ইসলাম",
                area=25.0,
                deed_date=datetime(2023, 1, 15, tzinfo=timezone.utc),
                registered_date=datetime(2023, 1, 16, tzinfo=timezone.utc),
            ),
            Deed(
                id=uuid.uuid4(),
                parcel_id="P-4520",
                deed_no="DEED-2023-02",
                deed_type="sale",
                registry_office="Tejgaon",
                seller="আব্দুর রহিম",
                buyer="করিম উল্লাহ",
                area=25.0,
                deed_date=datetime(2023, 2, 20, tzinfo=timezone.utc),
                registered_date=datetime(2023, 2, 21, tzinfo=timezone.utc),
            )
        ])
        await session.commit()

        # 7. Seed Demo E-Namjari Applications (P4)
        citizen_id = demo_user_map.get("Citizen")
        operator_id = demo_user_map.get("Operator")
        reviewer_id = demo_user_map.get("Reviewer")
        supervisor_id = demo_user_map.get("Supervisor")

        demo_apps = [
            {
                "tracking_code": "NJ-2026-1001",
                "parcel_id": "P-CLEAN-01",
                "status": "khatian_updated",
                "auto_status": "passed",
                "deed_no": "D-2023-8812",
                "sla_days": 15,
                "reason": None,
                "events": [
                    ("submitted", "Citizen", "আবেদন দাখিল করা হয়েছে এবং রেজিস্ট্রেশন দলিল সংযুক্ত।"),
                    ("auto_verification", "System (AI Risk Engine)", "স্বয়ংক্রিয় তথ্য নিরীক্ষা সম্পন্ন: শতভাগ নির্ভুল।"),
                    ("documents_review", "Reviewer", "মূল দলিল ও নামজারি পূর্বশর্তাবলী সঠিক পাওয়া গেছে।"),
                    ("hearing_notice", "Reviewer", "উভয় পক্ষের উপস্থিতিতে শুনানি সম্পন্ন হয়েছে।"),
                    ("approved", "Supervisor", "সহকারী কমিশনার (ভূমি) কর্তৃক নামজারি প্রস্তাব অনুমোদিত।"),
                    ("khatian_updated", "Supervisor", "নতুন খতিয়ান প্রস্তুত ও ভূমি রেকর্ড হালনাগাদ সম্পন্ন।"),
                ],
            },
            {
                "tracking_code": "NJ-2026-1002",
                "parcel_id": "P-CLEAN-02",
                "status": "approved",
                "auto_status": "passed",
                "deed_no": "D-2024-1025",
                "sla_days": 15,
                "reason": None,
                "events": [
                    ("submitted", "Citizen", "অনলাইনে ই-নামজারি আবেদন দাখিলকৃত।"),
                    ("auto_verification", "System (AI Risk Engine)", "স্বয়ংক্রিয় প্রি-ভেরিফিকেশন সম্পন্ন: কোনো অসঙ্গতি নেই।"),
                    ("documents_review", "Reviewer", "নথিপত্র যাচাই সম্পন্ন।"),
                    ("hearing_notice", "Reviewer", "শুনানি সম্পন্ন হয়েছে।"),
                    ("approved", "Supervisor", "নামজারি মঞ্জুর করা হলো। ডিএইচসি ফি জমাদান সাপেক্ষে খতিয়ান প্রস্তুত হবে।"),
                ],
            },
            {
                "tracking_code": "NJ-2026-1003",
                "parcel_id": "P-CLEAN-03",
                "status": "hearing_notice",
                "auto_status": "passed",
                "deed_no": "D-2024-3058",
                "sla_days": 21,
                "reason": None,
                "events": [
                    ("submitted", "Operator", "ইউনিয়ন ভূমি অফিসের মাধ্যমে আবেদন জমা হয়েছে।"),
                    ("auto_verification", "System (AI Risk Engine)", "স্বয়ংক্রিয় নিরীক্ষা উত্তীর্ণ।"),
                    ("documents_review", "Reviewer", "কাগজপত্র সঠিক।"),
                    ("hearing_notice", "Reviewer", "আগামী শুনানির নোটিশ জারি করা হলো।"),
                ],
            },
            {
                "tracking_code": "NJ-2026-1004",
                "parcel_id": "P-4520",
                "status": "rejected",
                "auto_status": "failed",
                "deed_no": "DEED-2023-02",
                "sla_days": 7,
                "reason": "দ্বৈত বিক্রয় ঝুঁকি (R1): একই দাগে পূর্বে সম্পাদিত ও অনিষ্পন্ন হস্তান্তর বিদ্যমান।",
                "events": [
                    ("submitted", "Citizen", "আবেদন দাখিল করা হয়েছে।"),
                    ("auto_verification", "System (AI Risk Engine)", "স্বয়ংক্রিয় নিরীক্ষায় দ্বৈত বিক্রয় (R1) অসঙ্গতি চিহ্নিত।"),
                    ("rejected", "Supervisor", "স্বয়ংক্রিয় ঝুঁকি ইঞ্জিন দ্বারা দ্বৈত বিক্রয়ের প্রমাণ পাওয়ায় আবেদন নামঞ্জুর।"),
                ],
            },
            {
                "tracking_code": "NJ-2026-1005",
                "parcel_id": "P-KHAS-01",
                "status": "rejected",
                "auto_status": "failed",
                "deed_no": "D-2024-7714",
                "sla_days": 7,
                "reason": "খাস জমি (R7): সরকারি খাস/অর্পিত জমিতে ব্যক্তিমালিকানাধীন নামজারি আইনত নিষিদ্ধ।",
                "events": [
                    ("submitted", "Citizen", "আবেদন দাখিল করা হয়েছে।"),
                    ("auto_verification", "System (AI Risk Engine)", "খাস জমি (R7) শ্রেণীভুক্ত জমি শনাক্ত হয়েছে।"),
                    ("rejected", "Supervisor", "সরকারি খাস জমিতে নামজারি আইনত নিষিদ্ধ হওয়ায় নামঞ্জুর।"),
                ],
            },
            {
                "tracking_code": "NJ-2026-1006",
                "parcel_id": "P-LIT-01",
                "status": "documents_review",
                "auto_status": "warn",
                "deed_no": "D-2024-5129",
                "sla_days": 28,
                "reason": "আদালতে দেওয়ানি মামলা বিচারাধীন রয়েছে (R8)।",
                "events": [
                    ("submitted", "Citizen", "আবেদন দাখিলকৃত।"),
                    ("auto_verification", "System (AI Risk Engine)", "আদালতে দেওয়ানি মামলা সম্পর্কিত সতর্কতা জারি।"),
                    ("documents_review", "Reviewer", "আদালতের কোনো স্থগিতাদেশ আছে কিনা তা নিরীক্ষা চলছে।"),
                ],
            },
            {
                "tracking_code": "NJ-2026-1007",
                "parcel_id": "P-CLEAN-04",
                "status": "field_verification",
                "auto_status": "warn",
                "deed_no": "D-2024-6041",
                "sla_days": 25,
                "reason": None,
                "events": [
                    ("submitted", "Citizen", "অনলাইনে আবেদন দাখিলকৃত।"),
                    ("auto_verification", "System (AI Risk Engine)", "স্বয়ংক্রিয় নিরীক্ষা সম্পন্ন।"),
                    ("documents_review", "Reviewer", "জমির দাগের সীমানা পুনর্নির্ধারণ প্রয়োজন।"),
                    ("field_verification", "Reviewer", "ইউনিয়ন ভূমি সহকারী কর্মকর্তাকে সরেজমিন তদন্তের দায়িত্ব দেওয়া হলো।"),
                ],
            },
            {
                "tracking_code": "NJ-2026-1008",
                "parcel_id": "P-CLEAN-05",
                "status": "needs_correction",
                "auto_status": "warn",
                "deed_no": "D-2024-9182",
                "sla_days": 14,
                "reason": "ওয়ারিশান সনদ অস্পষ্ট। হালনাগাদ মূল সনদ আপলোড আবশ্যক।",
                "events": [
                    ("submitted", "Citizen", "আবেদন দাখিলকৃত।"),
                    ("auto_verification", "System (AI Risk Engine)", "স্বয়ংক্রিয় নিরীক্ষা সম্পন্ন।"),
                    ("documents_review", "Reviewer", "সংযুক্ত ওয়ারিশান সনদ অস্পষ্ট।"),
                    ("needs_correction", "Supervisor", "সংশোধিত ওয়ারিশান সনদসহ পুনরায় প্রেরণের নির্দেশ।"),
                ],
            },
        ]

        now = datetime.now(timezone.utc)
        for app_info in demo_apps:
            a_id = uuid.uuid4()
            app_obj = NamjariApplication(
                id=a_id,
                tracking_code=app_info["tracking_code"],
                parcel_id=app_info["parcel_id"],
                deed_document_id=None,
                applicant_user_id=citizen_id,
                registry_office="তেজগাঁও সাব-রেজিস্ট্রি অফিস, ঢাকা",
                deed_no=app_info["deed_no"],
                deed_date=now,
                registration_verified=True,
                status=app_info["status"],
                auto_verification_status=app_info["auto_status"],
                verification_checklist={
                    "status": app_info["auto_status"],
                    "items": [
                        {"id": "chk_qr", "label_bn": "দলিল কিউআর ও অখণ্ডতা", "status": "pass"},
                        {"id": "chk_seller", "label_bn": "মালিকানার ধারাবাহিকতা", "status": "pass"},
                        {
                            "id": "chk_double_sale",
                            "label_bn": "দ্বৈত বিক্রয় ঝুঁকি (R1)",
                            "status": "fail" if app_info["tracking_code"] == "NJ-2026-1004" else "pass",
                        },
                        {
                            "id": "chk_khas",
                            "label_bn": "খাস জমি যাচাই (R7)",
                            "status": "fail" if app_info["tracking_code"] == "NJ-2026-1005" else "pass",
                        },
                    ],
                },
                decision_reason=app_info["reason"],
                sla_due_at=now + timedelta(days=app_info["sla_days"]),
                created_at=now - timedelta(days=5),
            )
            session.add(app_obj)
            await session.flush()

            for step_idx, (st, role_name, note_txt) in enumerate(app_info["events"]):
                actor = demo_user_map.get(role_name)
                session.add(
                    NamjariEvent(
                        id=uuid.uuid4(),
                        application_id=a_id,
                        status=st,
                        actor_id=actor,
                        actor_role=role_name,
                        note=note_txt,
                        at=now - timedelta(days=5 - step_idx),
                    )
                )

        await session.commit()
        print(f"Seeded {len(demo_apps)} demo e-namjari applications with full timelines.")

        # 8. Seed Parcel Guardian Watches & Simulated SMS Outbox (P6)
        citizen_user_id = demo_user_map.get("Citizen")
        if citizen_user_id:
            watches = [
                ParcelWatch(
                    id=uuid.uuid4(),
                    user_id=citizen_user_id,
                    parcel_id="P-4520",
                    is_active=True,
                    created_at=now - timedelta(days=3),
                ),
                ParcelWatch(
                    id=uuid.uuid4(),
                    user_id=citizen_user_id,
                    parcel_id="P-CLEAN-01",
                    is_active=True,
                    created_at=now - timedelta(days=2),
                ),
            ]
            session.add_all(watches)

            sms_notifications = [
                SimulatedSMSOutbox(
                    id=uuid.uuid4(),
                    recipient_phone="01711-223344",
                    parcel_id="P-4520",
                    message_bn="[সিমুলেটেড এসএমএস] বাংলাদেশ ল্যান্ডওএস: পার্সেল P-4520-এর জন্য গার্ডিয়ান ওয়াচ সক্রিয় হয়েছে। নতুন কোনো নামজারি আবেদন বা বিরোধ আসলে অবহিত করা হবে।",
                    tag="simulated",
                    sent_at=now - timedelta(days=3),
                ),
                SimulatedSMSOutbox(
                    id=uuid.uuid4(),
                    recipient_phone="01711-223344",
                    parcel_id="P-4520",
                    message_bn="[সিমুলেটেড এসএমএস] ল্যান্ডওএস গার্ডিয়ান সতর্কতা: আপনার পর্যবেক্ষণকৃত পার্সেল P-4520-এ সম্ভাব্য দ্বৈত বিক্রয় অসঙ্গতি (R1) শনাক্ত হয়েছে। যাচাই করুন: landos.gov.bd",
                    tag="simulated",
                    sent_at=now - timedelta(days=1),
                ),
                SimulatedSMSOutbox(
                    id=uuid.uuid4(),
                    recipient_phone="01711-223344",
                    parcel_id="P-CLEAN-01",
                    message_bn="[সিমুলেটেড এসএমএস] বাংলাদেশ ল্যান্ডওএস: পার্সেল P-CLEAN-01-এর জন্য গার্ডিয়ান ওয়াচ সক্রিয় হয়েছে। নতুন কোনো পরিবর্তন হলে তাৎক্ষণিক জানানো হবে।",
                    tag="simulated",
                    sent_at=now - timedelta(days=2),
                ),
                SimulatedSMSOutbox(
                    id=uuid.uuid4(),
                    recipient_phone="01711-223344",
                    parcel_id="P-CLEAN-01",
                    message_bn="[সিমুলেটেড এসএমএস] বাংলাদেশ ল্যান্ডওএস: নামজারি আবেদন NJ-2026-1001 অনুমোদিত হয়েছে এবং খতিয়ান হালনাগাদ সম্পন্ন হয়েছে।",
                    tag="simulated",
                    sent_at=now - timedelta(hours=4),
                ),
            ]
            session.add_all(sms_notifications)
            await session.commit()
            print(f"Seeded {len(watches)} parcel watches and {len(sms_notifications)} simulated SMS notifications.")

        # 9. KB Articles
        kb_files = glob.glob(os.path.join(repo_root, "data", "kb", "*.md"))
        for f_path in kb_files:
            slug = os.path.splitext(os.path.basename(f_path))[0]
            with open(f_path, "r", encoding="utf-8") as f:
                content = f.read()
            meta, body = parse_frontmatter(content)
            title = meta.get("title", slug.replace("_", " ").title())
            category = meta.get("category", "General")
            kb_obj = KBArticle(
                id=uuid.uuid4(),
                title=title,
                content=body,
                source=meta.get("source", "Ministry of Land, Bangladesh"),
                category=category,
                last_verified_at=datetime.now(timezone.utc),
            )
            session.add(kb_obj)
        await session.commit()
        print(f"Seeded {len(kb_files)} grounded KB articles.")

    await engine.dispose()
    print("Database seeding COMPLETE!")

if __name__ == "__main__":
    asyncio.run(seed())
