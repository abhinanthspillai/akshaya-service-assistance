from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class RequestDocumentResponse(BaseModel):
    id: UUID
    request_id: UUID
    requirement_id: UUID
    uploaded_by_id: UUID
    original_filename: str
    content_type: str
    size_bytes: int
    sha256: str
    version: int
    is_current: bool
    uploaded_at: datetime
    replaced_at: datetime | None
    status: str
    employee_remarks: str | None
    verified_at: datetime | None
    verified_by_id: UUID | None

    model_config = ConfigDict(from_attributes=True)


class RequestDocumentReviewCreate(BaseModel):
    decision: str
    reason: str | None = None


class RequestDocumentReviewResponse(BaseModel):
    id: UUID
    request_id: UUID
    document_id: UUID
    requirement_id: UUID
    reviewer_id: UUID
    decision: str
    reason: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
