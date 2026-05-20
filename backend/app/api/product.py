from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session

from app.core.cache import cache_key, get_cached, set_cached, invalidate_prefix
from app.core.database import get_session
from app.core.dependencies import require_admin
from app.models.user import User
from app.repositories.product_repository import VALID_SORTS
from app.schemas.common import PaginatedResponse
from app.schemas.product import (
    BulkStockUpdateRequest,
    BulkStockUpdateResponse,
    ProductCreate,
    ProductResponse,
    ProductUpdate,
)
from app.services.product_service import (
    bulk_update_stock,
    create_product,
    delete_product,
    get_all_products,
    get_product_by_id,
    update_product,
)

router = APIRouter(prefix="/api/products", tags=["Products"])


@router.get("", response_model=PaginatedResponse[ProductResponse])
def list_products(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    category_id: Optional[int] = Query(None),
    brand_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    min_price: Optional[float] = Query(None),
    max_price: Optional[float] = Query(None),
    search: Optional[str] = Query(None),
    sort: str = Query("newest"),
    session: Session = Depends(get_session),
):
    if sort not in VALID_SORTS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid sort. Must be one of: {', '.join(VALID_SORTS)}",
        )

    ck = cache_key("products", page=page, limit=limit, category_id=category_id,
                    brand_id=brand_id, status=status, min_price=min_price,
                    max_price=max_price, search=search, sort=sort)
    cached = get_cached(ck)
    if cached is not None:
        return cached

    result = get_all_products(
        session,
        page=page,
        limit=limit,
        category_id=category_id,
        brand_id=brand_id,
        status_filter=status,
        min_price=min_price,
        max_price=max_price,
        search=search,
        sort=sort,
    )
    response = result.model_dump()
    set_cached(ck, response, ttl=300)
    return response


@router.put("/bulk-update", response_model=BulkStockUpdateResponse)
def bulk_stock_update(
    data: BulkStockUpdateRequest,
    admin: User = Depends(require_admin),
    session: Session = Depends(get_session),
):
    result = bulk_update_stock(data, admin, session)
    invalidate_prefix("products")
    return result


@router.get("/{product_id}", response_model=ProductResponse)
def get_product(product_id: int, session: Session = Depends(get_session)):
    return get_product_by_id(product_id, session)


@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create(
    data: ProductCreate,
    admin: User = Depends(require_admin),
    session: Session = Depends(get_session),
):
    result = create_product(data, admin, session)
    invalidate_prefix("products")
    return result


@router.put("/{product_id}", response_model=ProductResponse)
def update(
    product_id: int,
    data: ProductUpdate,
    admin: User = Depends(require_admin),
    session: Session = Depends(get_session),
):
    result = update_product(product_id, data, admin, session)
    invalidate_prefix("products")
    return result


@router.delete("/{product_id}", response_model=ProductResponse)
def delete(
    product_id: int,
    admin: User = Depends(require_admin),
    session: Session = Depends(get_session),
):
    delete_product(product_id, admin, session)
    invalidate_prefix("products")
    return get_product_by_id(product_id, session)
