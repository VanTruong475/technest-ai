from fastapi import APIRouter, Depends, Query, status
from sqlmodel import Session

from app.core.cache import cache_key, get_cached, set_cached, invalidate_prefix
from app.core.database import get_session
from app.core.dependencies import require_admin
from app.models.user import User
from app.schemas.category import CategoryCreate, CategoryResponse, CategoryUpdate
from app.schemas.common import PaginatedResponse
from app.services.category_service import (
    create_category,
    delete_category,
    get_all_categories,
    get_category_by_id,
    update_category,
)

router = APIRouter(prefix="/api/categories", tags=["Categories"])


@router.get("", response_model=PaginatedResponse[CategoryResponse])
def list_categories(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    session: Session = Depends(get_session),
):
    ck = cache_key("categories", page=page, limit=limit)
    cached = get_cached(ck)
    if cached is not None:
        return cached

    result = get_all_categories(session, page=page, limit=limit)
    response = result.model_dump()
    set_cached(ck, response, ttl=1800)
    return response


@router.get("/{category_id}", response_model=CategoryResponse)
def get_category(category_id: int, session: Session = Depends(get_session)):
    return get_category_by_id(category_id, session)


@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def create(
    data: CategoryCreate,
    admin: User = Depends(require_admin),
    session: Session = Depends(get_session),
):
    result = create_category(data, admin, session)
    invalidate_prefix("categories")
    return result


@router.put("/{category_id}", response_model=CategoryResponse)
def update(
    category_id: int,
    data: CategoryUpdate,
    admin: User = Depends(require_admin),
    session: Session = Depends(get_session),
):
    result = update_category(category_id, data, admin, session)
    invalidate_prefix("categories")
    return result


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete(
    category_id: int,
    admin: User = Depends(require_admin),
    session: Session = Depends(get_session),
):
    delete_category(category_id, admin, session)
    invalidate_prefix("categories")
    return None
