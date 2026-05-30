from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, field_validator

ProductStatus = Literal["ACTIVE", "INACTIVE", "OUT_OF_STOCK"]


class ProductCreate(BaseModel):
    category_id: int
    brand_id: int
    name: str
    slug: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    price: float
    sale_price: Optional[float] = None
    stock: int = 0
    status: ProductStatus = "ACTIVE"

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Name cannot be empty")
        if len(v) > 255:
            raise ValueError("Name must be at most 255 characters")
        return v.strip()

    @field_validator("description")
    @classmethod
    def validate_description(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and len(v) > 5000:
            raise ValueError("Description must be at most 5000 characters")
        return v

    @field_validator("slug")
    @classmethod
    def validate_slug(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Slug cannot be empty")
        if len(v) > 255:
            raise ValueError("Slug must be at most 255 characters")
        import re
        if not re.match(r"^[a-z0-9]+(?:-[a-z0-9]+)*$", v.strip()):
            raise ValueError("Slug must be lowercase alphanumeric with hyphens")
        return v.strip()

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
    image_url: Optional[str] = None
    price: Optional[float] = None
    sale_price: Optional[float] = None
    stock: Optional[int] = None
    status: Optional[ProductStatus] = None

    @field_validator("description")
    @classmethod
    def validate_description(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and len(v) > 5000:
            raise ValueError("Description must be at most 5000 characters")
        return v

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
    model_config = ConfigDict(from_attributes=True)

    id: int
    category_id: int
    brand_id: int
    name: str
    slug: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    price: float
    sale_price: Optional[float] = None
    stock: int
    status: str
    created_at: datetime
    updated_at: datetime


class BulkStockUpdateItem(BaseModel):
    product_id: int
    stock: int

    @field_validator("stock")
    @classmethod
    def validate_stock(cls, v: int) -> int:
        if v < 0:
            raise ValueError("Stock must be greater than or equal to 0")
        return v


class BulkStockUpdateRequest(BaseModel):
    items: list[BulkStockUpdateItem]


class BulkStockUpdateResponse(BaseModel):
    updated: int
    products: list[ProductResponse]
