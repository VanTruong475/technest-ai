"""Factory chọn LLM provider dựa trên settings.

Trả None khi LLM bị disabled hoặc provider chưa khả dụng (thiếu key v.v.).
Caller (chat_with_ai) thấy None → fallback rule-based ngay, không thử gọi API.
"""
import logging
from typing import Optional

from app.core.config import settings
from app.services.llm.base import BaseLLMProvider
from app.services.llm.gemini import GeminiProvider

logger = logging.getLogger("techsphere")


def get_llm_provider() -> Optional[BaseLLMProvider]:
    """Trả về provider khả dụng theo settings, hoặc None để fallback rule-based.

    Build mới mỗi lần gọi (cheap — chỉ giữ api_key/model). Cho phép test
    monkeypatch settings và lấy provider mới mà không cache stale.
    """
    if not settings.AI_LLM_ENABLED:
        return None

    provider_name = (settings.AI_PROVIDER or "").lower()

    if provider_name == "gemini":
        provider = GeminiProvider(
            api_key=settings.GEMINI_API_KEY,
            model=settings.GEMINI_MODEL,
        )
    else:
        logger.warning("Unknown AI_PROVIDER=%r — falling back to rule-based", provider_name)
        return None

    if not provider.is_available():
        return None

    return provider
