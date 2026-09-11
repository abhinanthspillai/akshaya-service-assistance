from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0006"
down_revision: str | None = "0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "request_assignments",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("request_id", sa.Uuid(), nullable=False),
        sa.Column("employee_id", sa.Uuid(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column(
            "assigned_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["employee_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["request_id"], ["service_requests.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_request_assignments_request_id", "request_assignments", ["request_id"])
    op.create_index("ix_request_assignments_employee_id", "request_assignments", ["employee_id"])
    op.create_index("ix_request_assignments_is_active", "request_assignments", ["is_active"])

    op.create_table(
        "request_history",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("request_id", sa.Uuid(), nullable=False),
        sa.Column("actor_id", sa.Uuid(), nullable=True),
        sa.Column("action", sa.String(length=80), nullable=False),
        sa.Column("from_status", sa.String(length=40), nullable=True),
        sa.Column("to_status", sa.String(length=40), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["actor_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["request_id"], ["service_requests.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_request_history_request_id", "request_history", ["request_id"])
    op.create_index("ix_request_history_actor_id", "request_history", ["actor_id"])


def downgrade() -> None:
    op.drop_index("ix_request_history_actor_id", table_name="request_history")
    op.drop_index("ix_request_history_request_id", table_name="request_history")
    op.drop_table("request_history")
    op.drop_index("ix_request_assignments_is_active", table_name="request_assignments")
    op.drop_index("ix_request_assignments_employee_id", table_name="request_assignments")
    op.drop_index("ix_request_assignments_request_id", table_name="request_assignments")
    op.drop_table("request_assignments")
