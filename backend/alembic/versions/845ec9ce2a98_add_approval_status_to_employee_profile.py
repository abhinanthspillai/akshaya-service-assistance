"""add_approval_status_to_employee_profile

Revision ID: 845ec9ce2a98
Revises: 6562942120d5
Create Date: 2026-09-25 03:45:48.764768+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '845ec9ce2a98'
down_revision: Union[str, None] = '6562942120d5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'employee_profiles',
        sa.Column('approval_status', sa.String(32), server_default='APPROVED', nullable=False)
    )
    op.create_check_constraint(
        'employee_approval_status_check',
        'employee_profiles',
        "approval_status IN ('PENDING_APPROVAL', 'APPROVED', 'REJECTED')"
    )


def downgrade() -> None:
    op.drop_constraint('employee_approval_status_check', 'employee_profiles', type_='check')
    op.drop_column('employee_profiles', 'approval_status')
