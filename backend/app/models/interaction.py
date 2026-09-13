from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.request import ServiceRequest
    from app.models.service import ServiceInteractionRequirement
    from app.models.user import User


INTERACTION_STATUS_VALUES = ("REQUESTED", "SCHEDULED", "COMPLETED", "MISSED")
_STATUS_CHECK = "status IN (" + ", ".join("'" + s + "'" for s in INTERACTION_STATUS_VALUES) + ")"


class RequestInteraction(Base):
    __tablename__ = "request_interactions"
    __table_args__ = (
        CheckConstraint(_STATUS_CHECK, name="chk_request_interaction_status"),
        Index("ix_request_interactions_request_id", "request_id"),
        Index("ix_request_interactions_requirement_id", "requirement_id"),
    )

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    request_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("service_requests.id"), nullable=False
    )
    requirement_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("service_interaction_requirements.id"), nullable=False
    )
    requested_by_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    scheduled_by_id: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    outcome_recorded_by_id: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    status: Mapped[str] = mapped_column(String(40), nullable=False, default="REQUESTED")
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    instructions: Mapped[str | None] = mapped_column(Text, nullable=True)
    scheduled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    outcome_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    request: Mapped["ServiceRequest"] = relationship("ServiceRequest", foreign_keys=[request_id])
    requirement: Mapped["ServiceInteractionRequirement"] = relationship(
        "ServiceInteractionRequirement", foreign_keys=[requirement_id]
    )
    requested_by: Mapped["User"] = relationship("User", foreign_keys=[requested_by_id])
    scheduled_by: Mapped["User | None"] = relationship("User", foreign_keys=[scheduled_by_id])
    outcome_recorded_by: Mapped["User | None"] = relationship(
        "User", foreign_keys=[outcome_recorded_by_id]
    )
