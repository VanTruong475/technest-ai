from datetime import datetime, timezone
from typing import Optional

from sqlmodel import SQLModel, Field


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: Optional[int] = Field(default=None, primary_key=True)
    full_name: str = Field(max_length=100)
    email: str = Field(index=True, unique=True, max_length=255)
    password_hash: str
    phone: Optional[str] = Field(default=None, max_length=20)
    role: str = Field(default="USER", max_length=20)
    is_active: bool = Field(default=True)

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))