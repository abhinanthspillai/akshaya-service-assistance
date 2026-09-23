from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.centre import AkshayaCentre


class Service(Base):
    __tablename__ = "services"
    __table_args__ = (
        CheckConstraint("service_type IN ('A', 'B', 'C')", name="chk_service_type"),
        CheckConstraint("base_fee >= 0", name="chk_service_base_fee_positive"),
        CheckConstraint("retention_days >= 0", name="chk_service_retention_days_positive"),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    code: Mapped[str] = mapped_column(String(80), nullable=False, unique=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    service_type: Mapped[str] = mapped_column(String(1), nullable=False, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, index=True)
    base_fee: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    retention_days: Mapped[int | None] = mapped_column(Integer, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    document_requirements: Mapped[list["ServiceDocumentRequirement"]] = relationship(
        "ServiceDocumentRequirement", back_populates="service", cascade="all, delete-orphan"
    )
    interaction_requirements: Mapped[list["ServiceInteractionRequirement"]] = relationship(
        "ServiceInteractionRequirement", back_populates="service", cascade="all, delete-orphan"
    )
    supported_by_centres: Mapped[list["CentreSupportedService"]] = relationship(
        "CentreSupportedService", back_populates="service"
    )


class ServiceDocumentRequirement(Base):
    __tablename__ = "service_document_requirements"
    __table_args__ = (
        CheckConstraint("max_file_size_bytes > 0", name="chk_doc_req_max_file_size_positive"),
        UniqueConstraint("service_id", "name", name="uq_service_doc_req_name"),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    service_id: Mapped[UUID] = mapped_column(
        ForeignKey("services.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    requirement_type: Mapped[str] = mapped_column(String(20), nullable=False, default="REQUIRED")
    conditional_rule: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_reusable: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    max_file_size_bytes: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    service: Mapped["Service"] = relationship("Service", back_populates="document_requirements")
    allowed_file_types: Mapped[list["ServiceRequirementAllowedFileType"]] = relationship(
        "ServiceRequirementAllowedFileType",
        back_populates="requirement",
        cascade="all, delete-orphan",
    )


class ServiceRequirementAllowedFileType(Base):
    __tablename__ = "service_requirement_allowed_file_types"

    requirement_id: Mapped[UUID] = mapped_column(
        ForeignKey("service_document_requirements.id", ondelete="CASCADE"), primary_key=True
    )
    mime_type: Mapped[str] = mapped_column(String(127), primary_key=True)

    requirement: Mapped["ServiceDocumentRequirement"] = relationship(
        "ServiceDocumentRequirement", back_populates="allowed_file_types"
    )


class ServiceInteractionRequirement(Base):
    __tablename__ = "service_interaction_requirements"
    __table_args__ = (
        CheckConstraint("max_missed_attempts >= 1", name="chk_interaction_req_max_missed_attempts"),
    )

    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)
    service_id: Mapped[UUID] = mapped_column(
        ForeignKey("services.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_mandatory: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    max_missed_attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=3)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    service: Mapped["Service"] = relationship("Service", back_populates="interaction_requirements")


class CentreSupportedService(Base):
    __tablename__ = "centre_supported_services"
    __table_args__ = (
        CheckConstraint(
            "centre_fee_override >= 0", name="chk_centre_supported_service_fee_override"
        ),
    )

    centre_id: Mapped[UUID] = mapped_column(ForeignKey("akshaya_centres.id"), primary_key=True)
    service_id: Mapped[UUID] = mapped_column(
        ForeignKey("services.id"), primary_key=True, index=True
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    centre_fee_override: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    centre: Mapped["AkshayaCentre"] = relationship(
        "AkshayaCentre", back_populates="supported_services"
    )
    service: Mapped["Service"] = relationship("Service", back_populates="supported_by_centres")
