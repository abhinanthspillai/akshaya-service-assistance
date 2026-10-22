from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.request import ServiceRequest
    from app.models.user import User

OTP_REQUEST_STATUS_VALUES = (
    "PENDING",
    "SUBMITTED",
    "USED",
    "FAILED",
    "EXPIRED",
    "CANCELLED",
)
_STATUS_CHECK = "status IN (" + ", ".join("'" + s + "'" for s in OTP_REQUEST_STATUS_VALUES) + ")"


class OtpRequest(Base):
    __tablename__ = "otp_requests"
    __table_args__ = (
        CheckConstraint(_STATUS_CHECK, name="chk_otp_requests_status"),
        Index("ix_otp_requests_request_id", "request_id"),
        Index("ix_otp_requests_requested_by", "requested_by"),
        Index("ix_otp_requests_status", "status"),
        Index("ix_otp_requests_expires_at", "expires_at"),
        Index("ix_otp_requests_created_at", "created_at"),
    )

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    request_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("service_requests.id"), nullable=False
    )
    requested_by: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="PENDING")
    code: Mapped[str | None] = mapped_column(String(10), nullable=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    request: Mapped["ServiceRequest"] = relationship("ServiceRequest", foreign_keys=[request_id])
    requester: Mapped["User"] = relationship("User", foreign_keys=[requested_by])
