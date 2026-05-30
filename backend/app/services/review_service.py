from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlmodel import Session

from app.models.review import Review
from app.models.user import User
from app.repositories.order_repository import OrderItemRepository
from app.repositories.product_repository import ProductRepository
from app.repositories.review_repository import ReviewRepository
from app.repositories.user_repository import UserRepository
from app.schemas.review import (
    CanReviewBulkResponse,
    CanReviewResponse,
    ReviewCreate,
    ReviewResponse,
    ReviewUpdate,
)


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

    user_ids = list({r.user_id for r in reviews})
    user_repo = UserRepository(session)
    users = user_repo.find_by_ids(user_ids) if user_ids else []
    user_map = {u.id: u for u in users}

    results = []
    for r in reviews:
        user = user_map.get(r.user_id)
        results.append(ReviewResponse(
            id=r.id,
            user_id=r.user_id,
            user_name=user.full_name if user else "Unknown",
            product_id=r.product_id,
            rating=r.rating,
            comment=r.comment,
            created_at=r.created_at,
            updated_at=r.updated_at,
        ))
    return results


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

    order_item_repo = OrderItemRepository(session)
    if not order_item_repo.has_user_purchased_product(current_user.id, data.product_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must purchase and receive this product before reviewing",
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


def can_user_review(
    current_user: User,
    product_id: int,
    session: Session,
) -> CanReviewResponse:
    """Kiểm tra user có thể đánh giá sản phẩm không."""
    product_repo = ProductRepository(session)
    if not product_repo.find_by_id(product_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    review_repo = ReviewRepository(session)
    has_reviewed = review_repo.find_by_user_and_product(current_user.id, product_id) is not None

    order_item_repo = OrderItemRepository(session)
    has_purchased = order_item_repo.has_user_purchased_product(current_user.id, product_id)

    if has_reviewed:
        return CanReviewResponse(
            can_review=False,
            has_purchased=has_purchased,
            has_reviewed=True,
            reason="You have already reviewed this product",
        )
    if not has_purchased:
        return CanReviewResponse(
            can_review=False,
            has_purchased=False,
            has_reviewed=False,
            reason="You must purchase and receive this product before reviewing",
        )
    return CanReviewResponse(
        can_review=True,
        has_purchased=True,
        has_reviewed=False,
    )


def can_user_review_bulk(
    current_user: User,
    product_ids: list[int],
    session: Session,
) -> CanReviewBulkResponse:
    """Kiểm tra user có thể đánh giá nhiều sản phẩm cùng lúc."""
    review_repo = ReviewRepository(session)
    order_item_repo = OrderItemRepository(session)

    results: dict[int, CanReviewResponse] = {}
    for pid in product_ids:
        has_reviewed = review_repo.find_by_user_and_product(current_user.id, pid) is not None
        has_purchased = order_item_repo.has_user_purchased_product(current_user.id, pid)

        if has_reviewed:
            results[pid] = CanReviewResponse(
                can_review=False, has_purchased=has_purchased, has_reviewed=True,
                reason="You have already reviewed this product",
            )
        elif not has_purchased:
            results[pid] = CanReviewResponse(
                can_review=False, has_purchased=False, has_reviewed=False,
                reason="You must purchase and receive this product before reviewing",
            )
        else:
            results[pid] = CanReviewResponse(
                can_review=True, has_purchased=True, has_reviewed=False,
            )

    return CanReviewBulkResponse(results=results)
