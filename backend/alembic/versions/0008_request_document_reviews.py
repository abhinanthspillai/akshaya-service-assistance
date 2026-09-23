from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0008"
down_revision: str | None = "0007"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "request_document_reviews",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("request_id", sa.Uuid(), nullable=False),
        sa.Column("document_id", sa.Uuid(), nullable=False),
        sa.Column("requirement_id", sa.Uuid(), nullable=False),
        sa.Column("reviewer_id", sa.Uuid(), nullable=False),
        sa.Column("decision", sa.String(length=40), nullable=False),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "decision IN ('APPROVED', 'REJECTED', 'REPLACEMENT_REQUESTED', 'SUSPICIOUS')",
            name="chk_request_document_review_decision",
        ),
        sa.ForeignKeyConstraint(["document_id"], ["request_documents.id"]),
        sa.ForeignKeyConstraint(["request_id"], ["service_requests.id"]),
        sa.ForeignKeyConstraint(["requirement_id"], ["service_document_requirements.id"]),
        sa.ForeignKeyConstraint(["reviewer_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_request_document_reviews_request_id", "request_document_reviews", ["request_id"]
    )
    op.create_index(
        "ix_request_document_reviews_document_id", "request_document_reviews", ["document_id"]
    )
    op.create_index(
        "ix_request_document_reviews_reviewer_id", "request_document_reviews", ["reviewer_id"]
    )


def downgrade() -> None:
    op.drop_index("ix_request_document_reviews_reviewer_id", table_name="request_document_reviews")
    op.drop_index("ix_request_document_reviews_document_id", table_name="request_document_reviews")
    op.drop_index("ix_request_document_reviews_request_id", table_name="request_document_reviews")
    op.drop_table("request_document_reviews")
