from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.request import ServiceRequest
    from app.models.service import ServiceDocumentRequirement
    from app.models.user import User


class RequestDocument(Base):
    __tablename__ = "request_documents"
    __table_args__ = (
        Index("ix_request_documents_request_id", "request_id"),
        Index("ix_request_documents_requirement_id", "requirement_id"),
        Index("ix_request_documents_uploaded_by_id", "uploaded_by_id"),
        Index(
            "ix_request_documents_request_requirement_current",
            "request_id",
            "requirement_id",
            "is_current",
        ),
    )

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    request_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("service_requests.id"), nullable=False
    )
    requirement_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("service_document_requirements.id"), nullable=False
    )
    uploaded_by_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    storage_key: Mapped[str] = mapped_column(String(512), nullable=False, unique=True)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    content_type: Mapped[str] = mapped_column(String(127), nullable=False)
    size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)
    sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    is_current: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    replaced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(String(40), nullable=False, default="PENDING")
    employee_remarks: Mapped[str | None] = mapped_column(Text, nullable=True)
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    verified_by_id: Mapped[UUID | None] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )

    request: Mapped["ServiceRequest"] = relationship("ServiceRequest", foreign_keys=[request_id])
    requirement: Mapped["ServiceDocumentRequirement"] = relationship(
        "ServiceDocumentRequirement", foreign_keys=[requirement_id]
    )
    uploaded_by: Mapped["User"] = relationship("User", foreign_keys=[uploaded_by_id])
    verified_by: Mapped["User | None"] = relationship("User", foreign_keys=[verified_by_id])


DOCUMENT_REVIEW_DECISIONS = (
    "APPROVED",
    "REJECTED",
    "REPLACEMENT_REQUESTED",
    "SUSPICIOUS",
)
_DECISION_CHECK = (
    "decision IN (" + ", ".join("'" + s + "'" for s in DOCUMENT_REVIEW_DECISIONS) + ")"
)


class RequestDocumentReview(Base):
    __tablename__ = "request_document_reviews"
    __table_args__ = (
        CheckConstraint(_DECISION_CHECK, name="chk_request_document_review_decision"),
        Index("ix_request_document_reviews_request_id", "request_id"),
        Index("ix_request_document_reviews_document_id", "document_id"),
        Index("ix_request_document_reviews_reviewer_id", "reviewer_id"),
    )

    id: Mapped[UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid4)
    request_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("service_requests.id"), nullable=False
    )
    document_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("request_documents.id"), nullable=False
    )
    requirement_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("service_document_requirements.id"), nullable=False
    )
    reviewer_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    decision: Mapped[str] = mapped_column(String(40), nullable=False)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    request: Mapped["ServiceRequest"] = relationship("ServiceRequest", foreign_keys=[request_id])
    document: Mapped["RequestDocument"] = relationship(
        "RequestDocument", foreign_keys=[document_id]
    )
    requirement: Mapped["ServiceDocumentRequirement"] = relationship(
        "ServiceDocumentRequirement", foreign_keys=[requirement_id]
    )
    reviewer: Mapped["User"] = relationship("User", foreign_keys=[reviewer_id])
