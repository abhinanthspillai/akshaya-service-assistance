from uuid import UUID

import email_validator
from datetime import date
from pydantic import BaseModel, EmailStr, Field, field_validator

# Enable RFC test environment so @akshaya.test domains are accepted
email_validator.TEST_ENVIRONMENT = True


class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    full_name: str = Field(..., min_length=2, max_length=160)
    phone: str | None = Field(None, max_length=32)
    role: str = Field("citizen")
    centre_id: UUID | None = None

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        allowed = ("citizen", "centre_employee")
        if v not in allowed:
            raise ValueError(f"Role must be one of {allowed}, got '{v}'")
        return v


class UserRead(BaseModel):
    id: UUID
    email: str
    role: str
    is_active: bool

    model_config = {"from_attributes": True}


class UserAuthMe(UserRead):
    full_name: str | None = None
    phone: str | None = None
    centre_id: UUID | None = None
    centre_name: str | None = None
    approval_status: str | None = None
    max_active_requests: int | None = None
    notification_preferences: dict | None = None
    date_of_birth: date | None = None
    gender: str | None = None
    address_line1: str | None = None
    address_line2: str | None = None
    city: str | None = None
    district: str | None = None
    state: str | None = None
    pin_code: str | None = None

class ProfileUpdate(BaseModel):
    full_name: str | None = Field(None, min_length=2, max_length=160)
    phone: str | None = Field(None, max_length=32)
    date_of_birth: date | None = None
    gender: str | None = None
    address_line1: str | None = None
    address_line2: str | None = None
    city: str | None = None
    district: str | None = None
    state: str | None = None
    pin_code: str | None = None


class NotificationPreferences(BaseModel):
    request_updates: bool = True
    service_updates: bool = True
    system: bool = True
