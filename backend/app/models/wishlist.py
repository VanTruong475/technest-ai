from datetime import datetime, timezone
from typing import Optional

from sqlmodel import SQLModel, Field


class WishlistItem(SQLModel, table=True):
    __tablename__ = "wishlist_items"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id")
    product_id: int = Field(foreign_key="products.id")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
