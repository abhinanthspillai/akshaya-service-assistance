from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class RequestMessageCreate(BaseModel):
    body: str = Field(..., min_length=1, max_length=1000)


class RequestMessageResponse(BaseModel):
    id: UUID
    request_id: UUID
    conversation_id: UUID | None = None
    sender_id: UUID
    sender_name: str | None = None
    body: str
    is_system: bool = False
    read_at: datetime | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ConversationResponse(BaseModel):
    id: UUID
    request_id: UUID
    service_name: str
    request_status: str
    is_terminal: bool
    other_party_name: str
    other_party_role: str
    last_message: RequestMessageResponse | None = None
    unread_count: int = 0
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UnreadCountResponse(BaseModel):
    unread_count: int
