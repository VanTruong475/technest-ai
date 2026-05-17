from datetime import datetime
from typing import Optional

from sqlmodel import SQLModel, Field


class Order(SQLModel, table=True):
    __tablename__ = "orders"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id")
    total_amount: float
    status: str = Field(default="PENDING", max_length=20)
    shipping_address: str
    phone: str
    note: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class OrderItem(SQLModel, table=True):
    __tablename__ = "order_items"

    id: Optional[int] = Field(default=None, primary_key=True)
    order_id: int = Field(foreign_key="orders.id")
    product_id: int
    product_name: str
    image_url: Optional[str] = None
    price: float
    sale_price: Optional[float] = None
    quantity: int
    subtotal: float
    created_at: datetime = Field(default_factory=datetime.utcnow)
