from datetime import datetime
from typing import Optional

from pydantic import BaseModel, field_validator


class ProductCreate(BaseModel):
    category_id: int
    brand_id: int
    name: str
    slug: str
    description: Optional[str] = None
    price: float
    sale_price: Optional[float] = None
    stock: int = 0
    status: str = "ACTIVE"

    @field_validator("price")
    @classmethod
    def validate_price(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("Price must be greater than 0")
        return v

    @field_validator("sale_price")
    @classmethod
    def validate_sale_price(cls, v: Optional[float], info) -> Optional[float]:
        if v is not None and "price" in info.data and v >= info.data["price"]:
            raise ValueError("Sale price must be less than price")
        return v

    @field_validator("stock")
    @classmethod
    def validate_stock(cls, v: int) -> int:
        if v < 0:
            raise ValueError("Stock must be greater than or equal to 0")
        return v


class ProductUpdate(BaseModel):
    category_id: Optional[int] = None
    brand_id: Optional[int] = None
    name: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    sale_price: Optional[float] = None
    stock: Optional[int] = None
    status: Optional[str] = None

    @field_validator("price")
    @classmethod
    def validate_price(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and v <= 0:
            raise ValueError("Price must be greater than 0")
        return v

    @field_validator("stock")
    @classmethod
    def validate_stock(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v < 0:
            raise ValueError("Stock must be greater than or equal to 0")
        return v


class ProductResponse(BaseModel):
    id: int
    category_id: int
    brand_id: int
    name: str
    slug: str
    description: Optional[str] = None
    price: float
    sale_price: Optional[float] = None
    stock: int
    status: str
    created_at: datetime
    updated_at: datetime
