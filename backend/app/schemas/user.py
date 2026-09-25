from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator


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
    email: EmailStr
    role: str
    is_active: bool

    model_config = {"from_attributes": True}


class UserAuthMe(UserRead):
    full_name: str | None = None
    phone: str | None = None
    centre_id: UUID | None = None
    approval_status: str | None = None
