from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class OtpCreateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    request_id: UUID
    status: str
    expires_at: datetime
    created_at: datetime
    submitted_at: datetime | None = None
    resolved_at: datetime | None = None


class OtpStateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    request_id: UUID
    status: str
    code: str | None = None
    expires_at: datetime
    created_at: datetime
    submitted_at: datetime | None = None
    resolved_at: datetime | None = None
    is_awaiting_otp: bool
    failed_attempts_count: int = 0
    is_blocked: bool = False


class PendingCitizenOtpResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    request_id: UUID
    service_name: str
    request_short_id: str
    status: str
    expires_at: datetime
    created_at: datetime


class OtpSubmitRequest(BaseModel):
    code: str = Field(..., min_length=6, max_length=6, pattern=r"^\d{6}$")


class OtpResolveRequest(BaseModel):
    outcome: Literal["used", "failed"]
