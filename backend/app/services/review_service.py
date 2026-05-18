from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlmodel import Session

from app.models.review import Review
from app.models.user import User
from app.repositories.product_repository import ProductRepository
from app.repositories.review_repository import ReviewRepository
from app.repositories.user_repository import UserRepository
from app.schemas.review import ReviewCreate, ReviewResponse, ReviewUpdate


def _build_review_response(review: Review, session: Session) -> ReviewResponse:
    user_repo = UserRepository(session)
    user = user_repo.find_by_id(review.user_id)
    user_name = user.full_name if user else "Unknown"

    return ReviewResponse(
        id=review.id,
        user_id=review.user_id,
        user_name=user_name,
        product_id=review.product_id,
        rating=review.rating,
        comment=review.comment,
        created_at=review.created_at,
        updated_at=review.updated_at,
    )


def get_reviews_by_product(product_id: int, session: Session) -> list[ReviewResponse]:
    review_repo = ReviewRepository(session)
    reviews = review_repo.find_by_product_id(product_id)
    return [_build_review_response(r, session) for r in reviews]


def create_review(
    current_user: User,
    data: ReviewCreate,
    session: Session,
) -> ReviewResponse:
    product_repo = ProductRepository(session)
    review_repo = ReviewRepository(session)

    product = product_repo.find_by_id(data.product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    existing = review_repo.find_by_user_and_product(current_user.id, data.product_id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already reviewed this product",
        )

    review = Review(
        user_id=current_user.id,
        product_id=data.product_id,
        rating=data.rating,
        comment=data.comment,
    )
    review = review_repo.create(review)
    return _build_review_response(review, session)


def update_review(
    current_user: User,
    review_id: int,
    data: ReviewUpdate,
    session: Session,
    is_admin: bool = False,
) -> ReviewResponse:
    review_repo = ReviewRepository(session)
    review = review_repo.find_by_id(review_id)

    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found",
        )

    if not is_admin and review.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this review",
        )

    if data.rating is not None:
        review.rating = data.rating
    if data.comment is not None:
        review.comment = data.comment
    review.updated_at = datetime.now(timezone.utc)

    review = review_repo.update(review)
    return _build_review_response(review, session)


def delete_review(
    current_user: User,
    review_id: int,
    session: Session,
    is_admin: bool = False,
) -> None:
    review_repo = ReviewRepository(session)
    review = review_repo.find_by_id(review_id)

    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found",
        )

    if not is_admin and review.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this review",
        )

    review_repo.delete(review)
