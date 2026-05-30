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


class AIRecommendRequest(BaseModel):
    strategy: str = "cart"
    limit: int = 10

    @field_validator("strategy")
    @classmethod
    def validate_strategy(cls, v: str) -> str:
        allowed = {"cart", "history", "popular", "co_occurrence"}
        if v not in allowed:
            raise ValueError(f"Strategy must be one of: {', '.join(sorted(allowed))}")
        return v

    @field_validator("limit")
    @classmethod
    def validate_limit(cls, v: int) -> int:
        if v < 1 or v > 20:
            raise ValueError("Limit must be between 1 and 20")
        return v


class AIRecommendResult(BaseModel):
    product: ProductResponse
    score: float
    reason: str


class AIRecommendResponse(BaseModel):
    strategy: str
    results: list[AIRecommendResult]
    total: int


# ─────────────────────────────────────────────
# AI Chat
# ─────────────────────────────────────────────

class ChatHistoryItem(BaseModel):
    role: str  # "user" hoặc "assistant"
    content: str

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        if v not in ("user", "assistant"):
            raise ValueError("Role must be 'user' or 'assistant'")
        return v

    @field_validator("content")
    @classmethod
    def validate_content(cls, v: str) -> str:
        if len(v) > 2000:
            raise ValueError("Content must be at most 2000 characters")
        return v


class ChatRequest(BaseModel):
    message: str
    limit: int = 5
    history: list[ChatHistoryItem] = []

    @field_validator("message")
    @classmethod
    def validate_message(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Message cannot be empty")
        return v.strip()

    @field_validator("limit")
    @classmethod
    def validate_chat_limit(cls, v: int) -> int:
        if v < 1 or v > 10:
            raise ValueError("Limit must be between 1 and 10")
        return v

    @field_validator("history")
    @classmethod
    def validate_history(cls, v: list) -> list:
        return v[-20:]  # Giới hạn 20 tin nhắn gần nhất


class ChatProductResult(BaseModel):
    product: ProductResponse
    score: float
    reason: str


class ChatResponse(BaseModel):
    message: str
    reply: str
    products: list[ChatProductResult]
    total: int
    suggestions: list[str]
