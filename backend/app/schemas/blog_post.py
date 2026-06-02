from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, field_validator


class BlogPostCreate(BaseModel):
    title: str
    slug: str
    excerpt: Optional[str] = None
    content: str
    image_url: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[str] = None
    published: bool = False

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Title cannot be empty")
        return v.strip()

    @field_validator("content")
    @classmethod
    def validate_content(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Content cannot be empty")
        return v.strip()


class BlogPostUpdate(BaseModel):
    title: Optional[str] = None
    slug: Optional[str] = None
    excerpt: Optional[str] = None
    content: Optional[str] = None
    image_url: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[str] = None
    published: Optional[bool] = None


class BlogPostResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    slug: str
    excerpt: Optional[str] = None
    content: str
    image_url: Optional[str] = None
    author_id: int
    author_name: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[str] = None
    published: bool
    published_at: Optional[datetime] = None
    view_count: int
    created_at: datetime
    updated_at: datetime


class BlogPostSummary(BaseModel):
    """Lightweight version for list views — no full content."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    slug: str
    excerpt: Optional[str] = None
    image_url: Optional[str] = None
    author_name: Optional[str] = None
    category: Optional[str] = None
    published_at: Optional[datetime] = None
    view_count: int
