from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlmodel import Session

from app.core.cache import cache_key, get_cached, set_cached, invalidate_prefix
from app.core.database import get_session
from app.core.dependencies import require_admin
from app.models.user import User
from app.schemas.blog_post import BlogPostCreate, BlogPostUpdate
from app.services.blog_service import (
    create_post,
    delete_post,
    get_all_posts,
    get_categories,
    get_post_by_slug,
    update_post,
)

router = APIRouter(prefix="/api/blog", tags=["Blog"])


@router.get("")
def list_posts(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
    category: Optional[str] = Query(None),
    session: Session = Depends(get_session),
):
    ck = cache_key("blog", page=page, limit=limit, category=category)
    cached = get_cached(ck)
    if cached is not None:
        return cached

    result = get_all_posts(session, page=page, limit=limit, category=category)
    response = result.model_dump()
    set_cached(ck, response, ttl=120)
    return response


@router.get("/categories")
def list_categories(session: Session = Depends(get_session)):
    return get_categories(session)


@router.get("/{slug}")
def get_post(slug: str, session: Session = Depends(get_session)):
    return get_post_by_slug(slug, session)


@router.post("", status_code=status.HTTP_201_CREATED)
def create(
    data: BlogPostCreate,
    admin: User = Depends(require_admin),
    session: Session = Depends(get_session),
):
    result = create_post(data, admin, session)
    invalidate_prefix("blog")
    return result


@router.put("/{post_id}")
def update(
    post_id: int,
    data: BlogPostUpdate,
    admin: User = Depends(require_admin),
    session: Session = Depends(get_session),
):
    result = update_post(post_id, data, admin, session)
    invalidate_prefix("blog")
    return result


@router.delete("/{post_id}")
def delete(
    post_id: int,
    admin: User = Depends(require_admin),
    session: Session = Depends(get_session),
):
    delete_post(post_id, admin, session)
    invalidate_prefix("blog")
    return {"detail": "Deleted"}
