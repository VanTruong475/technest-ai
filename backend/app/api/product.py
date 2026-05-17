from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlmodel import Session

from app.core.database import get_session
from app.core.dependencies import require_admin
from app.models.user import User
from app.schemas.common import PaginatedResponse
from app.schemas.product import ProductCreate, ProductResponse, ProductUpdate
from app.services.product_service import (
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
    session: Session = Depends(get_session),
):
    return get_all_products(
        session,
        page=page,
        limit=limit,
        category_id=category_id,
        brand_id=brand_id,
        status_filter=status,
        min_price=min_price,
        max_price=max_price,
        search=search,
    )


@router.get("/{product_id}", response_model=ProductResponse)
def get_product(product_id: int, session: Session = Depends(get_session)):
    return get_product_by_id(product_id, session)


@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create(
    data: ProductCreate,
    admin: User = Depends(require_admin),
    session: Session = Depends(get_session),
):
    return create_product(data, admin, session)


@router.put("/{product_id}", response_model=ProductResponse)
def update(
    product_id: int,
    data: ProductUpdate,
    admin: User = Depends(require_admin),
    session: Session = Depends(get_session),
):
    return update_product(product_id, data, admin, session)


@router.delete("/{product_id}", response_model=ProductResponse)
def delete(
    product_id: int,
    admin: User = Depends(require_admin),
    session: Session = Depends(get_session),
):
    delete_product(product_id, admin, session)
    return get_product_by_id(product_id, session)
