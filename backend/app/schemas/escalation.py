from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class EscalationResponse(BaseModel):
    id: UUID
    request_id: UUID
    reason: str
    is_resolved: bool
    created_at: datetime
    resolved_at: datetime | None

    model_config = ConfigDict(from_attributes=True)
