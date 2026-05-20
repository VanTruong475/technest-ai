from typing import Optional

from sqlmodel import Session, select, func

from app.models.user import User


class UserRepository:
    def __init__(self, session: Session):
        self.session = session

    def find_by_email(self, email: str) -> Optional[User]:
        statement = select(User).where(User.email == email)
        return self.session.exec(statement).first()

    def find_by_id(self, user_id: int) -> Optional[User]:
        statement = select(User).where(User.id == user_id)
        return self.session.exec(statement).first()

    def find_by_ids(self, user_ids: list[int]) -> list[User]:
        statement = select(User).where(User.id.in_(user_ids))
        return list(self.session.exec(statement).all())

    def find_all(self, page: int = 1, limit: int = 10) -> tuple[list[User], int]:
        offset = (page - 1) * limit

        count_statement = select(func.count()).select_from(User)
        total = self.session.exec(count_statement).one()

        statement = select(User).offset(offset).limit(limit)
        items = list(self.session.exec(statement).all())

        return items, total

    def create(self, user: User) -> User:
        self.session.add(user)
        self.session.commit()
        self.session.refresh(user)
        return user

    def update(self, user: User) -> User:
        self.session.add(user)
        self.session.commit()
        self.session.refresh(user)
        return user
