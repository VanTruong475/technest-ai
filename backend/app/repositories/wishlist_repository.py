from typing import Optional

from sqlmodel import Session, select

from app.models.wishlist import WishlistItem


class WishlistRepository:
    def __init__(self, session: Session):
        self.session = session

    def find_by_user_and_product(self, user_id: int, product_id: int) -> Optional[WishlistItem]:
        statement = select(WishlistItem).where(
            WishlistItem.user_id == user_id,
            WishlistItem.product_id == product_id,
        )
        return self.session.exec(statement).first()

    def find_all_by_user_id(self, user_id: int) -> list[WishlistItem]:
        statement = (
            select(WishlistItem)
            .where(WishlistItem.user_id == user_id)
            .order_by(WishlistItem.created_at.desc())
        )
        return list(self.session.exec(statement).all())

    def create(self, item: WishlistItem) -> WishlistItem:
        self.session.add(item)
        self.session.commit()
        self.session.refresh(item)
        return item

    def delete(self, item: WishlistItem) -> None:
        self.session.delete(item)
        self.session.commit()
