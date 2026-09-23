from datetime import datetime
from uuid import UUID
from typing import Optional

from pydantic import BaseModel

class TicketMessageCreate(BaseModel):
    body: str

class TicketMessageResponse(BaseModel):
    id: UUID
    ticket_id: UUID
    sender_id: UUID
    body: str
    created_at: datetime

    class Config:
        from_attributes = True

class SupportTicketCreate(BaseModel):
    request_id: Optional[UUID] = None
    subject: str
    description: str

class SupportTicketUpdate(BaseModel):
    status: str

class SupportTicketResponse(BaseModel):
    id: UUID
    citizen_id: UUID
    request_id: Optional[UUID]
    subject: str
    description: str
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
