from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0009"
down_revision: str | None = "0008"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "request_interactions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("request_id", sa.Uuid(), nullable=False),
        sa.Column("requirement_id", sa.Uuid(), nullable=False),
        sa.Column("requested_by_id", sa.Uuid(), nullable=False),
        sa.Column("scheduled_by_id", sa.Uuid(), nullable=True),
        sa.Column("outcome_recorded_by_id", sa.Uuid(), nullable=True),
        sa.Column("status", sa.String(length=40), nullable=False, server_default="REQUESTED"),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("instructions", sa.Text(), nullable=True),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("outcome_note", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "status IN ('REQUESTED', 'SCHEDULED', 'COMPLETED', 'MISSED')",
            name="chk_request_interaction_status",
        ),
        sa.ForeignKeyConstraint(["request_id"], ["service_requests.id"]),
        sa.ForeignKeyConstraint(["requirement_id"], ["service_interaction_requirements.id"]),
        sa.ForeignKeyConstraint(["requested_by_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["scheduled_by_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["outcome_recorded_by_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_request_interactions_request_id", "request_interactions", ["request_id"])
    op.create_index(
        "ix_request_interactions_requirement_id", "request_interactions", ["requirement_id"]
    )


def downgrade() -> None:
    op.drop_index("ix_request_interactions_requirement_id", table_name="request_interactions")
    op.drop_index("ix_request_interactions_request_id", table_name="request_interactions")
    op.drop_table("request_interactions")
