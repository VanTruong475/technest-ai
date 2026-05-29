"""ChainProvider — thử list providers theo thứ tự, fail → next.

Mỗi provider lỗi (LLMError) → log warning + thử provider kế tiếp. Tất cả
fail → raise LLMError cuối → caller (chat_with_ai) bắt và fallback rule-based.
Đây là cách rẻ nhất để có high-availability khi 1 nhà cung cấp hết quota.
"""
import logging

from app.services.llm.base import BaseLLMProvider, LLMError
from app.services.llm.metrics import llm_metrics

logger = logging.getLogger("techsphere")


class ChainProvider(BaseLLMProvider):
    def __init__(self, providers: list[BaseLLMProvider]):
        self._providers = list(providers)

    def is_available(self) -> bool:
        return any(p.is_available() for p in self._providers)

    def generate(self, system: str, user: str, *, timeout: float = 10.0) -> str:
        last_error: Exception | None = None
        attempted = 0

        for provider in self._providers:
            if not provider.is_available():
                continue
            attempted += 1
            try:
                result = provider.generate(system, user, timeout=timeout)
                llm_metrics.record_provider_success(type(provider).__name__)
                return result
            except LLMError as e:
                logger.warning(
                    "LLM provider %s failed, trying next: %s",
                    type(provider).__name__,
                    e,
                )
                llm_metrics.record_provider_failure(type(provider).__name__)
                last_error = e
                continue

        if attempted == 0:
            raise LLMError("No LLM provider in chain is available")
        raise LLMError(f"All {attempted} LLM provider(s) failed; last error: {last_error}")
