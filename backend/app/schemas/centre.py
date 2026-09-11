from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class AkshayaCentreBase(BaseModel):
    name: str = Field(..., max_length=200)
    code: str = Field(..., max_length=64)
    address_text: str
    locality: str | None = Field(None, max_length=120)
    district: str = Field(..., max_length=120)
    pincode: str | None = Field(None, max_length=16)
    latitude: Decimal | None = Field(None, max_digits=9, decimal_places=6)
    longitude: Decimal | None = Field(None, max_digits=9, decimal_places=6)
    is_active: bool = True


class AkshayaCentreCreate(AkshayaCentreBase):
    pass


class AkshayaCentreUpdate(BaseModel):
    name: str | None = Field(None, max_length=200)
    code: str | None = Field(None, max_length=64)
    address_text: str | None = None
    locality: str | None = Field(None, max_length=120)
    district: str | None = Field(None, max_length=120)
    pincode: str | None = Field(None, max_length=16)
    latitude: Decimal | None = Field(None, max_digits=9, decimal_places=6)
    longitude: Decimal | None = Field(None, max_digits=9, decimal_places=6)
    is_active: bool | None = None


class AkshayaCentreResponse(AkshayaCentreBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
