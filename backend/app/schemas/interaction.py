from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class RequireInteractionRequest(BaseModel):
    requirement_id: UUID
    reason: str = Field(..., min_length=3)
    instructions: str | None = None


class ScheduleInteractionRequest(BaseModel):
    interaction_id: UUID
    scheduled_at: datetime


class InteractionOutcomeRequest(BaseModel):
    outcome: str
    note: str | None = None


class RequestInteractionResponse(BaseModel):
    id: UUID
    request_id: UUID
    requirement_id: UUID
    requested_by_id: UUID
    scheduled_by_id: UUID | None
    outcome_recorded_by_id: UUID | None
    status: str
    reason: str
    instructions: str | None
    scheduled_at: datetime | None
    outcome_note: str | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
