from typing import Optional

from sqlmodel import Session, select

from app.models.cart import Cart, CartItem


class CartRepository:
    def __init__(self, session: Session):
        self.session = session

    def find_by_user_id(self, user_id: int) -> Optional[Cart]:
        statement = select(Cart).where(Cart.user_id == user_id)
        return self.session.exec(statement).first()

    def create(self, cart: Cart) -> Cart:
        self.session.add(cart)
        self.session.commit()
        self.session.refresh(cart)
        return cart

    def update(self, cart: Cart) -> Cart:
        self.session.add(cart)
        self.session.commit()
        self.session.refresh(cart)
        return cart


class CartItemRepository:
    def __init__(self, session: Session):
        self.session = session

    def find_by_cart_and_product(self, cart_id: int, product_id: int) -> Optional[CartItem]:
        statement = select(CartItem).where(
            CartItem.cart_id == cart_id,
            CartItem.product_id == product_id,
        )
        return self.session.exec(statement).first()

    def find_by_id(self, item_id: int) -> Optional[CartItem]:
        statement = select(CartItem).where(CartItem.id == item_id)
        return self.session.exec(statement).first()

    def find_by_cart_id(self, cart_id: int) -> list[CartItem]:
        statement = select(CartItem).where(CartItem.cart_id == cart_id)
        return list(self.session.exec(statement).all())

    def create(self, item: CartItem) -> CartItem:
        self.session.add(item)
        self.session.commit()
        self.session.refresh(item)
        return item

    def update(self, item: CartItem) -> CartItem:
        self.session.add(item)
        self.session.commit()
        self.session.refresh(item)
        return item

    def delete(self, item: CartItem) -> None:
        self.session.delete(item)
        self.session.commit()
