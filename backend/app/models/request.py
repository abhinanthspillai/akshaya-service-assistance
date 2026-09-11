from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Numeric, String
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.centre import AkshayaCentre
    from app.models.service import Service
    from app.models.user import User

REQUEST_STATUS_VALUES = (
    "DRAFT",
    "SUBMITTED",
    "WAITING_FOR_CENTRE",
    "ACCEPTED",
    "UNDER_REVIEW",
    "CORRECTION_REQUIRED",
    "INTERACTION_REQUIRED",
    "INTERACTION_SCHEDULED",
    "READY_FOR_PROCESSING",
    "PROCESSING",
    "PAYMENT_PENDING",
    "COMPLETED",
    "CLOSED",
    "CANCELLED",
    "UNABLE_TO_PROCEED",
)
_STATUS_CHECK = "status IN (" + ", ".join("'" + s + "'" for s in REQUEST_STATUS_VALUES) + ")"


class ServiceRequest(Base):
    __tablename__ = "service_requests"
    __table_args__ = (
        CheckConstraint(_STATUS_CHECK, name="chk_service_request_status"),
        CheckConstraint(
            "service_type_snapshot IN ('A','B','C')", name="chk_service_request_type_snapshot"
        ),
        CheckConstraint("fee_snapshot >= 0", name="chk_service_request_fee_snapshot_positive"),
        Index("ix_service_requests_citizen_id", "citizen_id"),
        Index("ix_service_requests_service_id", "service_id"),
        Index("ix_service_requests_selected_centre_id", "selected_centre_id"),
        Index("ix_service_requests_status", "status"),
        Index("ix_service_requests_created_at", "created_at"),
        Index("ix_service_requests_centre_status", "selected_centre_id", "status"),
    )

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    citizen_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    service_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("services.id"), nullable=False
    )
    selected_centre_id: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("akshaya_centres.id"), nullable=True
    )
    status: Mapped[str] = mapped_column(String(40), nullable=False, default="DRAFT")
    service_type_snapshot: Mapped[str] = mapped_column(String(1), nullable=False)
    service_name_snapshot: Mapped[str] = mapped_column(String(200), nullable=False)
    fee_snapshot: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    citizen: Mapped["User"] = relationship("User", foreign_keys=[citizen_id])
    service: Mapped["Service"] = relationship("Service", foreign_keys=[service_id])
    selected_centre: Mapped["AkshayaCentre | None"] = relationship(
        "AkshayaCentre", foreign_keys=[selected_centre_id]
    )
