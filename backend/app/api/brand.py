from fastapi import APIRouter, Depends, Query, status
from sqlmodel import Session

from app.core.cache import cache_key, get_cached, set_cached, invalidate_prefix
from app.core.database import get_session
from app.core.dependencies import require_admin
from app.models.user import User
from app.schemas.brand import BrandCreate, BrandResponse, BrandUpdate
from app.schemas.common import PaginatedResponse
from app.services.brand_service import (
    create_brand,
    delete_brand,
    get_all_brands,
    get_brand_by_id,
    update_brand,
)

router = APIRouter(prefix="/api/brands", tags=["Brands"])


@router.get("", response_model=PaginatedResponse[BrandResponse])
def list_brands(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    session: Session = Depends(get_session),
):
    ck = cache_key("brands", page=page, limit=limit)
    cached = get_cached(ck)
    if cached is not None:
        return cached

    result = get_all_brands(session, page=page, limit=limit)
    response = result.model_dump()
    set_cached(ck, response, ttl=1800)
    return response


@router.get("/{brand_id}", response_model=BrandResponse)
def get_brand(brand_id: int, session: Session = Depends(get_session)):
    return get_brand_by_id(brand_id, session)


@router.post("", response_model=BrandResponse, status_code=status.HTTP_201_CREATED)
def create(
    data: BrandCreate,
    admin: User = Depends(require_admin),
    session: Session = Depends(get_session),
):
    result = create_brand(data, admin, session)
    invalidate_prefix("brands")
    return result


@router.put("/{brand_id}", response_model=BrandResponse)
def update(
    brand_id: int,
    data: BrandUpdate,
    admin: User = Depends(require_admin),
    session: Session = Depends(get_session),
):
    result = update_brand(brand_id, data, admin, session)
    invalidate_prefix("brands")
    return result


@router.delete("/{brand_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete(
    brand_id: int,
    admin: User = Depends(require_admin),
    session: Session = Depends(get_session),
):
    delete_brand(brand_id, admin, session)
    invalidate_prefix("brands")
    return None
