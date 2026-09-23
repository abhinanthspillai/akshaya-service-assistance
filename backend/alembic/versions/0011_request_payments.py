from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0011"
down_revision: str | None = "0010"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "request_payments",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("request_id", sa.Uuid(), nullable=False),
        sa.Column("amount", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False, server_default="INR"),
        sa.Column("status", sa.String(length=40), nullable=False, server_default="PENDING"),
        sa.Column("provider", sa.String(length=80), nullable=False, server_default="mock"),
        sa.Column("provider_reference", sa.String(length=120), nullable=False),
        sa.Column("components_json", sa.Text(), nullable=True),
        sa.Column(
            "requested_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("confirmed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("failed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint("amount >= 0", name="chk_request_payment_amount_positive"),
        sa.CheckConstraint(
            "status IN ('PENDING', 'CONFIRMED', 'FAILED', 'CANCELLED')",
            name="chk_request_payment_status",
        ),
        sa.ForeignKeyConstraint(["request_id"], ["service_requests.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("provider_reference"),
    )
    op.create_index("ix_request_payments_request_id", "request_payments", ["request_id"])
    op.create_index("ix_request_payments_status", "request_payments", ["status"])


def downgrade() -> None:
    op.drop_index("ix_request_payments_status", table_name="request_payments")
    op.drop_index("ix_request_payments_request_id", table_name="request_payments")
    op.drop_table("request_payments")
