"""Base abstraction cho LLM providers.

Tất cả provider (Gemini, sau này Groq/OpenRouter) phải implement interface
này để chat_with_ai có thể swap provider qua env mà không sửa code gọi.
"""
from abc import ABC, abstractmethod
from typing import Iterator


class LLMError(Exception):
    """Raised khi LLM provider lỗi: timeout, API error, quota, empty response.

    Caller (chat_with_ai) bắt exception này và fallback về rule-based —
    không bao giờ propagate ra HTTP response để giữ chatbot luôn hoạt động.
    """


class BaseLLMProvider(ABC):
    """Interface tối thiểu để chat_with_ai gọi LLM provider."""

    @abstractmethod
    def is_available(self) -> bool:
        """Provider có đủ config (API key, model) để gọi không.

        KHÔNG được raise. Trả False khi thiếu key, sai config — factory dùng
        để quyết định fallback rule-based ngay từ đầu (không cần thử gọi API).
        """

    @abstractmethod
    def generate(self, system: str, user: str, *, timeout: float = 10.0) -> str:
        """Sinh phản hồi text từ LLM.

        Args:
            system: System prompt định nghĩa persona/constraint.
            user: User prompt (đã chèn product context).
            timeout: Hard timeout giây cho HTTP request.

        Returns:
            Text response từ LLM (đã strip).

        Raises:
            LLMError: Khi bất kỳ lỗi nào xảy ra (network, API, parse).
        """

    def stream_generate(
        self, system: str, user: str, *, timeout: float = 10.0
    ) -> Iterator[str]:
        """Sinh phản hồi dạng stream (yield từng mảnh text).

        Default: gọi generate() rồi yield toàn bộ 1 lần (non-streaming
        fallback). Provider hỗ trợ streaming thật nên override method này.

        Raises:
            LLMError: Khi lỗi (network, API, parse).
        """
        yield self.generate(system, user, timeout=timeout)
