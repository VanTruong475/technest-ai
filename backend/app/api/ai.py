from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.core.database import get_session
from app.schemas.ai import AISearchRequest, AISearchResponse
from app.services.ai_service import smart_search

router = APIRouter(prefix="/api/ai", tags=["AI"])


@router.post("/search", response_model=AISearchResponse)
def search(
    request: AISearchRequest,
    session: Session = Depends(get_session),
):
    """Tìm kiếm sản phẩm thông minh (rule-based)."""
    return smart_search(request, session)
