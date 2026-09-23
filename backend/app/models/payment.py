from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.request import ServiceRequest


PAYMENT_STATUS_VALUES = ("PENDING", "CONFIRMED", "FAILED", "CANCELLED")
_STATUS_CHECK = "status IN (" + ", ".join("'" + s + "'" for s in PAYMENT_STATUS_VALUES) + ")"


class RequestPayment(Base):
    __tablename__ = "request_payments"
    __table_args__ = (
        CheckConstraint(_STATUS_CHECK, name="chk_request_payment_status"),
        CheckConstraint("amount >= 0", name="chk_request_payment_amount_positive"),
        Index("ix_request_payments_request_id", "request_id"),
        Index("ix_request_payments_status", "status"),
    )

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    request_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("service_requests.id"), nullable=False
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="INR")
    status: Mapped[str] = mapped_column(String(40), nullable=False, default="PENDING")
    provider: Mapped[str] = mapped_column(String(80), nullable=False, default="mock")
    provider_reference: Mapped[str] = mapped_column(String(120), nullable=False, unique=True)
    components_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    requested_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    failed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    request: Mapped["ServiceRequest"] = relationship("ServiceRequest", foreign_keys=[request_id])
