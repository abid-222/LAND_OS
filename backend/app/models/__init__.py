import uuid
from datetime import datetime, timezone
from typing import Optional

from geoalchemy2 import Geometry
from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    JSON,
    BigInteger,
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Region(Base):
    __tablename__ = "regions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    name_bn: Mapped[str] = mapped_column(String(100), nullable=False)
    name_en: Mapped[str] = mapped_column(String(100), nullable=False)
    division: Mapped[str] = mapped_column(String(100), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    offices = relationship("Office", back_populates="region")

    __table_args__ = (
        Index(
            "idx_regions_name_bn_trgm",
            "name_bn",
            postgresql_using="gin",
            postgresql_ops={"name_bn": "gin_trgm_ops"},
        ),
    )


class Office(Base):
    __tablename__ = "offices"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    name_bn: Mapped[str] = mapped_column(String(150), nullable=False)
    name_en: Mapped[str] = mapped_column(String(150), nullable=False)
    office_type: Mapped[str] = mapped_column(String(50), nullable=False)
    region_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("regions.id"), nullable=False
    )
    address: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    region = relationship("Region", back_populates="offices")
    users = relationship("User", back_populates="office")
    mouzas = relationship("Mouza", back_populates="office")

    __table_args__ = (
        Index(
            "idx_offices_name_bn_trgm",
            "name_bn",
            postgresql_using="gin",
            postgresql_ops={"name_bn": "gin_trgm_ops"},
        ),
    )


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, index=True)
    full_name_bn: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    full_name_en: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(50), nullable=False, default="Citizen", index=True)
    office_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("offices.id"), nullable=True
    )
    region_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("regions.id"), nullable=True
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    mfa_secret: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    mfa_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )

    office = relationship("Office", back_populates="users")
    documents = relationship("Document", back_populates="uploader")

    __table_args__ = (
        Index(
            "idx_users_name_bn_trgm",
            "full_name_bn",
            postgresql_using="gin",
            postgresql_ops={"full_name_bn": "gin_trgm_ops"},
        ),
    )


class Mouza(Base):
    __tablename__ = "mouzas"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    jl_no: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    name_bn: Mapped[str] = mapped_column(String(100), nullable=False)
    name_en: Mapped[str] = mapped_column(String(100), nullable=False)
    upazila: Mapped[str] = mapped_column(String(100), nullable=False)
    district: Mapped[str] = mapped_column(String(100), nullable=False)
    office_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("offices.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    office = relationship("Office", back_populates="mouzas")
    land_records = relationship("LandRecord", back_populates="mouza")
    parcels = relationship("ParcelDemo", back_populates="mouza")

    __table_args__ = (
        Index(
            "idx_mouzas_name_bn_trgm",
            "name_bn",
            postgresql_using="gin",
            postgresql_ops={"name_bn": "gin_trgm_ops"},
        ),
    )


class LandRecord(Base):
    __tablename__ = "land_records"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    record_no: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    mouza_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("mouzas.id"), nullable=False
    )
    survey_type: Mapped[str] = mapped_column(String(50), nullable=False)
    khatian_no: Mapped[str] = mapped_column(String(50), nullable=False)
    dag_no: Mapped[str] = mapped_column(String(50), nullable=False)
    owner_names_bn: Mapped[str] = mapped_column(Text, nullable=False)
    land_class_bn: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    area_acres: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="ACTIVE")
    trust_status: Mapped[str] = mapped_column(String(50), default="POSSIBLE_MATCH")
    raw_metadata: Mapped[Optional[dict]] = mapped_column(
        JSONB().with_variant(JSON, "sqlite"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )

    mouza = relationship("Mouza", back_populates="land_records")
    match_candidates = relationship("MatchCandidate", back_populates="land_record")

    __table_args__ = (
        # Composite index: (mouza_id, khatian_no, dag_no)
        Index("idx_land_records_mouza_khatian_dag", "mouza_id", "khatian_no", "dag_no"),
        # GIN trigram index on owner_names_bn
        Index(
            "idx_land_records_owners_trgm",
            "owner_names_bn",
            postgresql_using="gin",
            postgresql_ops={"owner_names_bn": "gin_trgm_ops"},
        ),
    )


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_key: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)
    magic_bytes_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    upload_status: Mapped[str] = mapped_column(String(50), default="PENDING")
    uploader_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    uploader = relationship("User", back_populates="documents")
    extracted_fields = relationship(
        "ExtractedField", back_populates="document", cascade="all, delete-orphan"
    )


class ExtractedField(Base):
    __tablename__ = "extracted_fields"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("documents.id"), nullable=False
    )
    field_name: Mapped[str] = mapped_column(String(100), nullable=False)
    raw_value: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    normalized_value: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    trust_status: Mapped[str] = mapped_column(String(50), default="OCR_EXTRACTED")
    bbox: Mapped[Optional[dict]] = mapped_column(
        JSONB().with_variant(JSON, "sqlite"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    document = relationship("Document", back_populates="extracted_fields")
    match_candidates = relationship(
        "MatchCandidate", back_populates="extracted_field", cascade="all, delete-orphan"
    )


class MatchCandidate(Base):
    __tablename__ = "match_candidates"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    extracted_field_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("extracted_fields.id"), nullable=False
    )
    land_record_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("land_records.id"), nullable=False
    )
    similarity_score: Mapped[float] = mapped_column(Float, nullable=False)
    match_type: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="CANDIDATE")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    extracted_field = relationship("ExtractedField", back_populates="match_candidates")
    land_record = relationship("LandRecord", back_populates="match_candidates")


class Case(Base):
    __tablename__ = "cases"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    case_number: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    case_type: Mapped[str] = mapped_column(String(50), nullable=False)
    citizen_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    assigned_reviewer_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    office_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("offices.id"), nullable=False
    )
    status: Mapped[str] = mapped_column(String(50), default="SUBMITTED")
    priority: Mapped[str] = mapped_column(String(50), default="NORMAL")
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )

    __table_args__ = (
        # Partial index on cases(status) for active unresolved workflows
        Index(
            "idx_cases_status_partial",
            "status",
            postgresql_where=Column("status").notin_(["APPROVED", "REJECTED", "CLOSED"]),
        ),
    )


class KBArticle(Base):
    __tablename__ = "kb_articles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    source: Mapped[str] = mapped_column(String(255), nullable=False)
    last_verified_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    # 768-dimensional vector embedding for multilingual LandOS retriever
    embedding = mapped_column(Vector(768), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    __table_args__ = (
        # HNSW index on vector(768) embeddings with cosine distance
        Index(
            "idx_kb_articles_embedding_hnsw",
            "embedding",
            postgresql_using="hnsw",
            postgresql_with={"m": 16, "ef_construction": 64},
            postgresql_ops={"embedding": "vector_cosine_ops"},
        ),
    )


class ParcelDemo(Base):
    __tablename__ = "parcels_demo"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    parcel_number: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    mouza_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("mouzas.id"), nullable=False
    )
    khatian_no: Mapped[str] = mapped_column(String(50), nullable=False)
    dag_no: Mapped[str] = mapped_column(String(50), nullable=False)
    geom = mapped_column(Geometry("POLYGON", srid=4326), nullable=True)
    area_sqm: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    land_class: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    mouza = relationship("Mouza", back_populates="parcels")

    __table_args__ = (
        # GiST spatial index on polygon geometry
        Index("idx_parcels_demo_geom_gist", "geom", postgresql_using="gist"),
    )


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sequence_id: Mapped[int] = mapped_column(
        BigInteger, primary_key=False, autoincrement=True, unique=True
    )
    prev_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    current_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    actor_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    actor_role: Mapped[str] = mapped_column(String(50), nullable=False)
    action: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    resource_type: Mapped[str] = mapped_column(String(100), nullable=False)
    resource_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    scope: Mapped[str] = mapped_column(String(50), nullable=False)
    payload: Mapped[dict] = mapped_column(JSONB().with_variant(JSON, "sqlite"), nullable=False)
    ip_address: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, index=True
    )


class EvalRun(Base):
    __tablename__ = "eval_runs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    run_type: Mapped[str] = mapped_column(String(100), nullable=False)
    dataset_name: Mapped[str] = mapped_column(String(100), nullable=False)
    metrics: Mapped[dict] = mapped_column(JSONB().with_variant(JSON, "sqlite"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
