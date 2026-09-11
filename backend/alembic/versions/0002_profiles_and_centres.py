from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '0002'
down_revision: Union[str, None] = '0001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.create_table(
        "akshaya_centres",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("code", sa.String(length=64), nullable=False),
        sa.Column("address_text", sa.Text(), nullable=False),
        sa.Column("locality", sa.String(length=120), nullable=True),
        sa.Column("district", sa.String(length=120), nullable=False),
        sa.Column("pincode", sa.String(length=16), nullable=True),
        sa.Column("latitude", sa.Numeric(precision=9, scale=6), nullable=True),
        sa.Column("longitude", sa.Numeric(precision=9, scale=6), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code")
    )
    op.create_index(op.f("ix_akshaya_centres_district"), "akshaya_centres", ["district"], unique=False)
    op.create_index(op.f("ix_akshaya_centres_is_active"), "akshaya_centres", ["is_active"], unique=False)

    op.create_table(
        "citizen_profiles",
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("full_name", sa.String(length=160), nullable=False),
        sa.Column("phone", sa.String(length=32), nullable=True),
        sa.Column("address_text", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_id")
    )

    op.create_table(
        "employee_profiles",
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("centre_id", sa.UUID(), nullable=False),
        sa.Column("full_name", sa.String(length=160), nullable=False),
        sa.Column("max_active_requests", sa.Integer(), nullable=False, server_default="10"),
        sa.Column("is_available", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("max_active_requests > 0", name="employee_max_active_check"),
        sa.ForeignKeyConstraint(["centre_id"], ["akshaya_centres.id"], ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_id")
    )
    op.create_index(op.f("ix_employee_profiles_centre_id"), "employee_profiles", ["centre_id"], unique=False)
    op.create_index("ix_employee_profiles_centre_id_is_available", "employee_profiles", ["centre_id", "is_available"], unique=False)

    op.create_table(
        "centre_administrators",
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("centre_id", sa.UUID(), nullable=False),
        sa.Column("full_name", sa.String(length=160), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["centre_id"], ["akshaya_centres.id"], ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_id"),
        sa.UniqueConstraint("user_id", "centre_id", name="uq_centre_administrators_user_centre")
    )
    op.create_index(op.f("ix_centre_administrators_centre_id"), "centre_administrators", ["centre_id"], unique=False)

def downgrade() -> None:
    op.drop_index(op.f("ix_centre_administrators_centre_id"), table_name="centre_administrators")
    op.drop_table("centre_administrators")
    
    op.drop_index("ix_employee_profiles_centre_id_is_available", table_name="employee_profiles")
    op.drop_index(op.f("ix_employee_profiles_centre_id"), table_name="employee_profiles")
    op.drop_table("employee_profiles")

    op.drop_table("citizen_profiles")

    op.drop_index(op.f("ix_akshaya_centres_is_active"), table_name="akshaya_centres")
    op.drop_index(op.f("ix_akshaya_centres_district"), table_name="akshaya_centres")
    op.drop_table("akshaya_centres")
