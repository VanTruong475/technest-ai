from fastapi import APIRouter, Depends, status
from sqlmodel import Session

from app.core.database import get_session
from app.core.dependencies import require_admin
from app.models.user import User
from app.schemas.review import CanReviewResponse, ReviewCreate, ReviewResponse, ReviewUpdate
from app.services.auth_service import get_current_user
from app.services.review_service import (
    can_user_review,
    create_review,
    delete_review,
    get_reviews_by_product,
    update_review,
)

router = APIRouter(prefix="/api/reviews", tags=["Reviews"])


@router.get("/product/{product_id}", response_model=list[ReviewResponse])
def list_product_reviews(
    product_id: int,
    session: Session = Depends(get_session),
):
    return get_reviews_by_product(product_id, session)


@router.get("/can-review/{product_id}", response_model=CanReviewResponse)
def check_can_review(
    product_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    return can_user_review(current_user, product_id, session)


@router.post("", response_model=ReviewResponse, status_code=status.HTTP_201_CREATED)
def add_review(
    data: ReviewCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    return create_review(current_user, data, session)


@router.put("/{review_id}", response_model=ReviewResponse)
def edit_review(
    review_id: int,
    data: ReviewUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    is_admin = current_user.role == "ADMIN"
    return update_review(current_user, review_id, data, session, is_admin=is_admin)


@router.delete("/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_review(
    review_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    is_admin = current_user.role == "ADMIN"
    delete_review(current_user, review_id, session, is_admin=is_admin)
