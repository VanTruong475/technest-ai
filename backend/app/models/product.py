from datetime import datetime, timezone
from typing import Optional

from sqlmodel import SQLModel, Field


class Product(SQLModel, table=True):
    __tablename__ = "products"

    id: Optional[int] = Field(default=None, primary_key=True)

    category_id: int = Field(foreign_key="categories.id")
    brand_id: int = Field(foreign_key="brands.id")

    name: str = Field(max_length=255)
    slug: str = Field(index=True, unique=True, max_length=255)
    description: Optional[str] = None

    image_url: Optional[str] = None

    price: float
    sale_price: Optional[float] = None
    stock: int = Field(default=0)

    status: str = Field(default="ACTIVE", max_length=20)

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))