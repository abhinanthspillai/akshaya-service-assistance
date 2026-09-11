from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ServiceDocumentRequirementBase(BaseModel):
    name: str = Field(..., max_length=200)
    description: str | None = None
    is_required: bool = True
    is_reusable: bool = False
    max_file_size_bytes: int | None = Field(None, gt=0)
    sort_order: int = 0
    is_active: bool = True


class ServiceRequirementAllowedFileTypeBase(BaseModel):
    mime_type: str = Field(..., max_length=127)


class ServiceDocumentRequirementCreate(ServiceDocumentRequirementBase):
    allowed_file_types: list[ServiceRequirementAllowedFileTypeBase] = []


class ServiceDocumentRequirementResponse(ServiceDocumentRequirementBase):
    id: UUID
    service_id: UUID
    allowed_file_types: list[ServiceRequirementAllowedFileTypeBase] = []

    model_config = ConfigDict(from_attributes=True)


class ServiceInteractionRequirementBase(BaseModel):
    name: str = Field(..., max_length=200)
    description: str | None = None
    is_mandatory: bool = True
    max_missed_attempts: int = Field(3, ge=1)
    sort_order: int = 0
    is_active: bool = True


class ServiceInteractionRequirementCreate(ServiceInteractionRequirementBase):
    pass


class ServiceInteractionRequirementResponse(ServiceInteractionRequirementBase):
    id: UUID
    service_id: UUID

    model_config = ConfigDict(from_attributes=True)


class ServiceBase(BaseModel):
    name: str = Field(..., max_length=200)
    code: str = Field(..., max_length=80)
    description: str | None = None
    service_type: str = Field(..., pattern="^[ABC]$")
    is_active: bool = True
    base_fee: Decimal | None = Field(None, ge=0)
    retention_days: int | None = Field(None, ge=0)


class ServiceCreate(ServiceBase):
    pass


class ServiceUpdate(BaseModel):
    name: str | None = Field(None, max_length=200)
    description: str | None = None
    is_active: bool | None = None
    base_fee: Decimal | None = Field(None, ge=0)
    retention_days: int | None = Field(None, ge=0)


class ServiceResponse(ServiceBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ServiceDetailResponse(ServiceResponse):
    document_requirements: list[ServiceDocumentRequirementResponse] = []
    interaction_requirements: list[ServiceInteractionRequirementResponse] = []

    model_config = ConfigDict(from_attributes=True)
