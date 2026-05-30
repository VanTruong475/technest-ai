from datetime import datetime
from typing import Optional

from pydantic import BaseModel, field_validator


class ReviewCreate(BaseModel):
    product_id: int
    rating: int
    comment: Optional[str] = None

    @field_validator("rating")
    @classmethod
    def validate_rating(cls, v: int) -> int:
        if v < 1 or v > 5:
            raise ValueError("Rating must be between 1 and 5")
        return v

    @field_validator("comment")
    @classmethod
    def validate_comment(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and len(v) > 2000:
            raise ValueError("Comment must be at most 2000 characters")
        return v


class ReviewUpdate(BaseModel):
    rating: Optional[int] = None
    comment: Optional[str] = None

    @field_validator("rating")
    @classmethod
    def validate_rating(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and (v < 1 or v > 5):
            raise ValueError("Rating must be between 1 and 5")
        return v

    @field_validator("comment")
    @classmethod
    def validate_comment(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and len(v) > 2000:
            raise ValueError("Comment must be at most 2000 characters")
        return v


class ReviewResponse(BaseModel):
    id: int
    user_id: int
    user_name: str
    product_id: int
    rating: int
    comment: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class ProductRatingSummary(BaseModel):
    rating_average: Optional[float] = None
    rating_count: int = 0


class CanReviewResponse(BaseModel):
    can_review: bool
    has_purchased: bool
    has_reviewed: bool
    reason: Optional[str] = None


class CanReviewBulkRequest(BaseModel):
    product_ids: list[int]

    @field_validator("product_ids")
    @classmethod
    def validate_product_ids(cls, v: list[int]) -> list[int]:
        if len(v) > 50:
            raise ValueError("Maximum 50 product IDs per request")
        if len(v) == 0:
            raise ValueError("At least one product ID is required")
        return v


class CanReviewBulkResponse(BaseModel):
    results: dict[int, CanReviewResponse]
