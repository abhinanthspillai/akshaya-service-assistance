from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class ServiceRequestCreate(BaseModel):
    service_id: UUID


class SelectCentreRequest(BaseModel):
    centre_id: UUID


class ServiceRequestResponse(BaseModel):
    id: UUID
    citizen_id: UUID
    service_id: UUID
    selected_centre_id: UUID | None
    status: str
    service_type_snapshot: str
    service_name_snapshot: str
    fee_snapshot: Decimal | None
    submitted_at: datetime | None
    completed_at: datetime | None
    cancelled_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
