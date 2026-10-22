"""add_otp_requests_table

Revision ID: 7c8a91b2c3d4
Revises: fd1e155c8698
Create Date: 2026-10-23 04:30:00.000000+00:00

"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "7c8a91b2c3d4"
down_revision: str | None = "3c2a526e0d25"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "otp_requests",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "request_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("service_requests.id"),
            nullable=False,
        ),
        sa.Column(
            "requested_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=False,
        ),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="PENDING"),
        sa.Column("code", sa.String(length=10), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "status IN ('PENDING', 'SUBMITTED', 'USED', 'FAILED', 'EXPIRED', 'CANCELLED')",
            name="chk_otp_requests_status",
        ),
    )
    op.create_index("ix_otp_requests_request_id", "otp_requests", ["request_id"])
    op.create_index("ix_otp_requests_requested_by", "otp_requests", ["requested_by"])
    op.create_index("ix_otp_requests_status", "otp_requests", ["status"])
    op.create_index("ix_otp_requests_expires_at", "otp_requests", ["expires_at"])
    op.create_index("ix_otp_requests_created_at", "otp_requests", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_otp_requests_created_at", table_name="otp_requests")
    op.drop_index("ix_otp_requests_expires_at", table_name="otp_requests")
    op.drop_index("ix_otp_requests_status", table_name="otp_requests")
    op.drop_index("ix_otp_requests_requested_by", table_name="otp_requests")
    op.drop_index("ix_otp_requests_request_id", table_name="otp_requests")
    op.drop_table("otp_requests")
