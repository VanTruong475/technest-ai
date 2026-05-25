"""Groq provider — OpenAI-compatible REST API.

Free tier rộng + latency rất thấp (LPU). Dùng làm fallback khi Gemini hết
quota hoặc lỗi. Cùng pattern error handling như GeminiProvider.
"""
import logging

import httpx

from app.services.llm.base import BaseLLMProvider, LLMError

logger = logging.getLogger("techsphere")

_GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"


class GroqProvider(BaseLLMProvider):
    def __init__(self, api_key: str, model: str):
        self._api_key = api_key
        self._model = model

    def is_available(self) -> bool:
        return bool(self._api_key) and bool(self._model)

    def generate(self, system: str, user: str, *, timeout: float = 10.0) -> str:
        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
        }
        body = {
            "model": self._model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "temperature": 0.4,
            "max_tokens": 512,
        }

        try:
            with httpx.Client(timeout=timeout) as client:
                response = client.post(_GROQ_API_URL, headers=headers, json=body)
        except httpx.TimeoutException as e:
            raise LLMError(f"Groq request timed out after {timeout}s") from e
        except httpx.RequestError as e:
            raise LLMError(f"Groq request failed: {e}") from e

        if response.status_code != 200:
            logger.warning(
                "Groq API returned non-200 status=%s body_preview=%s",
                response.status_code,
                response.text[:200] if response.text else "",
            )
            raise LLMError(f"Groq API returned status {response.status_code}")

        try:
            data = response.json()
        except ValueError as e:
            raise LLMError(f"Groq response not JSON: {e}") from e

        choices = data.get("choices") or []
        if not choices:
            raise LLMError("Groq returned no choices")

        text = (choices[0].get("message", {}).get("content") or "").strip()
        if not text:
            raise LLMError("Groq returned empty text")

        return text
