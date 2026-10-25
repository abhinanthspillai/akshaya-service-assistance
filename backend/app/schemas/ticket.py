from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class TicketMessageCreate(BaseModel):
    body: str


class TicketMessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    ticket_id: UUID
    sender_id: UUID
    body: str
    created_at: datetime


class SupportTicketCreate(BaseModel):
    request_id: UUID | None = None
    subject: str
    description: str


class SupportTicketUpdate(BaseModel):
    status: str


class SupportTicketResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    citizen_id: UUID
    request_id: UUID | None
    subject: str
    description: str
    status: str
    created_at: datetime
    updated_at: datetime
