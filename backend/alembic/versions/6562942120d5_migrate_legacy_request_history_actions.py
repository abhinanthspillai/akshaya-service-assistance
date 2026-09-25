"""migrate_legacy_request_history_actions

Revision ID: 6562942120d5
Revises: 0c67afc0b3d2
Create Date: 2026-09-24 07:21:43.101130+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6562942120d5'
down_revision: Union[str, None] = '0c67afc0b3d2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Explicit mapping of legacy action values to match canonical RequestAction enum
    # CANCELLED -> cancel
    # REASSIGNED -> reassign
    # UNABLE_TO_PROCEED -> unable_to_proceed
    op.execute(
        sa.text(
            """
            UPDATE request_history
            SET action = CASE action
                WHEN 'CANCELLED' THEN 'cancel'
                WHEN 'REASSIGNED' THEN 'reassign'
                WHEN 'UNABLE_TO_PROCEED' THEN 'unable_to_proceed'
                ELSE action
            END
            WHERE action IN ('CANCELLED', 'REASSIGNED', 'UNABLE_TO_PROCEED');
            """
        )
    )


def downgrade() -> None:
    # Explicit reverse mapping of legacy action values
    # cancel -> CANCELLED
    # reassign -> REASSIGNED
    # unable_to_proceed -> UNABLE_TO_PROCEED
    op.execute(
        sa.text(
            """
            UPDATE request_history
            SET action = CASE action
                WHEN 'cancel' THEN 'CANCELLED'
                WHEN 'reassign' THEN 'REASSIGNED'
                WHEN 'unable_to_proceed' THEN 'UNABLE_TO_PROCEED'
                ELSE action
            END
            WHERE action IN ('cancel', 'reassign', 'unable_to_proceed');
            """
        )
    )
