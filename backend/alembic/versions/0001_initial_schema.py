"""Initial database schema with extensions and optimized indexes

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-10-15 00:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from geoalchemy2 import Geometry
from pgvector.sqlalchemy import Vector
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0001_initial_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Enable required PostgreSQL extensions
    op.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')
    op.execute('CREATE EXTENSION IF NOT EXISTS "postgis"')
    op.execute('CREATE EXTENSION IF NOT EXISTS "pg_trgm"')
    op.execute('CREATE EXTENSION IF NOT EXISTS "vector"')

    # 2. Regions
    op.create_table(
        "regions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("code", sa.String(50), nullable=False, unique=True),
        sa.Column("name_bn", sa.String(100), nullable=False),
        sa.Column("name_en", sa.String(100), nullable=False),
        sa.Column("division", sa.String(100), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index(
        "idx_regions_name_bn_trgm",
        "regions",
        ["name_bn"],
        postgresql_using="gin",
        postgresql_ops={"name_bn": "gin_trgm_ops"},
    )

    # 3. Offices
    op.create_table(
        "offices",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("code", sa.String(50), nullable=False, unique=True),
        sa.Column("name_bn", sa.String(150), nullable=False),
        sa.Column("name_en", sa.String(150), nullable=False),
        sa.Column("office_type", sa.String(50), nullable=False),
        sa.Column(
            "region_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("regions.id"), nullable=False
        ),
        sa.Column("address", sa.String(255), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index(
        "idx_offices_name_bn_trgm",
        "offices",
        ["name_bn"],
        postgresql_using="gin",
        postgresql_ops={"name_bn": "gin_trgm_ops"},
    )

    # 4. Users
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("phone", sa.String(50), nullable=True),
        sa.Column("full_name_bn", sa.String(150), nullable=True),
        sa.Column("full_name_en", sa.String(150), nullable=True),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("role", sa.String(50), nullable=False, server_default="Citizen"),
        sa.Column(
            "office_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("offices.id"), nullable=True
        ),
        sa.Column(
            "region_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("regions.id"), nullable=True
        ),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("mfa_secret", sa.String(64), nullable=True),
        sa.Column("mfa_enabled", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index("idx_users_email", "users", ["email"])
    op.create_index("idx_users_role", "users", ["role"])
    op.create_index(
        "idx_users_name_bn_trgm",
        "users",
        ["full_name_bn"],
        postgresql_using="gin",
        postgresql_ops={"full_name_bn": "gin_trgm_ops"},
    )

    # 5. Mouzas
    op.create_table(
        "mouzas",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("jl_no", sa.String(50), nullable=False),
        sa.Column("name_bn", sa.String(100), nullable=False),
        sa.Column("name_en", sa.String(100), nullable=False),
        sa.Column("upazila", sa.String(100), nullable=False),
        sa.Column("district", sa.String(100), nullable=False),
        sa.Column(
            "office_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("offices.id"), nullable=True
        ),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index("idx_mouzas_jl_no", "mouzas", ["jl_no"])
    op.create_index(
        "idx_mouzas_name_bn_trgm",
        "mouzas",
        ["name_bn"],
        postgresql_using="gin",
        postgresql_ops={"name_bn": "gin_trgm_ops"},
    )

    # 6. Land Records
    op.create_table(
        "land_records",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("record_no", sa.String(100), nullable=False, unique=True),
        sa.Column(
            "mouza_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("mouzas.id"), nullable=False
        ),
        sa.Column("survey_type", sa.String(50), nullable=False),
        sa.Column("khatian_no", sa.String(50), nullable=False),
        sa.Column("dag_no", sa.String(50), nullable=False),
        sa.Column("owner_names_bn", sa.Text(), nullable=False),
        sa.Column("land_class_bn", sa.String(100), nullable=True),
        sa.Column("area_acres", sa.Float(), nullable=True),
        sa.Column("status", sa.String(50), server_default="ACTIVE", nullable=False),
        sa.Column("trust_status", sa.String(50), server_default="POSSIBLE_MATCH", nullable=False),
        sa.Column("raw_metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    # Composite Index: (mouza_id, khatian_no, dag_no)
    op.create_index(
        "idx_land_records_mouza_khatian_dag", "land_records", ["mouza_id", "khatian_no", "dag_no"]
    )
    # GIN trigram index on owner_names_bn
    op.execute(
        "CREATE INDEX idx_land_records_owners_trgm ON land_records USING gin (owner_names_bn gin_trgm_ops)"
    )

    # 7. Documents
    op.create_table(
        "documents",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("file_name", sa.String(255), nullable=False),
        sa.Column("file_key", sa.String(255), nullable=False, unique=True),
        sa.Column("mime_type", sa.String(100), nullable=False),
        sa.Column("file_size", sa.Integer(), nullable=False),
        sa.Column("magic_bytes_verified", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("upload_status", sa.String(50), server_default="PENDING", nullable=False),
        sa.Column(
            "uploader_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False
        ),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )

    # 8. Extracted Fields
    op.create_table(
        "extracted_fields",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "document_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("documents.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("field_name", sa.String(100), nullable=False),
        sa.Column("raw_value", sa.Text(), nullable=True),
        sa.Column("normalized_value", sa.Text(), nullable=True),
        sa.Column("confidence", sa.Float(), server_default="0.0", nullable=False),
        sa.Column("trust_status", sa.String(50), server_default="OCR_EXTRACTED", nullable=False),
        sa.Column("bbox", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )

    # 9. Match Candidates
    op.create_table(
        "match_candidates",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "extracted_field_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("extracted_fields.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "land_record_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("land_records.id"),
            nullable=False,
        ),
        sa.Column("similarity_score", sa.Float(), nullable=False),
        sa.Column("match_type", sa.String(50), nullable=False),
        sa.Column("status", sa.String(50), server_default="CANDIDATE", nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )

    # 10. Cases
    op.create_table(
        "cases",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("case_number", sa.String(100), nullable=False, unique=True),
        sa.Column("case_type", sa.String(50), nullable=False),
        sa.Column(
            "citizen_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False
        ),
        sa.Column(
            "assigned_reviewer_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=True,
        ),
        sa.Column(
            "office_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("offices.id"), nullable=False
        ),
        sa.Column("status", sa.String(50), server_default="SUBMITTED", nullable=False),
        sa.Column("priority", sa.String(50), server_default="NORMAL", nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    # Partial Index: cases(status) for open / active cases
    op.execute(
        "CREATE INDEX idx_cases_status_partial ON cases (status) WHERE status NOT IN ('APPROVED', 'REJECTED', 'CLOSED')"
    )

    # 11. KB Articles with Vector(768)
    op.create_table(
        "kb_articles",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("source", sa.String(255), nullable=False),
        sa.Column("last_verified_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("category", sa.String(100), nullable=False),
        sa.Column("embedding", Vector(768), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    # HNSW Index on vector embeddings
    op.execute(
        "CREATE INDEX idx_kb_articles_embedding_hnsw ON kb_articles USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64)"
    )

    # 12. Parcels Demo (with PostGIS Geometry)
    op.create_table(
        "parcels_demo",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("parcel_number", sa.String(100), nullable=False, unique=True),
        sa.Column(
            "mouza_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("mouzas.id"), nullable=False
        ),
        sa.Column("khatian_no", sa.String(50), nullable=False),
        sa.Column("dag_no", sa.String(50), nullable=False),
        sa.Column("geom", Geometry(geometry_type="POLYGON", srid=4326), nullable=True),
        sa.Column("area_sqm", sa.Float(), nullable=True),
        sa.Column("land_class", sa.String(100), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    # GiST Index on Geometry
    op.execute("CREATE INDEX idx_parcels_demo_geom_gist ON parcels_demo USING gist (geom)")

    # 13. Audit Logs (Hash-chained)
    op.create_table(
        "audit_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "sequence_id",
            sa.BigInteger(),
            sa.Identity(start=1, increment=1),
            unique=True,
            nullable=False,
        ),
        sa.Column("prev_hash", sa.String(64), nullable=False),
        sa.Column("current_hash", sa.String(64), nullable=False, unique=True),
        sa.Column(
            "actor_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True
        ),
        sa.Column("actor_role", sa.String(50), nullable=False),
        sa.Column("action", sa.String(100), nullable=False),
        sa.Column("resource_type", sa.String(100), nullable=False),
        sa.Column("resource_id", sa.String(100), nullable=True),
        sa.Column("scope", sa.String(50), nullable=False),
        sa.Column("payload", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("ip_address", sa.String(50), nullable=True),
        sa.Column("user_agent", sa.String(255), nullable=True),
        sa.Column(
            "timestamp", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index("idx_audit_logs_action", "audit_logs", ["action"])
    op.create_index("idx_audit_logs_timestamp", "audit_logs", ["timestamp"])

    # 14. Eval Runs
    op.create_table(
        "eval_runs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("run_type", sa.String(100), nullable=False),
        sa.Column("dataset_name", sa.String(100), nullable=False),
        sa.Column("metrics", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )


def downgrade() -> None:
    op.drop_table("eval_runs")
    op.drop_table("audit_logs")
    op.drop_table("parcels_demo")
    op.drop_table("kb_articles")
    op.drop_table("cases")
    op.drop_table("match_candidates")
    op.drop_table("extracted_fields")
    op.drop_table("documents")
    op.drop_table("land_records")
    op.drop_table("mouzas")
    op.drop_table("users")
    op.drop_table("offices")
    op.drop_table("regions")
