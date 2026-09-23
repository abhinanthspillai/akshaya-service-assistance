from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class RequestMessageCreate(BaseModel):
    body: str = Field(..., min_length=1, max_length=4000)


class RequestMessageResponse(BaseModel):
    id: UUID
    request_id: UUID
    sender_id: UUID
    body: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
