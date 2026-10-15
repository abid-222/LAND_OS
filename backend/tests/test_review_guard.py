"""
Unit tests for Human-in-the-Loop Review Guard.
Tests:
- Auto-creation of review cases when critical fields have low confidence or were repaired
- Prevention of automatic verification on unconfirmed critical fields
- Permission to proceed once fields are marked USER_CORRECTED
"""

import uuid

import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.models import Case, Document, ExtractedField, StatusLabel
from app.modules.review.service import guard_and_create_review_case


@pytest.fixture
async def memory_db():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Case.__table__.create)
        await conn.run_sync(Document.__table__.create)
        await conn.run_sync(ExtractedField.__table__.create)

    session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with session_maker() as session:
        yield session

    await engine.dispose()


@pytest.mark.asyncio
async def test_low_confidence_critical_field_creates_case(memory_db: AsyncSession):
    doc_id = uuid.uuid4()
    uploader_id = uuid.uuid4()

    doc = Document(
        id=doc_id,
        file_name="deed_test.jpg",
        file_key="uploads/deed_test.jpg",
        mime_type="image/jpeg",
        file_size=1024,
        uploader_id=uploader_id,
    )

    fields = [
        ExtractedField(
            id=uuid.uuid4(),
            document_id=doc_id,
            field_name="dag_no",
            raw_value="১২০৫",
            confidence=0.65,  # < 0.80 threshold!
            repaired=False,
            flagged=False,
            user_corrected=False,
        ),
        ExtractedField(
            id=uuid.uuid4(),
            document_id=doc_id,
            field_name="mouza",
            raw_value="তেজগাঁও",
            confidence=0.95,
            repaired=False,
            flagged=False,
            user_corrected=False,
        ),
    ]

    can_proceed, case, flagged = await guard_and_create_review_case(
        document=doc,
        extracted_fields=fields,
        doc_type="deed",
        db=memory_db,
        threshold=0.80,
    )

    assert can_proceed is False
    assert "dag_no" in flagged
    assert case is not None
    assert case.status == "needs_human_review"
    assert case.case_type == "CRITICAL_FIELD_REVIEW"
    assert fields[0].status_label == StatusLabel.VERIFICATION_REQUIRED.value


@pytest.mark.asyncio
async def test_user_corrected_critical_field_can_proceed(memory_db: AsyncSession):
    doc_id = uuid.uuid4()
    uploader_id = uuid.uuid4()

    doc = Document(
        id=doc_id,
        file_name="deed_test.jpg",
        file_key="uploads/deed_test.jpg",
        mime_type="image/jpeg",
        file_size=1024,
        uploader_id=uploader_id,
    )

    fields = [
        ExtractedField(
            id=uuid.uuid4(),
            document_id=doc_id,
            field_name="dag_no",
            raw_value="১২০৫",
            confidence=0.65,
            repaired=True,
            flagged=False,
            user_corrected=True,  # User confirmed/corrected!
            status_label=StatusLabel.USER_CORRECTED.value,
        ),
        ExtractedField(
            id=uuid.uuid4(),
            document_id=doc_id,
            field_name="mouza",
            raw_value="তেজগাঁও",
            confidence=0.95,
            repaired=False,
            flagged=False,
            user_corrected=False,
        ),
        ExtractedField(
            id=uuid.uuid4(),
            document_id=doc_id,
            field_name="document_no",
            raw_value="৪৫৮২",
            confidence=0.92,
            repaired=False,
            flagged=False,
            user_corrected=False,
        ),
        ExtractedField(
            id=uuid.uuid4(),
            document_id=doc_id,
            field_name="registry_office",
            raw_value="তেজগাঁও সাব-রেজিস্ট্রি",
            confidence=0.90,
            repaired=False,
            flagged=False,
            user_corrected=False,
        ),
        ExtractedField(
            id=uuid.uuid4(),
            document_id=doc_id,
            field_name="document_date",
            raw_value="২০২১-০১-০১",
            confidence=0.88,
            repaired=False,
            flagged=False,
            user_corrected=False,
        ),
    ]

    can_proceed, case, flagged = await guard_and_create_review_case(
        document=doc,
        extracted_fields=fields,
        doc_type="deed",
        db=memory_db,
        threshold=0.80,
    )

    assert can_proceed is True
    assert case is None
    assert len(flagged) == 0
