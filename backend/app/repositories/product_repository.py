from typing import Optional

from sqlmodel import Session, select, func, and_

from app.models.product import Product


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

        if conditions:
            count_statement = select(func.count()).select_from(Product).where(and_(*conditions))
            total = self.session.exec(count_statement).one()
            statement = select(Product).where(and_(*conditions)).offset(offset).limit(limit)
        else:
            count_statement = select(func.count()).select_from(Product)
            total = self.session.exec(count_statement).one()
            statement = select(Product).offset(offset).limit(limit)

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
