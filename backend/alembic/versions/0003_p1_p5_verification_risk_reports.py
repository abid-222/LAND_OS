"""P1-P5 migration: verification_results, qr_checks, parcels, deeds, mutations, alerts, buyer_reports

Revision ID: 0003_p1_p5_verification_risk_reports
Revises: 0002_sync_schema_updates
Create Date: 2026-10-15 08:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '0003_p1_p5_verification_risk_reports'
down_revision: Union[str, None] = '0002_sync_schema_updates'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. verification_results
    op.create_table(
        'verification_results',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('document_id', sa.UUID(), nullable=False),
        sa.Column('record_id', sa.UUID(), nullable=False),
        sa.Column('comparisons', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('rule_version', sa.String(length=50), server_default='v1.0', nullable=False),
        sa.ForeignKeyConstraint(['document_id'], ['documents.id'], ),
        sa.ForeignKeyConstraint(['record_id'], ['land_records.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_verification_results_document_id'), 'verification_results', ['document_id'], unique=False)
    op.create_index(op.f('ix_verification_results_record_id'), 'verification_results', ['record_id'], unique=False)

    # 2. qr_checks
    op.create_table(
        'qr_checks',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('document_id', sa.UUID(), nullable=False),
        sa.Column('payload_type', sa.String(length=50), nullable=False),
        sa.Column('hash_alg', sa.String(length=50), server_default='sha256', nullable=True),
        sa.Column('hash_match', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('scope', sa.String(length=50), server_default='integrity_only', nullable=False),
        sa.Column('checked_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['document_id'], ['documents.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_qr_checks_document_id'), 'qr_checks', ['document_id'], unique=False)

    # 3. parcels
    op.create_table(
        'parcels',
        sa.Column('parcel_id', sa.String(length=100), nullable=False),
        sa.Column('record_id', sa.UUID(), nullable=True),
        sa.Column('mouza_id', sa.UUID(), nullable=False),
        sa.Column('main_no', sa.Integer(), nullable=False),
        sa.Column('sub_no', sa.Integer(), nullable=True),
        sa.Column('area_decimal', sa.Float(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['mouza_id'], ['mouzas.id'], ),
        sa.ForeignKeyConstraint(['record_id'], ['land_records.id'], ),
        sa.PrimaryKeyConstraint('parcel_id')
    )
    op.create_index(op.f('ix_parcels_mouza_id'), 'parcels', ['mouza_id'], unique=False)
    op.create_index(op.f('ix_parcels_record_id'), 'parcels', ['record_id'], unique=False)

    # 4. deeds
    op.create_table(
        'deeds',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('deed_no', sa.String(length=100), nullable=False),
        sa.Column('deed_type', sa.String(length=50), server_default='sale', nullable=False),
        sa.Column('registry_office', sa.String(length=150), nullable=False),
        sa.Column('deed_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('registered_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('seller', sa.String(length=255), nullable=False),
        sa.Column('buyer', sa.String(length=255), nullable=False),
        sa.Column('parcel_id', sa.String(length=100), nullable=False),
        sa.Column('area', sa.Float(), nullable=False),
        sa.Column('source_ref', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['parcel_id'], ['parcels.parcel_id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_deeds_deed_no'), 'deeds', ['deed_no'], unique=False)
    op.create_index(op.f('ix_deeds_parcel_id'), 'deeds', ['parcel_id'], unique=False)
    op.create_index(op.f('ix_deeds_registry_office'), 'deeds', ['registry_office'], unique=False)

    # 5. mutations
    op.create_table(
        'mutations',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('case_no', sa.String(length=100), nullable=False),
        sa.Column('mutation_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('deed_id', sa.UUID(), nullable=True),
        sa.Column('parcel_id', sa.String(length=100), nullable=False),
        sa.Column('from_party', sa.String(length=255), nullable=False),
        sa.Column('to_party', sa.String(length=255), nullable=False),
        sa.Column('area', sa.Float(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['deed_id'], ['deeds.id'], ),
        sa.ForeignKeyConstraint(['parcel_id'], ['parcels.parcel_id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_mutations_case_no'), 'mutations', ['case_no'], unique=False)
    op.create_index(op.f('ix_mutations_deed_id'), 'mutations', ['deed_id'], unique=False)
    op.create_index(op.f('ix_mutations_parcel_id'), 'mutations', ['parcel_id'], unique=False)

    # 6. alerts
    op.create_table(
        'alerts',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('parcel_id', sa.String(length=100), nullable=False),
        sa.Column('document_id', sa.UUID(), nullable=True),
        sa.Column('rule_id', sa.String(length=50), nullable=False),
        sa.Column('severity', sa.String(length=20), nullable=False),
        sa.Column('title_bn', sa.String(length=255), server_default='সম্ভাব্য অসঙ্গতি, যাচাই প্রয়োজন', nullable=False),
        sa.Column('reason_bn', sa.Text(), nullable=False),
        sa.Column('evidence', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('status', sa.String(length=50), server_default='open', nullable=False),
        sa.Column('rule_version', sa.String(length=50), server_default='v1.0', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['document_id'], ['documents.id'], ),
        sa.ForeignKeyConstraint(['parcel_id'], ['parcels.parcel_id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_alerts_document_id'), 'alerts', ['document_id'], unique=False)
    op.create_index(op.f('ix_alerts_parcel_id'), 'alerts', ['parcel_id'], unique=False)
    op.create_index(op.f('ix_alerts_rule_id'), 'alerts', ['rule_id'], unique=False)

    # 7. buyer_reports
    op.create_table(
        'buyer_reports',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('parcel_id', sa.String(length=100), nullable=False),
        sa.Column('generated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('sections', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('rule_version', sa.String(length=50), server_default='v1.0', nullable=False),
        sa.Column('disclaimer_version', sa.String(length=50), server_default='v1.0', nullable=False),
        sa.ForeignKeyConstraint(['parcel_id'], ['parcels.parcel_id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_buyer_reports_parcel_id'), 'buyer_reports', ['parcel_id'], unique=False)
    op.create_index(op.f('ix_buyer_reports_user_id'), 'buyer_reports', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_table('buyer_reports')
    op.drop_table('alerts')
    op.drop_table('mutations')
    op.drop_table('deeds')
    op.drop_table('parcels')
    op.drop_table('qr_checks')
    op.drop_table('verification_results')
