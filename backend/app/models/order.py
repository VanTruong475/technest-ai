from datetime import datetime, timezone
from typing import Optional

from sqlmodel import SQLModel, Field


class Order(SQLModel, table=True):
    __tablename__ = "orders"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    total_amount: float
    status: str = Field(default="PENDING", max_length=20, index=True)
    payment_method: str = Field(default="COD", max_length=20)
    payment_status: str = Field(default="UNPAID", max_length=20)
    payment_txn_ref: Optional[str] = Field(default=None, max_length=100, unique=True, index=True)
    shipping_address: str
    phone: str
    note: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), index=True)
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class OrderItem(SQLModel, table=True):
    __tablename__ = "order_items"

    id: Optional[int] = Field(default=None, primary_key=True)
    order_id: int = Field(foreign_key="orders.id", index=True)
    product_id: int = Field(index=True)
    product_name: str
    image_url: Optional[str] = None
    price: float
    sale_price: Optional[float] = None
    quantity: int
    subtotal: float
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
