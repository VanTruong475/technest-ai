from typing import Optional

from sqlalchemy import update
from sqlmodel import Session, select, func, and_

from app.models.product import Product

SORT_MAP = {
    "newest": Product.created_at.desc(),
    "price_asc": Product.price.asc(),
    "price_desc": Product.price.desc(),
}

VALID_SORTS = list(SORT_MAP.keys())


class ProductRepository:
    def __init__(self, session: Session):
        self.session = session

    def find_all(
        self,
        page: int = 1,
        limit: int = 10,
        category_id: Optional[int] = None,
        brand_id: Optional[int] = None,
        status: Optional[str] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        search: Optional[str] = None,
        sort: str = "newest",
    ) -> tuple[list[Product], int]:
        offset = (page - 1) * limit
        conditions = []

        if category_id is not None:
            conditions.append(Product.category_id == category_id)
        if brand_id is not None:
            conditions.append(Product.brand_id == brand_id)
        if status is not None:
            conditions.append(Product.status == status)
        if min_price is not None:
            conditions.append(Product.price >= min_price)
        if max_price is not None:
            conditions.append(Product.price <= max_price)
        if search is not None:
            conditions.append(Product.name.ilike(f"%{search}%"))

        order_by = SORT_MAP.get(sort, Product.created_at.desc())

        if conditions:
            count_statement = select(func.count()).select_from(Product).where(and_(*conditions))
            total = self.session.exec(count_statement).one()
            statement = select(Product).where(and_(*conditions)).order_by(order_by).offset(offset).limit(limit)
        else:
            count_statement = select(func.count()).select_from(Product)
            total = self.session.exec(count_statement).one()
            statement = select(Product).order_by(order_by).offset(offset).limit(limit)

        items = list(self.session.exec(statement).all())
        return items, total

    def find_by_id(self, product_id: int) -> Optional[Product]:
        statement = select(Product).where(Product.id == product_id)
        return self.session.exec(statement).first()

    def find_by_slug(self, slug: str) -> Optional[Product]:
        statement = select(Product).where(Product.slug == slug)
        return self.session.exec(statement).first()

    def create(self, product: Product) -> Product:
        self.session.add(product)
        self.session.commit()
        self.session.refresh(product)
        return product

    def update(self, product: Product) -> Product:
        self.session.add(product)
        self.session.commit()
        self.session.refresh(product)
        return product

    def delete(self, product: Product) -> None:
        self.session.delete(product)
        self.session.commit()

    def find_by_ids(self, product_ids: list[int]) -> list[Product]:
        statement = select(Product).where(Product.id.in_(product_ids))
        return list(self.session.exec(statement).all())

    def bulk_update(self, products: list[Product]) -> list[Product]:
        for product in products:
            self.session.add(product)
        self.session.commit()
        for product in products:
            self.session.refresh(product)
        return products

    def decrement_stock_if_available(self, product_id: int, quantity: int) -> bool:
        """Atomic conditional UPDATE: decrement stock only if stock >= quantity.

        Returns True if the row was updated, False if stock was insufficient
        (race condition: another transaction decremented between our check and update).
        Does NOT commit — caller controls the transaction boundary.
        """
        result = self.session.exec(
            update(Product)
            .where(Product.id == product_id)
            .where(Product.stock >= quantity)
            .values(stock=Product.stock - quantity)
        )
        return result.rowcount == 1

    def increment_stock(self, product_id: int, quantity: int) -> None:
        """Atomic UPDATE to restore stock (e.g. on order cancellation).
        Does NOT commit — caller controls the transaction boundary.
        """
        self.session.exec(
            update(Product)
            .where(Product.id == product_id)
            .values(stock=Product.stock + quantity)
        )
