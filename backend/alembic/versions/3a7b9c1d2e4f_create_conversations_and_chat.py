"""create_conversations_and_chat_updates

Revision ID: 3a7b9c1d2e4f
Revises: 21548e54e25f
Create Date: 2026-10-20 04:10:00.000000+00:00

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "3a7b9c1d2e4f"
down_revision: str | None = "21548e54e25f"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. Create conversations table
    op.create_table(
        "conversations",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("request_id", sa.Uuid(), nullable=False),
        sa.Column("citizen_id", sa.Uuid(), nullable=False),
        sa.Column("staff_id", sa.Uuid(), nullable=False),
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
        sa.ForeignKeyConstraint(["citizen_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["request_id"], ["service_requests.id"]),
        sa.ForeignKeyConstraint(["staff_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("request_id", name="uq_conversations_request_id"),
    )
    op.create_index("ix_conversations_citizen_id", "conversations", ["citizen_id"])
    op.create_index("ix_conversations_request_id", "conversations", ["request_id"])
    op.create_index("ix_conversations_staff_id", "conversations", ["staff_id"])

    # 2. Add columns to request_messages
    op.add_column("request_messages", sa.Column("conversation_id", sa.Uuid(), nullable=True))
    op.add_column(
        "request_messages",
        sa.Column("is_system", sa.Boolean(), server_default="false", nullable=False),
    )
    op.add_column(
        "request_messages", sa.Column("read_at", sa.DateTime(timezone=True), nullable=True)
    )

    op.create_foreign_key(
        "fk_request_messages_conversation_id",
        "request_messages",
        "conversations",
        ["conversation_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_index(
        "ix_request_messages_conversation_id_created_at",
        "request_messages",
        ["conversation_id", "created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_request_messages_conversation_id_created_at", table_name="request_messages")
    op.drop_constraint(
        "fk_request_messages_conversation_id", "request_messages", type_="foreignkey"
    )
    op.drop_column("request_messages", "read_at")
    op.drop_column("request_messages", "is_system")
    op.drop_column("request_messages", "conversation_id")

    op.drop_index("ix_conversations_staff_id", table_name="conversations")
    op.drop_index("ix_conversations_request_id", table_name="conversations")
    op.drop_index("ix_conversations_citizen_id", table_name="conversations")
    op.drop_table("conversations")
