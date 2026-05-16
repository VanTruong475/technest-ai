from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class BrandCreate(BaseModel):
    name: str
    slug: str
    logo_url: Optional[str] = None


class BrandUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    logo_url: Optional[str] = None
    is_active: Optional[bool] = None


class BrandResponse(BaseModel):
    id: int
    name: str
    slug: str
    logo_url: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime
