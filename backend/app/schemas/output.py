from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class CompletedOutputCreate(BaseModel):
    collection_instructions: str | None = None
    fee_collected: bool = Field(default=False)
    amount: float | None = None
    note: str | None = None


class CompletedOutputResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    request_id: UUID
    created_by_id: UUID
    original_filename: str | None
    content_type: str | None
    collection_instructions: str | None
    fee_collected: bool
    amount: float | None
    note: str | None
    created_at: datetime
