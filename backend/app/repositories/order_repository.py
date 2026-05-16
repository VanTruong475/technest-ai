from typing import Optional

from sqlmodel import Session, select

from app.models.order import Order, OrderItem


class OrderRepository:
    def __init__(self, session: Session):
        self.session = session

    def find_all_by_user_id(self, user_id: int) -> list[Order]:
        statement = select(Order).where(Order.user_id == user_id)
        return list(self.session.exec(statement).all())

    def find_all(self) -> list[Order]:
        statement = select(Order)
        return list(self.session.exec(statement).all())

    def find_by_id(self, order_id: int) -> Optional[Order]:
        statement = select(Order).where(Order.id == order_id)
        return self.session.exec(statement).first()

    def create(self, order: Order) -> Order:
        self.session.add(order)
        self.session.commit()
        self.session.refresh(order)
        return order

    def update(self, order: Order) -> Order:
        self.session.add(order)
        self.session.commit()
        self.session.refresh(order)
        return order


class OrderItemRepository:
    def __init__(self, session: Session):
        self.session = session

    def find_by_order_id(self, order_id: int) -> list[OrderItem]:
        statement = select(OrderItem).where(OrderItem.order_id == order_id)
        return list(self.session.exec(statement).all())

    def create(self, item: OrderItem) -> OrderItem:
        self.session.add(item)
        self.session.commit()
        self.session.refresh(item)
        return item
