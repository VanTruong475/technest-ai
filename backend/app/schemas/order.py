from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class OrderCreate(BaseModel):
    shipping_address: str
    phone: str
    note: Optional[str] = None


class OrderStatusUpdate(BaseModel):
    status: str


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
    shipping_address: str
    phone: str
    note: Optional[str] = None
    items: list[OrderItemResponse]
    created_at: datetime
    updated_at: datetime
