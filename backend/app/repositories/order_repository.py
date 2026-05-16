from typing import Optional

from sqlmodel import Session, select, func

from app.models.order import Order, OrderItem


class OrderRepository:
    def __init__(self, session: Session):
        self.session = session

    def find_all_by_user_id(self, user_id: int, page: int = 1, limit: int = 10) -> tuple[list[Order], int]:
        offset = (page - 1) * limit

        count_statement = select(func.count()).select_from(Order).where(Order.user_id == user_id)
        total = self.session.exec(count_statement).one()

        statement = select(Order).where(Order.user_id == user_id).offset(offset).limit(limit)
        items = list(self.session.exec(statement).all())

        return items, total

    def find_all(self, page: int = 1, limit: int = 10) -> tuple[list[Order], int]:
        offset = (page - 1) * limit

        count_statement = select(func.count()).select_from(Order)
        total = self.session.exec(count_statement).one()

        statement = select(Order).offset(offset).limit(limit)
        items = list(self.session.exec(statement).all())

        return items, total

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
