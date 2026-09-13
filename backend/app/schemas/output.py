from datetime import datetime
from uuid import UUID
from typing import Optional

from pydantic import BaseModel

class CompletedOutputCreate(BaseModel):
    collection_instructions: Optional[str] = None

class CompletedOutputResponse(BaseModel):
    id: UUID
    request_id: UUID
    created_by_id: UUID
    original_filename: Optional[str]
    content_type: Optional[str]
    collection_instructions: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True
