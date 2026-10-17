"""P5, P4, P6 extensions: land_class & acquisition on parcels, legal_cases, namjari_applications, namjari_events, parcel_watches, simulated_sms_outbox

Revision ID: 0004_p5_p4_p6_schema_extensions
Revises: 0003_p1_p5_verification_risk_reports
Create Date: 2026-10-17 12:00:00.000000

"""

from typing import Sequence, Union
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from alembic import op

revision: str = "0004_p5_p4_p6_schema_extensions"
down_revision: Union[str, None] = "0003_p1_p5_verification_risk_reports"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Alter parcels table with new columns
    op.add_column("parcels", sa.Column("land_class", sa.String(length=50), server_default="private", nullable=False))
    op.add_column("parcels", sa.Column("acquisition_status", sa.String(length=50), server_default="none", nullable=False))
    op.add_column("parcels", sa.Column("acquisition_notice_no", sa.String(length=100), nullable=True))
    op.add_column("parcels", sa.Column("acquisition_notice_date", sa.DateTime(timezone=True), nullable=True))
    op.add_column("parcels", sa.Column("acquisition_authority", sa.String(length=150), nullable=True))

    # 2. legal_cases
    op.create_table(
        "legal_cases",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("parcel_id", sa.String(length=100), nullable=False),
        sa.Column("case_no", sa.String(length=100), nullable=False),
        sa.Column("court", sa.String(length=150), nullable=False),
        sa.Column("case_type", sa.String(length=100), server_default="title_suit", nullable=False),
        sa.Column("status", sa.String(length=50), server_default="open", nullable=False),
        sa.Column("filed_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("parties", sa.Text(), nullable=False),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["parcel_id"], ["parcels.parcel_id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_legal_cases_parcel_id"), "legal_cases", ["parcel_id"], unique=False)
    op.create_index(op.f("ix_legal_cases_case_no"), "legal_cases", ["case_no"], unique=False)

    # 3. namjari_applications
    op.create_table(
        "namjari_applications",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("tracking_code", sa.String(length=50), nullable=False),
        sa.Column("parcel_id", sa.String(length=100), nullable=False),
        sa.Column("deed_document_id", sa.UUID(), nullable=True),
        sa.Column("applicant_user_id", sa.UUID(), nullable=False),
        sa.Column("registry_office", sa.String(length=150), nullable=True),
        sa.Column("deed_no", sa.String(length=100), nullable=True),
        sa.Column("deed_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("registration_verified", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("status", sa.String(length=50), server_default="submitted", nullable=False),
        sa.Column("auto_verification_status", sa.String(length=50), server_default="pending", nullable=False),
        sa.Column("verification_checklist", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("decision_reason", sa.Text(), nullable=True),
        sa.Column("sla_due_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["parcel_id"], ["parcels.parcel_id"]),
        sa.ForeignKeyConstraint(["applicant_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["deed_document_id"], ["documents.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_namjari_applications_tracking_code"), "namjari_applications", ["tracking_code"], unique=True)
    op.create_index(op.f("ix_namjari_applications_parcel_id"), "namjari_applications", ["parcel_id"], unique=False)
    op.create_index(op.f("ix_namjari_applications_applicant_user_id"), "namjari_applications", ["applicant_user_id"], unique=False)

    # 4. namjari_events
    op.create_table(
        "namjari_events",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("application_id", sa.UUID(), nullable=False),
        sa.Column("status", sa.String(length=50), nullable=False),
        sa.Column("actor_id", sa.UUID(), nullable=True),
        sa.Column("actor_role", sa.String(length=50), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["application_id"], ["namjari_applications.id"]),
        sa.ForeignKeyConstraint(["actor_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_namjari_events_application_id"), "namjari_events", ["application_id"], unique=False)

    # 5. parcel_watches
    op.create_table(
        "parcel_watches",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("parcel_id", sa.String(length=100), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["parcel_id"], ["parcels.parcel_id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_parcel_watches_user_id"), "parcel_watches", ["user_id"], unique=False)
    op.create_index(op.f("ix_parcel_watches_parcel_id"), "parcel_watches", ["parcel_id"], unique=False)

    # 6. simulated_sms_outbox
    op.create_table(
        "simulated_sms_outbox",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("recipient_phone", sa.String(length=50), nullable=False),
        sa.Column("parcel_id", sa.String(length=100), nullable=True),
        sa.Column("message_bn", sa.Text(), nullable=False),
        sa.Column("tag", sa.String(length=50), server_default="simulated", nullable=False),
        sa.Column("sent_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("simulated_sms_outbox")
    op.drop_table("parcel_watches")
    op.drop_table("namjari_events")
    op.drop_table("namjari_applications")
    op.drop_table("legal_cases")
    op.drop_column("parcels", "acquisition_authority")
    op.drop_column("parcels", "acquisition_notice_date")
    op.drop_column("parcels", "acquisition_notice_no")
    op.drop_column("parcels", "acquisition_status")
    op.drop_column("parcels", "land_class")
