from fastapi import APIRouter, Depends, status
from sqlmodel import Session

from app.core.database import get_session
from app.models.user import User
from app.schemas.wishlist import WishlistCheckResponse, WishlistItemResponse
from app.services.auth_service import get_current_user
from app.services.wishlist_service import (
    add_to_wishlist,
    check_wishlist,
    get_wishlist,
    remove_from_wishlist,
)

router = APIRouter(prefix="/api/wishlist", tags=["Wishlist"])


@router.get("", response_model=list[WishlistItemResponse])
def list_wishlist(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    return get_wishlist(current_user, session)


@router.post("/{product_id}", status_code=status.HTTP_201_CREATED)
def add_item(
    product_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    return add_to_wishlist(current_user, product_id, session)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_item(
    product_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    remove_from_wishlist(current_user, product_id, session)


@router.get("/check/{product_id}", response_model=WishlistCheckResponse)
def check_item(
    product_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    return check_wishlist(current_user, product_id, session)
