from datetime import datetime
from typing import Optional

from pydantic import BaseModel, field_validator


class BrandCreate(BaseModel):
    name: str
    slug: str
    logo_url: Optional[str] = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Name cannot be empty")
        if len(v) > 100:
            raise ValueError("Name must be at most 100 characters")
        return v.strip()

    @field_validator("slug")
    @classmethod
    def validate_slug(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Slug cannot be empty")
        if len(v) > 100:
            raise ValueError("Slug must be at most 100 characters")
        return v.strip().lower()


class BrandUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    logo_url: Optional[str] = None
    is_active: Optional[bool] = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            if not v.strip():
                raise ValueError("Name cannot be empty")
            if len(v) > 100:
                raise ValueError("Name must be at most 100 characters")
            return v.strip()
        return v

    @field_validator("slug")
    @classmethod
    def validate_slug(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            if not v.strip():
                raise ValueError("Slug cannot be empty")
            if len(v) > 100:
                raise ValueError("Slug must be at most 100 characters")
            return v.strip().lower()
        return v


class BrandResponse(BaseModel):
    id: int
    name: str
    slug: str
    logo_url: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime
