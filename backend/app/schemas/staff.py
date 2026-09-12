from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class StaffCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: str = Field(..., min_length=2, max_length=160)


class StaffStatusUpdate(BaseModel):
    is_active: bool


class ProfileResponseBase(BaseModel):
    user_id: UUID
    full_name: str
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class EmployeeProfileResponse(ProfileResponseBase):
    centre_id: UUID
    max_active_requests: int
    is_available: bool


class CentreAdminProfileResponse(ProfileResponseBase):
    centre_id: UUID


class UserStaffResponse(BaseModel):
    id: UUID
    email: str
    role: str
    is_active: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class EmployeeResponse(BaseModel):
    user: UserStaffResponse
    profile: EmployeeProfileResponse


class CentreAdminResponse(BaseModel):
    user: UserStaffResponse
    profile: CentreAdminProfileResponse
