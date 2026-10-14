"""Sync schema updates for extracted_fields, documents, and land_records

Revision ID: 0002_sync_schema_updates
Revises: 0001_initial_schema
Create Date: 2026-10-15 02:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0002_sync_schema_updates'
down_revision: Union[str, None] = '0001_initial_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Update land_records: main_no, sub_no and composite index
    op.add_column('land_records', sa.Column('main_no', sa.Integer(), nullable=True))
    op.add_column('land_records', sa.Column('sub_no', sa.Integer(), nullable=True))
    op.create_index(
        'idx_land_records_mouza_main_sub',
        'land_records',
        ['mouza_id', 'main_no', 'sub_no'],
        unique=False
    )

    # 2. Update documents: idempotency_key, status
    op.add_column('documents', sa.Column('idempotency_key', sa.String(length=255), nullable=True))
    op.create_unique_constraint('uq_documents_idempotency_key', 'documents', ['idempotency_key'])
    op.add_column(
        'documents',
        sa.Column('status', sa.String(length=50), server_default='queued', nullable=False)
    )

    # 3. Update extracted_fields: main_no, sub_no, repaired, flagged, flag_reason, user_corrected, status_label
    op.add_column('extracted_fields', sa.Column('main_no', sa.Integer(), nullable=True))
    op.add_column('extracted_fields', sa.Column('sub_no', sa.Integer(), nullable=True))
    op.add_column(
        'extracted_fields',
        sa.Column('repaired', sa.Boolean(), server_default='false', nullable=False)
    )
    op.add_column(
        'extracted_fields',
        sa.Column('flagged', sa.Boolean(), server_default='false', nullable=False)
    )
    op.add_column('extracted_fields', sa.Column('flag_reason', sa.String(length=255), nullable=True))
    op.add_column(
        'extracted_fields',
        sa.Column('user_corrected', sa.Boolean(), server_default='false', nullable=False)
    )
    op.add_column(
        'extracted_fields',
        sa.Column('status_label', sa.String(length=50), server_default='OCR_EXTRACTED', nullable=False)
    )


def downgrade() -> None:
    # 1. Revert extracted_fields
    op.drop_column('extracted_fields', 'status_label')
    op.drop_column('extracted_fields', 'user_corrected')
    op.drop_column('extracted_fields', 'flag_reason')
    op.drop_column('extracted_fields', 'flagged')
    op.drop_column('extracted_fields', 'repaired')
    op.drop_column('extracted_fields', 'sub_no')
    op.drop_column('extracted_fields', 'main_no')

    # 2. Revert documents
    op.drop_column('documents', 'status')
    op.drop_constraint('uq_documents_idempotency_key', 'documents', type_='unique')
    op.drop_column('documents', 'idempotency_key')

    # 3. Revert land_records
    op.drop_index('idx_land_records_mouza_main_sub', table_name='land_records')
    op.drop_column('land_records', 'sub_no')
    op.drop_column('land_records', 'main_no')
