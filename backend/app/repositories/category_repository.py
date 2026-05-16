from typing import Optional

from sqlmodel import Session, select

from app.models.category import Category


class CategoryRepository:
    def __init__(self, session: Session):
        self.session = session

    def find_all(self) -> list[Category]:
        statement = select(Category)
        return list(self.session.exec(statement).all())

    def find_by_id(self, category_id: int) -> Optional[Category]:
        statement = select(Category).where(Category.id == category_id)
        return self.session.exec(statement).first()

    def find_by_slug(self, slug: str) -> Optional[Category]:
        statement = select(Category).where(Category.slug == slug)
        return self.session.exec(statement).first()

    def create(self, category: Category) -> Category:
        self.session.add(category)
        self.session.commit()
        self.session.refresh(category)
        return category

    def update(self, category: Category) -> Category:
        self.session.add(category)
        self.session.commit()
        self.session.refresh(category)
        return category

    def delete(self, category: Category) -> None:
        self.session.delete(category)
        self.session.commit()
