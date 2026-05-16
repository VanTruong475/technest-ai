from datetime import datetime
from typing import Optional

from pydantic import BaseModel, field_validator


class CartItemCreate(BaseModel):
    product_id: int
    quantity: int = 1

    @field_validator("quantity")
    @classmethod
    def validate_quantity(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("Quantity must be greater than 0")
        return v


class CartItemUpdate(BaseModel):
    quantity: int

    @field_validator("quantity")
    @classmethod
    def validate_quantity(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("Quantity must be greater than 0")
        return v


class CartItemResponse(BaseModel):
    id: int
    product_id: int
    product_name: str
    price: float
    sale_price: Optional[float] = None
    quantity: int
    subtotal: float


class CartResponse(BaseModel):
    id: int
    user_id: int
    items: list[CartItemResponse]
    total_items: int
    total_amount: float
    created_at: datetime
    updated_at: datetime
