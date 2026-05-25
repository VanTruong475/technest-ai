"""Factory build provider chain theo settings.

Output: CachedProvider(ChainProvider([providers...])), hoặc None nếu không
provider nào khả dụng. chat_with_ai chỉ gọi 1 interface duy nhất, không
biết về cache/chain/provider cụ thể.
"""
import logging
from typing import Optional

from app.core.config import settings
from app.services.llm.base import BaseLLMProvider
from app.services.llm.cache import CachedProvider
from app.services.llm.chain import ChainProvider
from app.services.llm.gemini import GeminiProvider
from app.services.llm.groq import GroqProvider

logger = logging.getLogger("techsphere")


def _build_provider(name: str) -> Optional[BaseLLMProvider]:
    name = name.lower().strip()
    if name == "gemini":
        return GeminiProvider(api_key=settings.GEMINI_API_KEY, model=settings.GEMINI_MODEL)
    if name == "groq":
        return GroqProvider(api_key=settings.GROQ_API_KEY, model=settings.GROQ_MODEL)
    logger.warning("Unknown LLM provider %r — skipped", name)
    return None


def _parse_provider_names() -> list[str]:
    """Parse comma-list từ AI_PROVIDERS, fallback singleton AI_PROVIDER.

    Backwards compat: nếu AI_PROVIDERS rỗng (đã có người dùng config v1),
    dùng [AI_PROVIDER] làm chain 1 phần tử.
    """
    raw = (settings.AI_PROVIDERS or "").strip()
    if not raw:
        return [settings.AI_PROVIDER] if settings.AI_PROVIDER else []
    return [p.strip() for p in raw.split(",") if p.strip()]


def get_llm_provider() -> Optional[BaseLLMProvider]:
    """Trả về provider top-level (đã wrap cache) hoặc None để fallback rule-based.

    Build mới mỗi lần gọi để tests có thể monkeypatch settings runtime.
    """
    if not settings.AI_LLM_ENABLED:
        return None

    names = _parse_provider_names()
    if not names:
        return None

    providers: list[BaseLLMProvider] = []
    for name in names:
        provider = _build_provider(name)
        if provider is None:
            continue
        if not provider.is_available():
            # Provider tồn tại nhưng thiếu key/model — bỏ qua, không log để
            # tránh spam khi user chỉ cấu hình 1 trong nhiều providers.
            continue
        providers.append(provider)

    if not providers:
        return None

    chain = ChainProvider(providers) if len(providers) > 1 else providers[0]
    return CachedProvider(chain, ttl_seconds=settings.AI_LLM_CACHE_TTL_SECONDS)
