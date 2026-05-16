from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.core.database import get_session
from app.models.user import User
from app.schemas.cart import CartItemCreate, CartItemUpdate, CartResponse
from app.services.auth_service import get_current_user
from app.services.cart_service import (
    add_item,
    delete_item,
    get_cart,
    update_item,
)

router = APIRouter(prefix="/api/cart", tags=["Cart"])


@router.get("", response_model=CartResponse)
def view_cart(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    return get_cart(current_user, session)


@router.post("/items", response_model=CartResponse)
def add_to_cart(
    data: CartItemCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    return add_item(current_user, data, session)


@router.put("/items/{item_id}", response_model=CartResponse)
def update_cart_item(
    item_id: int,
    data: CartItemUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    return update_item(current_user, item_id, data, session)


@router.delete("/items/{item_id}", response_model=CartResponse)
def delete_cart_item(
    item_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    return delete_item(current_user, item_id, session)
