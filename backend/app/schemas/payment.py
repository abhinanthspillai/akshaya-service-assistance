from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class RequestPaymentResponse(BaseModel):
    id: UUID
    request_id: UUID
    amount: Decimal
    currency: str
    status: str
    provider: str
    provider_reference: str
    components_json: str | None
    requested_at: datetime
    confirmed_at: datetime | None
    failed_at: datetime | None
    cancelled_at: datetime | None

    model_config = ConfigDict(from_attributes=True)


class RazorpayOrderResponse(BaseModel):
    order_id: str
    amount: int  # in paise
    currency: str
    key_id: str
    payment_id: UUID
    service_name: str
    request_id: UUID


class RazorpayVerifyRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
