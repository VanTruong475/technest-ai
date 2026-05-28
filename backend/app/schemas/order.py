from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, field_validator

OrderStatus = Literal["PENDING", "CONFIRMED", "SHIPPING", "COMPLETED", "CANCELLED"]
PaymentStatus = Literal["UNPAID", "PAID", "REFUNDED"]


class OrderCreate(BaseModel):
    shipping_address: str
    phone: str
    note: Optional[str] = None
    payment_method: Literal["COD", "VNPAY"] = "COD"

    @field_validator("shipping_address")
    @classmethod
    def validate_address(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Shipping address cannot be empty")
        return v.strip()

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Phone cannot be empty")
        return v.strip()


class OrderStatusUpdate(BaseModel):
    status: OrderStatus


class OrderItemResponse(BaseModel):
    id: int
    product_id: int
    product_name: str
    image_url: Optional[str] = None
    price: float
    sale_price: Optional[float] = None
    quantity: int
    subtotal: float


class OrderResponse(BaseModel):
    id: int
    user_id: int
    total_amount: float
    status: str
    payment_method: str = "COD"
    payment_status: str = "UNPAID"
    shipping_address: str
    phone: str
    note: Optional[str] = None
    items: list[OrderItemResponse]
    created_at: datetime
    updated_at: datetime
