from typing import Optional
import json

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi.responses import StreamingResponse
from jose import JWTError, jwt
from sqlmodel import Session

from app.core.config import settings
from app.core.database import get_session
from app.core.dependencies import require_admin
from app.core.rate_limit import limiter
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.ai import (
    AISearchRequest, AISearchResponse,
    AIRecommendResponse,
    ChatRequest, ChatResponse,
)
from app.repositories.product_repository import ProductRepository
from app.services.ai_service import (
    smart_search,
    recommend_by_cart,
    recommend_by_history,
    recommend_co_occurrence,
    recommend_popular,
    chat_with_ai,
    stream_chat,
)
from app.services.auth_service import AUTH_COOKIE_NAME
from app.services.llm.metrics import llm_metrics

router = APIRouter(prefix="/api/ai", tags=["AI"])

security_optional = HTTPBearer(auto_error=False)


def _get_optional_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_optional),
    session: Session = Depends(get_session),
) -> Optional[User]:
    """Lấy user từ cookie hoặc Bearer token nếu có; None nếu không auth."""
    token: Optional[str] = request.cookies.get(AUTH_COOKIE_NAME)
    if not token and credentials is not None:
        token = credentials.credentials
    if not token:
        return None

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id_str: str = payload.get("sub")
        if user_id_str is None:
            return None
        try:
            user_id: int = int(user_id_str)
        except (ValueError, TypeError):
            return None
    except JWTError:
        return None

    repo = UserRepository(session)
    user = repo.find_by_id(user_id)
    if user is None or not user.is_active:
        return None
    return user


@router.post("/search", response_model=AISearchResponse)
@limiter.limit("20/minute")
def search(
    request: Request,
    body: AISearchRequest,
    session: Session = Depends(get_session),
):
    """Tìm kiếm sản phẩm thông minh (rule-based)."""
    return smart_search(body, session)


@router.get("/recommend", response_model=AIRecommendResponse)
@limiter.limit("20/minute")
def recommend(
    request: Request,
    strategy: str = Query(default="cart", description="Strategy: cart, history, popular, co_occurrence"),
    limit: int = Query(default=10, ge=1, le=20, description="Số lượng kết quả (1-20)"),
    product_id: Optional[int] = Query(
        default=None,
        description="Required khi strategy=co_occurrence: anchor product để tìm mua chung",
    ),
    user: Optional[User] = Depends(_get_optional_user),
    session: Session = Depends(get_session),
):
    """
    Gợi ý sản phẩm thông minh.

    - **cart**: Dựa trên sản phẩm trong giỏ hàng (cần JWT)
    - **history**: Dựa trên lịch sử mua hàng (cần JWT)
    - **popular**: Sản phẩm phổ biến nhất (public)
    - **co_occurrence**: "Khách mua sản phẩm này cũng mua...". Cần `product_id`.
      Public. Fallback: cùng category → popular nếu chưa đủ dữ liệu mua chung.
    """
    allowed_strategies = {"cart", "history", "popular", "co_occurrence"}
    if strategy not in allowed_strategies:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Strategy must be one of: {', '.join(sorted(allowed_strategies))}",
        )

    if strategy in ("cart", "history") and user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required for this strategy",
        )

    if strategy == "co_occurrence":
        if product_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="product_id query param is required for strategy=co_occurrence",
            )
        product = ProductRepository(session).find_by_id(product_id)
        if product is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product not found",
            )
        return recommend_co_occurrence(product_id, limit, session)

    if strategy == "cart":
        return recommend_by_cart(user.id, limit, session)
    elif strategy == "history":
        return recommend_by_history(user.id, limit, session)
    else:
        return recommend_popular(limit, session)


@router.post("/chat", response_model=ChatResponse)
@limiter.limit("10/minute")
def chat(
    request: Request,
    body: ChatRequest,
    session: Session = Depends(get_session),
):
    """
    Chatbot tư vấn sản phẩm thông minh (rule-based).

    Hỗ trợ nhận diện:
    - **Category**: điện thoại, laptop, tablet, tai nghe, phụ kiện
    - **Brand**: Apple, Samsung, Sony, Dell, Xiaomi
    - **Budget**: dưới X triệu, giá rẻ, cao cấp
    - **Nhu cầu**: học tập, công việc, gaming, chụp ảnh, nghe nhạc, chống ồn

    Nếu không tìm thấy kết quả, fallback sang sản phẩm phổ biến/mới nhất.
    """
    return chat_with_ai(body, session)


@router.post("/chat/stream")
@limiter.limit("10/minute")
def chat_stream(
    request: Request,
    body: ChatRequest,
    session: Session = Depends(get_session),
):
    """Chatbot tư vấn — streaming token-by-token qua Server-Sent Events.

    Mỗi event là 1 dòng `data: {...}\\n\\n`:
    - `{"type":"token","text":"..."}` cho mỗi mảnh reply.
    - `{"type":"done","products":[...],"suggestions":[...],"total":N}` ở cuối.

    Products/giá/tồn kho luôn từ DB. Lỗi LLM → fallback rule-based reply.
    Endpoint non-stream `/chat` vẫn giữ nguyên làm fallback cho client cũ.
    """

    def event_stream():
        try:
            for event in stream_chat(body, session):
                yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"
        except Exception:  # noqa: BLE001 — không để stream crash giữa chừng
            yield f'data: {json.dumps({"type": "done", "products": [], "suggestions": [], "total": 0})}\n\n'

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # tắt buffering của reverse proxy (nginx)
        },
    )


@router.get("/stats")
def llm_stats(
    current_user: User = Depends(require_admin),
):
    """LLM observability metrics: cache hit rate, provider success rate."""
    return llm_metrics.get_stats()
