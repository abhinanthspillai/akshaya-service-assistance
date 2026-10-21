"""add_approval_status_to_centre_administrators

Revision ID: 3c2a526e0d25
Revises: 3a7b9c1d2e4f
Create Date: 2026-10-21 12:25:57.429876+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3c2a526e0d25'
down_revision: Union[str, None] = '3a7b9c1d2e4f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add approval_status column with server_default 'APPROVED'
    op.add_column(
        'centre_administrators',
        sa.Column('approval_status', sa.String(32), server_default='APPROVED', nullable=False)
    )
    # 2. Add check constraint for valid approval statuses
    op.create_check_constraint(
        'centre_admin_approval_status_check',
        'centre_administrators',
        "approval_status IN ('PENDING_APPROVAL', 'APPROVED', 'REJECTED')"
    )
    # 3. Add unique partial index ensuring only ONE active-or-pending manager per centre.
    # Rejected rows will have approval_status = 'REJECTED' and thus will NOT block the centre.
    op.create_index(
        'uq_centre_admin_active_or_pending',
        'centre_administrators',
        ['centre_id'],
        unique=True,
        postgresql_where=sa.text("approval_status IN ('APPROVED', 'PENDING_APPROVAL')")
    )


def downgrade() -> None:
    op.drop_index('uq_centre_admin_active_or_pending', table_name='centre_administrators')
    op.drop_constraint('centre_admin_approval_status_check', 'centre_administrators', type_='check')
    op.drop_column('centre_administrators', 'approval_status')

