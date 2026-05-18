from fastapi import HTTPException, status
from sqlmodel import Session

from app.models.user import User
from app.models.wishlist import WishlistItem
from app.repositories.product_repository import ProductRepository
from app.repositories.wishlist_repository import WishlistRepository
from app.schemas.wishlist import WishlistItemResponse, WishlistCheckResponse


def _build_wishlist_item_response(item: WishlistItem, session: Session) -> WishlistItemResponse:
    product_repo = ProductRepository(session)
    product = product_repo.find_by_id(item.product_id)

    return WishlistItemResponse(
        id=item.id,
        product_id=item.product_id,
        product_name=product.name if product else "Unknown",
        product_slug=product.slug if product else "",
        image_url=product.image_url if product else None,
        price=product.price if product else 0,
        sale_price=product.sale_price if product else None,
        created_at=item.created_at,
    )


def get_wishlist(current_user: User, session: Session) -> list[WishlistItemResponse]:
    repo = WishlistRepository(session)
    items = repo.find_all_by_user_id(current_user.id)
    return [_build_wishlist_item_response(item, session) for item in items]


def add_to_wishlist(current_user: User, product_id: int, session: Session) -> dict:
    product_repo = ProductRepository(session)
    product = product_repo.find_by_id(product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    repo = WishlistRepository(session)
    existing = repo.find_by_user_and_product(current_user.id, product_id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Product already in wishlist",
        )

    item = WishlistItem(user_id=current_user.id, product_id=product_id)
    repo.create(item)
    return {"message": "Added to wishlist"}


def remove_from_wishlist(current_user: User, product_id: int, session: Session) -> None:
    repo = WishlistRepository(session)
    item = repo.find_by_user_and_product(current_user.id, product_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not in wishlist",
        )
    repo.delete(item)


def check_wishlist(current_user: User, product_id: int, session: Session) -> WishlistCheckResponse:
    repo = WishlistRepository(session)
    item = repo.find_by_user_and_product(current_user.id, product_id)
    return WishlistCheckResponse(is_favorited=item is not None)
