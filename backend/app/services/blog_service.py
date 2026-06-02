import math
from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException, status
from sqlmodel import Session

from app.models.blog_post import BlogPost
from app.models.user import User
from app.repositories.blog_repository import BlogRepository
from app.schemas.blog_post import BlogPostCreate, BlogPostResponse, BlogPostSummary, BlogPostUpdate
from app.schemas.common import PaginatedResponse
from app.services.audit_service import log_action


def get_all_posts(
    session: Session,
    page: int = 1,
    limit: int = 10,
    category: Optional[str] = None,
    published_only: bool = True,
) -> PaginatedResponse[dict]:
    repo = BlogRepository(session)
    items, total = repo.find_all(
        page=page, limit=limit, category=category, published_only=published_only,
    )
    total_pages = math.ceil(total / limit) if total > 0 else 0

    enriched = []
    for p in items:
        d = BlogPostSummary.model_validate(p).model_dump()
        d["author_name"] = _get_author_name(session, p.author_id)
        enriched.append(d)

    return PaginatedResponse(
        items=enriched, total=total, page=page, limit=limit, total_pages=total_pages,
    )


def get_post_by_slug(slug: str, session: Session) -> dict:
    repo = BlogRepository(session)
    post = repo.find_by_slug(slug)
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Blog post not found")

    # Increment view count
    post.view_count += 1
    repo.update(post)

    d = BlogPostResponse.model_validate(post).model_dump()
    d["author_name"] = _get_author_name(session, post.author_id)
    return d


def create_post(data: BlogPostCreate, admin: User, session: Session) -> dict:
    repo = BlogRepository(session)

    if repo.find_by_slug(data.slug):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Slug already exists")

    post = BlogPost(
        **data.model_dump(),
        author_id=admin.id,
        published_at=datetime.now(timezone.utc) if data.published else None,
    )
    post = repo.create(post)
    log_action(session, admin.id, "CREATE", "BLOG", post.id, f"Created blog: {post.title}")

    d = BlogPostResponse.model_validate(post).model_dump()
    d["author_name"] = admin.full_name
    return d


def update_post(post_id: int, data: BlogPostUpdate, admin: User, session: Session) -> dict:
    repo = BlogRepository(session)
    post = repo.find_by_id(post_id)
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Blog post not found")

    update_data = data.model_dump(exclude_unset=True)

    if "slug" in update_data and update_data["slug"] != post.slug:
        if repo.find_by_slug(update_data["slug"]):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Slug already exists")

    # Set published_at when publishing for the first time
    if "published" in update_data and update_data["published"] and not post.published:
        update_data["published_at"] = datetime.now(timezone.utc)

    for key, value in update_data.items():
        setattr(post, key, value)

    post = repo.update(post)
    log_action(session, admin.id, "UPDATE", "BLOG", post.id, f"Updated blog: {post.title}")

    d = BlogPostResponse.model_validate(post).model_dump()
    d["author_name"] = _get_author_name(session, post.author_id)
    return d


def delete_post(post_id: int, admin: User, session: Session) -> None:
    repo = BlogRepository(session)
    post = repo.find_by_id(post_id)
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Blog post not found")

    repo.delete(post)
    log_action(session, admin.id, "DELETE", "BLOG", post.id, f"Deleted blog: {post.title}")


def get_categories(session: Session) -> list[str]:
    repo = BlogRepository(session)
    return repo.get_categories()


def _get_author_name(session: Session, author_id: int) -> Optional[str]:
    from app.repositories.user_repository import UserRepository
    user_repo = UserRepository(session)
    user = user_repo.find_by_id(author_id)
    return user.full_name if user else None
