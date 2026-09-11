from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class RequestHistoryResponse(BaseModel):
    id: UUID
    request_id: UUID
    actor_id: UUID | None
    action: str
    from_status: str | None
    to_status: str | None
    note: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
