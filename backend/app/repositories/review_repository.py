from typing import Optional

from sqlmodel import Session, select, func, col

from app.models.review import Review


class ReviewRepository:
    def __init__(self, session: Session):
        self.session = session

    def find_by_id(self, review_id: int) -> Optional[Review]:
        statement = select(Review).where(Review.id == review_id)
        return self.session.exec(statement).first()

    def find_by_user_and_product(self, user_id: int, product_id: int) -> Optional[Review]:
        statement = select(Review).where(
            Review.user_id == user_id,
            Review.product_id == product_id,
        )
        return self.session.exec(statement).first()

    def find_by_product_id(self, product_id: int) -> list[Review]:
        statement = (
            select(Review)
            .where(Review.product_id == product_id)
            .order_by(Review.created_at.desc())
        )
        return list(self.session.exec(statement).all())

    def find_all(self, page: int = 1, limit: int = 10) -> tuple[list[Review], int]:
        count_statement = select(func.count()).select_from(Review)
        total = self.session.exec(count_statement).one()

        offset = (page - 1) * limit
        statement = (
            select(Review)
            .order_by(col(Review.created_at).desc(), col(Review.id).desc())
            .offset(offset)
            .limit(limit)
        )
        reviews = list(self.session.exec(statement).all())
        return reviews, total

    def get_product_rating_summary(self, product_id: int) -> dict:
        statement = select(
            func.avg(Review.rating).label("average"),
            func.count(Review.id).label("count"),
        ).where(Review.product_id == product_id)
        result = self.session.exec(statement).one()
        return {
            "rating_average": round(float(result.average), 1) if result.average else None,
            "rating_count": result.count or 0,
        }

    def create(self, review: Review) -> Review:
        self.session.add(review)
        self.session.commit()
        self.session.refresh(review)
        return review

    def update(self, review: Review) -> Review:
        self.session.add(review)
        self.session.commit()
        self.session.refresh(review)
        return review

    def delete(self, review: Review) -> None:
        self.session.delete(review)
        self.session.commit()
