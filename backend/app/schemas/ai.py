from typing import Optional

from pydantic import BaseModel, field_validator

from app.schemas.product import ProductResponse


class AISearchRequest(BaseModel):
    query: str
    limit: int = 10

    @field_validator("query")
    @classmethod
    def validate_query(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Query cannot be empty")
        return v.strip()

    @field_validator("limit")
    @classmethod
    def validate_limit(cls, v: int) -> int:
        if v < 1 or v > 50:
            raise ValueError("Limit must be between 1 and 50")
        return v


class AISearchResult(BaseModel):
    product: ProductResponse
    score: float
    reason: str


class AISearchResponse(BaseModel):
    query: str
    results: list[AISearchResult]
    total: int
