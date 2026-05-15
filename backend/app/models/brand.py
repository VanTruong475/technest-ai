from datetime import datetime
from typing import Optional

from sqlmodel import SQLModel, Field


class Brand(SQLModel, table=True):
    __tablename__ = "brands"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=100)
    slug: str = Field(index=True, unique=True, max_length=120)
    logo_url: Optional[str] = None
    is_active: bool = Field(default=True)

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)