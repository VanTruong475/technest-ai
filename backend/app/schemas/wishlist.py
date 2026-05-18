from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class WishlistItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    product_id: int
    product_name: str
    product_slug: str
    image_url: Optional[str] = None
    price: float
    sale_price: Optional[float] = None
    created_at: datetime


class WishlistCheckResponse(BaseModel):
    is_favorited: bool
