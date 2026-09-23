from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class NotificationResponse(BaseModel):
    id: UUID
    user_id: UUID
    request_id: UUID | None
    event_type: str
    title: str
    body: str | None
    is_read: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
