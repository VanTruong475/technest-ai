from datetime import datetime, timezone
from typing import Optional

from sqlmodel import SQLModel, Field


class BlogPost(SQLModel, table=True):
    __tablename__ = "blog_posts"

    id: Optional[int] = Field(default=None, primary_key=True)

    title: str = Field(max_length=255)
    slug: str = Field(index=True, unique=True, max_length=255)
    excerpt: Optional[str] = None
    content: str
    image_url: Optional[str] = None

    author_id: int = Field(foreign_key="users.id", index=True)
    category: Optional[str] = Field(default=None, max_length=50, index=True)
    tags: Optional[str] = None  # comma-separated

    published: bool = Field(default=False, index=True)
    published_at: Optional[datetime] = None
    view_count: int = Field(default=0)

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
