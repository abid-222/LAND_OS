"""
Unit Tests for Feature 8: Document Intelligence v2.
Acceptance Criteria:
- Deed, Khatian and Porcha fixtures extract number, mouza, dag, area (+ original unit) and names.
- Low-confidence critical field creates a review case (cases table, status 'needs_human_review').
"""

import os
import sys
import uuid

import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

# Ensure backend directory is in sys.path when executed directly
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.abspath(os.path.join(current_dir, ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.models import Base, Document  # noqa: E402
from app.modules.documents.doc_intelligence import DocumentIntelligenceV2  # noqa: E402


@pytest.fixture
async def memory_db():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    target_tables = [
        Base.metadata.tables["cases"],
        Base.metadata.tables["documents"],
        Base.metadata.tables["extracted_fields"],
    ]
    async with engine.begin() as conn:
        await conn.run_sync(
            lambda sync_conn: Base.metadata.create_all(sync_conn, tables=target_tables)
        )

    session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with session_maker() as session:
        yield session

    await engine.dispose()


@pytest.mark.asyncio
async def test_deed_fixture_extraction_and_units():
    fixture_deed = {
        "document_no": "৪৫৮২/২০২১",
        "mouza": "তেজগাঁও",
        "dag_no": "১২০৫/১",
        "area": "৩৩ শতাংশ",
        "seller": "মো: আব্দুল করিম",
        "buyer": "রফিকুল ইসলাম",
        "confidences": {
            "document_no": 0.98,
            "mouza": 0.97,
            "dag_no": 0.99,
            "area": 0.95,
            "seller": 0.96,
            "buyer": 0.95,
        },
    }

    extracted = DocumentIntelligenceV2.extract_from_fixture("deed", fixture_deed)

    # 1. Number extraction
    assert "document_no" in extracted
    assert extracted["document_no"].normalized_value == "4582/2021"

    # 2. Mouza extraction
    assert "mouza" in extracted
    assert extracted["mouza"].normalized_value == "তেজগাঁও"

    # 3. Dag extraction
    assert "dag_no" in extracted
    assert extracted["dag_no"].normalized_value == "1205/1"

    # 4. Area (+ original unit) extraction
    assert "area" in extracted
    assert extracted["area"].area_decimal == 33.0
    assert extracted["area"].original_unit == "শতাংশ"

    # 5. Names extraction
    assert "seller" in extracted
    assert "buyer" in extracted
    assert extracted["seller"].normalized_value == "আব্দুল করিম"
    assert extracted["buyer"].normalized_value == "রফিকুল ইসলাম"


@pytest.mark.asyncio
async def test_khatian_fixture_extraction_and_units():
    fixture_khatian = {
        "khatian_no": "৩৪0",
        "mouza": "ধানমন্ডি",
        "dag_no": "৪৫২",
        "area": "২ বিঘা",
        "owner": "মো: রফিকুল ইসলাম",
        "confidences": {
            "khatian_no": 0.99,
            "mouza": 0.98,
            "dag_no": 0.97,
            "area": 0.94,
            "owner": 0.96,
        },
    }

    # With region DHAKA: 1 bigha = 33.06 decimal -> 2 bigha = 66.12 decimal
    extracted = DocumentIntelligenceV2.extract_from_fixture(
        "khatian", fixture_khatian, region_code="DHAKA"
    )

    assert "khatian_no" in extracted
    assert extracted["khatian_no"].normalized_value == "340"
    assert extracted["mouza"].normalized_value == "ধানমন্ডি"
    assert extracted["dag_no"].normalized_value == "452"
    assert extracted["area"].original_unit == "বিঘা"
    assert extracted["area"].area_decimal is not None
    assert extracted["owner"].normalized_value == "রফিকুল ইসলাম"


@pytest.mark.asyncio
async def test_porcha_fixture_extraction_and_units():
    fixture_porcha = {
        "khatian_no": "৭৮৯",
        "mouza": "মিরপুর",
        "dag_no": "১০১২/২",
        "area": "৫ কাঠা",
        "owner": "বেগম ফাতেমা খাতুন",
        "confidences": {
            "khatian_no": 0.96,
            "mouza": 0.95,
            "dag_no": 0.96,
            "area": 0.93,
            "owner": 0.95,
        },
    }

    extracted = DocumentIntelligenceV2.extract_from_fixture(
        "porcha", fixture_porcha, region_code="DHAKA"
    )

    assert "khatian_no" in extracted
    assert extracted["khatian_no"].normalized_value == "789"
    assert extracted["mouza"].normalized_value == "মিরপুর"
    assert extracted["dag_no"].normalized_value == "1012/2"
    assert extracted["area"].original_unit == "কাঠা"
    assert extracted["owner"].normalized_value == "ফাতেমা খাতুন"


@pytest.mark.asyncio
async def test_low_confidence_critical_field_creates_review_case(memory_db: AsyncSession):
    doc_id = uuid.uuid4()
    uploader_id = uuid.uuid4()
    doc = Document(
        id=doc_id,
        file_name="porcha_scan.jpg",
        file_key="uploads/porcha_scan.jpg",
        mime_type="image/jpeg",
        file_size=2048,
        uploader_id=uploader_id,
    )

    fixture_low_conf = {
        "khatian_no": "৭৮৯",
        "mouza": "মিরপুর",
        "dag_no": "১০১২",
        "area": "১৫ শতাংশ",
        "owner": "ফাতেমা খাতুন",
        "confidences": {
            "khatian_no": 0.96,
            "mouza": 0.95,
            "dag_no": 0.62,  # < 0.80 threshold! Critical field!
            "area": 0.93,
            "owner": 0.95,
        },
    }

    extracted, can_proceed, case, flagged = await DocumentIntelligenceV2.process_document_and_guard(
        doc_type="porcha",
        fixture_data=fixture_low_conf,
        document=doc,
        db=memory_db,
        confidence_threshold=0.80,
    )

    assert can_proceed is False
    assert "dag_no" in flagged
    assert case is not None
    assert case.status == "needs_human_review"
    assert case.case_type == "CRITICAL_FIELD_REVIEW"
    assert case.notes is not None and "dag_no" in case.notes


@pytest.mark.asyncio
async def test_clean_fixture_can_proceed_without_review_case(memory_db: AsyncSession):
    doc_id = uuid.uuid4()
    uploader_id = uuid.uuid4()
    doc = Document(
        id=doc_id,
        file_name="clean_deed.jpg",
        file_key="uploads/clean_deed.jpg",
        mime_type="image/jpeg",
        file_size=2048,
        uploader_id=uploader_id,
    )

    clean_fixture = {
        "document_no": "৪৫৮২",
        "mouza": "তেজগাঁও",
        "dag_no": "১২০৫",
        "area": "৩৩ শতাংশ",
        "seller": "আব্দুল করিম",
        "buyer": "রফিকুল ইসলাম",
        "confidences": {
            "document_no": 0.95,
            "mouza": 0.95,
            "dag_no": 0.95,
            "area": 0.95,
            "seller": 0.95,
            "buyer": 0.95,
        },
    }

    extracted, can_proceed, case, flagged = await DocumentIntelligenceV2.process_document_and_guard(
        doc_type="deed",
        fixture_data=clean_fixture,
        document=doc,
        db=memory_db,
        confidence_threshold=0.80,
    )

    assert can_proceed is True
    assert case is None
    assert len(flagged) == 0


if __name__ == "__main__":
    sys.exit(pytest.main([__file__, "-v"]))
