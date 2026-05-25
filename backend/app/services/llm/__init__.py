"""LLM provider abstraction cho AI chatbot.

Multi-provider design: thêm provider mới bằng cách subclass BaseLLMProvider
và đăng ký trong factory. Chatbot ở ai_service luôn fallback rule-based khi
provider không khả dụng hoặc raise LLMError.
"""
from app.services.llm.base import BaseLLMProvider, LLMError
from app.services.llm.factory import get_llm_provider

__all__ = ["BaseLLMProvider", "LLMError", "get_llm_provider"]
