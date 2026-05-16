from typing import Optional

from sqlmodel import Session, select, func

from app.models.brand import Brand


class BrandRepository:
    def __init__(self, session: Session):
        self.session = session

    def find_all(self, page: int = 1, limit: int = 10) -> tuple[list[Brand], int]:
        offset = (page - 1) * limit

        count_statement = select(func.count()).select_from(Brand)
        total = self.session.exec(count_statement).one()

        statement = select(Brand).offset(offset).limit(limit)
        items = list(self.session.exec(statement).all())

        return items, total

    def find_by_id(self, brand_id: int) -> Optional[Brand]:
        statement = select(Brand).where(Brand.id == brand_id)
        return self.session.exec(statement).first()

    def find_by_slug(self, slug: str) -> Optional[Brand]:
        statement = select(Brand).where(Brand.slug == slug)
        return self.session.exec(statement).first()

    def create(self, brand: Brand) -> Brand:
        self.session.add(brand)
        self.session.commit()
        self.session.refresh(brand)
        return brand

    def update(self, brand: Brand) -> Brand:
        self.session.add(brand)
        self.session.commit()
        self.session.refresh(brand)
        return brand

    def delete(self, brand: Brand) -> None:
        self.session.delete(brand)
        self.session.commit()
