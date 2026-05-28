from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional

from sqlalchemy import Column, Numeric
from sqlmodel import SQLModel, Field


class Order(SQLModel, table=True):
    __tablename__ = "orders"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    total_amount: Decimal = Field(sa_column=Column(Numeric(10, 2), nullable=False))
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
    price: Decimal = Field(sa_column=Column(Numeric(10, 2), nullable=False))
    sale_price: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(10, 2)))
    quantity: int
    subtotal: Decimal = Field(sa_column=Column(Numeric(10, 2), nullable=False))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
