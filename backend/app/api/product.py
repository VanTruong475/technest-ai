from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlmodel import Session

from app.core.database import get_session
from app.models.user import User
from app.schemas.product import ProductCreate, ProductResponse, ProductUpdate
from app.services.auth_service import get_current_user
from app.services.product_service import (
    create_product,
    delete_product,
    get_all_products,
    get_product_by_id,
    require_admin,
    update_product,
)

router = APIRouter(prefix="/api/products", tags=["Products"])


def check_admin(current_user: User = Depends(get_current_user)) -> User:
    return require_admin(current_user)


@router.get("", response_model=list[ProductResponse])
def list_products(
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
    admin: User = Depends(check_admin),
    session: Session = Depends(get_session),
):
    return create_product(data, admin, session)


@router.put("/{product_id}", response_model=ProductResponse)
def update(
    product_id: int,
    data: ProductUpdate,
    admin: User = Depends(check_admin),
    session: Session = Depends(get_session),
):
    return update_product(product_id, data, admin, session)


@router.delete("/{product_id}", response_model=ProductResponse)
def delete(
    product_id: int,
    admin: User = Depends(check_admin),
    session: Session = Depends(get_session),
):
    delete_product(product_id, admin, session)
    return get_product_by_id(product_id, session)
