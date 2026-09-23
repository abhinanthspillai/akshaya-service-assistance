from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0007"
down_revision: str | None = "0006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "request_documents",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("request_id", sa.Uuid(), nullable=False),
        sa.Column("requirement_id", sa.Uuid(), nullable=False),
        sa.Column("uploaded_by_id", sa.Uuid(), nullable=False),
        sa.Column("storage_key", sa.String(length=512), nullable=False),
        sa.Column("original_filename", sa.String(length=255), nullable=False),
        sa.Column("content_type", sa.String(length=127), nullable=False),
        sa.Column("size_bytes", sa.BigInteger(), nullable=False),
        sa.Column("sha256", sa.String(length=64), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("is_current", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column(
            "uploaded_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("replaced_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["request_id"], ["service_requests.id"]),
        sa.ForeignKeyConstraint(["requirement_id"], ["service_document_requirements.id"]),
        sa.ForeignKeyConstraint(["uploaded_by_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("storage_key"),
    )
    op.create_index("ix_request_documents_request_id", "request_documents", ["request_id"])
    op.create_index("ix_request_documents_requirement_id", "request_documents", ["requirement_id"])
    op.create_index("ix_request_documents_uploaded_by_id", "request_documents", ["uploaded_by_id"])
    op.create_index(
        "ix_request_documents_request_requirement_current",
        "request_documents",
        ["request_id", "requirement_id", "is_current"],
    )


def downgrade() -> None:
    op.drop_index("ix_request_documents_request_requirement_current", table_name="request_documents")
    op.drop_index("ix_request_documents_uploaded_by_id", table_name="request_documents")
    op.drop_index("ix_request_documents_requirement_id", table_name="request_documents")
    op.drop_index("ix_request_documents_request_id", table_name="request_documents")
    op.drop_table("request_documents")
