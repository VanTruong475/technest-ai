"""Gemini provider — gọi Google Generative Language REST API trực tiếp.

Không phụ thuộc google-generativeai SDK để giữ deps tối thiểu. httpx đã có
sẵn (test deps + FastAPI transitive).
"""
import logging

import httpx

from app.services.llm.base import BaseLLMProvider, LLMError

logger = logging.getLogger("techsphere")

_GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models"


class GeminiProvider(BaseLLMProvider):
    def __init__(self, api_key: str, model: str):
        self._api_key = api_key
        self._model = model

    def is_available(self) -> bool:
        return bool(self._api_key) and bool(self._model)

    def generate(self, system: str, user: str, *, timeout: float = 10.0) -> str:
        url = f"{_GEMINI_API_BASE}/{self._model}:generateContent"
        body = {
            "systemInstruction": {"parts": [{"text": system}]},
            "contents": [{"role": "user", "parts": [{"text": user}]}],
            "generationConfig": {
                "temperature": 0.4,
                "maxOutputTokens": 512,
            },
        }

        try:
            with httpx.Client(timeout=timeout) as client:
                response = client.post(
                    url,
                    params={"key": self._api_key},
                    json=body,
                )
        except httpx.TimeoutException as e:
            raise LLMError(f"Gemini request timed out after {timeout}s") from e
        except httpx.RequestError as e:
            raise LLMError(f"Gemini request failed: {e}") from e

        if response.status_code != 200:
            # Không log nguyên body để tránh leak API key qua error messages.
            logger.warning(
                "Gemini API returned non-200 status=%s body_preview=%s",
                response.status_code,
                response.text[:200] if response.text else "",
            )
            raise LLMError(f"Gemini API returned status {response.status_code}")

        try:
            data = response.json()
        except ValueError as e:
            raise LLMError(f"Gemini response not JSON: {e}") from e

        candidates = data.get("candidates") or []
        if not candidates:
            # Có thể bị block bởi safety filter — prompt_feedback chứa lý do.
            feedback = data.get("promptFeedback", {})
            raise LLMError(f"Gemini returned no candidates (feedback={feedback})")

        parts = candidates[0].get("content", {}).get("parts", []) or []
        text = "".join(p.get("text", "") for p in parts).strip()
        if not text:
            raise LLMError("Gemini returned empty text")

        return text
