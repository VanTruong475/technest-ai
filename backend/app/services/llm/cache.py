"""CachedProvider — wrap inner provider với Redis cache key=hash(system+user).

Lý do cache ở provider layer (không ở chat_with_ai): trong suốt với chain,
áp dụng đồng nhất cho mọi provider, dễ disable bằng TTL=0.

Cache miss + provider lỗi → exception bubble lên (không cache lỗi).
Redis down → cache layer skip im lặng (graceful, theo pattern app/core/cache.py).
"""
import hashlib
import logging

from app.core.cache import get_cached, set_cached
from app.services.llm.base import BaseLLMProvider
from app.services.llm.metrics import llm_metrics

logger = logging.getLogger("techsphere")

_CACHE_KEY_PREFIX = "techsphere:llm:resp"


class CachedProvider(BaseLLMProvider):
    def __init__(self, inner: BaseLLMProvider, ttl_seconds: int):
        self._inner = inner
        self._ttl = ttl_seconds

    def is_available(self) -> bool:
        return self._inner.is_available()

    def generate(self, system: str, user: str, *, timeout: float = 10.0) -> str:
        # TTL=0 disables cache layer entirely (no Redis call).
        if self._ttl <= 0:
            return self._inner.generate(system, user, timeout=timeout)

        key = _build_cache_key(system, user)

        cached = get_cached(key)
        if isinstance(cached, str) and cached:
            logger.info("LLM cache HIT key=%s", key[-12:])
            llm_metrics.record_cache_hit()
            return cached

        result = self._inner.generate(system, user, timeout=timeout)
        # Chỉ cache khi provider trả text non-empty (đảm bảo bởi base contract).
        set_cached(key, result, ttl=self._ttl)
        logger.info("LLM cache MISS key=%s (cached for %ds)", key[-12:], self._ttl)
        llm_metrics.record_cache_miss()
        return result


def _build_cache_key(system: str, user: str) -> str:
    """Hash (system + user) → ổn định, deterministic, không leak prompt."""
    raw = f"{system}\x00{user}".encode("utf-8")
    digest = hashlib.sha256(raw).hexdigest()[:24]
    return f"{_CACHE_KEY_PREFIX}:{digest}"
