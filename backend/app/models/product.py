from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional

from sqlalchemy import CheckConstraint, Column, Numeric
from sqlmodel import SQLModel, Field


class Product(SQLModel, table=True):
    __tablename__ = "products"
    __table_args__ = (
        CheckConstraint("price > 0", name="ck_product_price_positive"),
        CheckConstraint("stock >= 0", name="ck_product_stock_non_negative"),
        CheckConstraint(
            "sale_price IS NULL OR sale_price < price",
            name="ck_product_sale_price_lt_price",
        ),
    )

    id: Optional[int] = Field(default=None, primary_key=True)

    category_id: int = Field(foreign_key="categories.id", index=True)
    brand_id: int = Field(foreign_key="brands.id", index=True)

    name: str = Field(max_length=255)
    slug: str = Field(index=True, unique=True, max_length=255)
    description: Optional[str] = None

    image_url: Optional[str] = None
    extra_images: Optional[str] = None  # JSON array of image URLs
    colors: Optional[str] = None  # JSON array of {name, hex, image}

    price: Decimal = Field(sa_column=Column(Numeric(10, 2), nullable=False))
    sale_price: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(10, 2)))
    stock: int = Field(default=0)

    status: str = Field(default="ACTIVE", max_length=20, index=True)

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))