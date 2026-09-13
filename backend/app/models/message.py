from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from sqlalchemy import DateTime, ForeignKey, Index, Text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.request import ServiceRequest
    from app.models.user import User


class RequestMessage(Base):
    __tablename__ = "request_messages"
    __table_args__ = (
        Index("ix_request_messages_request_id", "request_id"),
        Index("ix_request_messages_sender_id", "sender_id"),
    )

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    request_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("service_requests.id"), nullable=False
    )
    sender_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    body: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    request: Mapped["ServiceRequest"] = relationship("ServiceRequest", foreign_keys=[request_id])
    sender: Mapped["User"] = relationship("User", foreign_keys=[sender_id])
