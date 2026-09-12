from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0005"
down_revision: str | None = "0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "service_requests",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("citizen_id", sa.Uuid(), nullable=False),
        sa.Column("service_id", sa.Uuid(), nullable=False),
        sa.Column("selected_centre_id", sa.Uuid(), nullable=True),
        sa.Column("status", sa.String(length=40), nullable=False, server_default="DRAFT"),
        sa.Column("service_type_snapshot", sa.String(length=1), nullable=False),
        sa.Column("service_name_snapshot", sa.String(length=200), nullable=False),
        sa.Column("fee_snapshot", sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True),
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
            "status IN ('DRAFT', 'SUBMITTED', 'WAITING_FOR_CENTRE', 'ACCEPTED', 'UNDER_REVIEW', 'CORRECTION_REQUIRED', 'INTERACTION_REQUIRED', 'INTERACTION_SCHEDULED', 'READY_FOR_PROCESSING', 'PROCESSING', 'PAYMENT_PENDING', 'COMPLETED', 'CLOSED', 'CANCELLED', 'UNABLE_TO_PROCEED')",  # noqa: E501
            name="chk_service_request_status",
        ),
        sa.CheckConstraint(
            "service_type_snapshot IN ('A','B','C')", name="chk_service_request_type_snapshot"
        ),
        sa.CheckConstraint("fee_snapshot >= 0", name="chk_service_request_fee_snapshot_positive"),
        sa.ForeignKeyConstraint(["citizen_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["selected_centre_id"], ["akshaya_centres.id"]),
        sa.ForeignKeyConstraint(["service_id"], ["services.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_service_requests_citizen_id", "service_requests", ["citizen_id"])
    op.create_index("ix_service_requests_service_id", "service_requests", ["service_id"])
    op.create_index(
        "ix_service_requests_selected_centre_id", "service_requests", ["selected_centre_id"]
    )
    op.create_index("ix_service_requests_status", "service_requests", ["status"])
    op.create_index("ix_service_requests_created_at", "service_requests", ["created_at"])
    op.create_index(
        "ix_service_requests_centre_status", "service_requests", ["selected_centre_id", "status"]
    )


def downgrade() -> None:
    op.drop_index("ix_service_requests_centre_status", table_name="service_requests")
    op.drop_index("ix_service_requests_created_at", table_name="service_requests")
    op.drop_index("ix_service_requests_status", table_name="service_requests")
    op.drop_index("ix_service_requests_selected_centre_id", table_name="service_requests")
    op.drop_index("ix_service_requests_service_id", table_name="service_requests")
    op.drop_index("ix_service_requests_citizen_id", table_name="service_requests")
    op.drop_table("service_requests")
