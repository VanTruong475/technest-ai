"""Tests cho LLM provider abstraction và chat_with_ai LLM augmentation.

KHÔNG gọi Gemini thật — toàn bộ HTTP/provider được mock. Mục tiêu:
1. Provider unit tests: is_available, generate (success / timeout / API error / empty).
2. Chat endpoint fallback: disabled, no key, LLMError → rule-based.
3. Chat endpoint success: provider trả LLM reply, products vẫn từ DB.
"""
from unittest.mock import MagicMock, patch

import httpx
import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.models.brand import Brand
from app.models.category import Category
from app.models.product import Product
from app.services.llm import LLMError, get_llm_provider
from app.services.llm.gemini import GeminiProvider


# ── Fixtures ──────────────────────────────────────────────────────────────


def _seed_laptop(session: Session) -> Product:
    category = Category(name="Laptop", slug="laptop", description="Máy tính xách tay")
    session.add(category)
    session.commit()
    session.refresh(category)

    brand = Brand(name="Dell", slug="dell")
    session.add(brand)
    session.commit()
    session.refresh(brand)

    product = Product(
        name="Dell XPS 15",
        slug="dell-xps-15",
        description="Laptop cao cấp",
        price=15_000_000,
        sale_price=14_000_000,
        stock=10,
        status="ACTIVE",
        category_id=category.id,
        brand_id=brand.id,
    )
    session.add(product)
    session.commit()
    session.refresh(product)
    return product


def _build_mock_httpx_client(*, status_code: int = 200, json_data: dict | None = None,
                              raise_exc: Exception | None = None):
    """Build a MagicMock-based httpx.Client thay thế dùng được trong `with`."""
    if raise_exc is not None:
        client = MagicMock()
        client.__enter__ = MagicMock(return_value=client)
        client.__exit__ = MagicMock(return_value=False)
        client.post = MagicMock(side_effect=raise_exc)
        return MagicMock(return_value=client)

    response = MagicMock()
    response.status_code = status_code
    response.text = "" if json_data is None else "mocked"
    response.json = MagicMock(return_value=json_data or {})

    client = MagicMock()
    client.__enter__ = MagicMock(return_value=client)
    client.__exit__ = MagicMock(return_value=False)
    client.post = MagicMock(return_value=response)

    return MagicMock(return_value=client)


# ── GeminiProvider unit tests ────────────────────────────────────────────


def test_gemini_is_available_returns_false_when_key_missing():
    provider = GeminiProvider(api_key="", model="gemini-2.5-flash-lite")
    assert provider.is_available() is False


def test_gemini_is_available_returns_false_when_model_missing():
    provider = GeminiProvider(api_key="fake", model="")
    assert provider.is_available() is False


def test_gemini_is_available_returns_true_with_full_config():
    provider = GeminiProvider(api_key="fake", model="gemini-2.5-flash-lite")
    assert provider.is_available() is True


def test_gemini_generate_success_returns_text():
    mock_client = _build_mock_httpx_client(
        status_code=200,
        json_data={
            "candidates": [
                {"content": {"parts": [{"text": "Xin chào từ Gemini"}]}}
            ]
        },
    )
    with patch("app.services.llm.gemini.httpx.Client", mock_client):
        provider = GeminiProvider(api_key="fake", model="gemini-2.5-flash-lite")
        result = provider.generate("system", "user", timeout=5.0)

    assert result == "Xin chào từ Gemini"


def test_gemini_generate_timeout_raises_llm_error():
    mock_client = _build_mock_httpx_client(
        raise_exc=httpx.TimeoutException("timed out")
    )
    with patch("app.services.llm.gemini.httpx.Client", mock_client):
        provider = GeminiProvider(api_key="fake", model="gemini-2.5-flash-lite")
        with pytest.raises(LLMError, match="timed out"):
            provider.generate("system", "user", timeout=1.0)


def test_gemini_generate_request_error_raises_llm_error():
    mock_client = _build_mock_httpx_client(
        raise_exc=httpx.ConnectError("connection refused")
    )
    with patch("app.services.llm.gemini.httpx.Client", mock_client):
        provider = GeminiProvider(api_key="fake", model="gemini-2.5-flash-lite")
        with pytest.raises(LLMError, match="request failed"):
            provider.generate("system", "user")


def test_gemini_generate_non_200_raises_llm_error():
    mock_client = _build_mock_httpx_client(status_code=429, json_data={"error": "quota"})
    with patch("app.services.llm.gemini.httpx.Client", mock_client):
        provider = GeminiProvider(api_key="fake", model="gemini-2.5-flash-lite")
        with pytest.raises(LLMError, match="status 429"):
            provider.generate("system", "user")


def test_gemini_generate_empty_candidates_raises_llm_error():
    mock_client = _build_mock_httpx_client(status_code=200, json_data={"candidates": []})
    with patch("app.services.llm.gemini.httpx.Client", mock_client):
        provider = GeminiProvider(api_key="fake", model="gemini-2.5-flash-lite")
        with pytest.raises(LLMError, match="no candidates"):
            provider.generate("system", "user")


def test_gemini_generate_empty_text_raises_llm_error():
    mock_client = _build_mock_httpx_client(
        status_code=200,
        json_data={"candidates": [{"content": {"parts": [{"text": ""}]}}]},
    )
    with patch("app.services.llm.gemini.httpx.Client", mock_client):
        provider = GeminiProvider(api_key="fake", model="gemini-2.5-flash-lite")
        with pytest.raises(LLMError, match="empty text"):
            provider.generate("system", "user")


# ── Factory tests ────────────────────────────────────────────────────────


def test_factory_returns_none_when_llm_disabled():
    with patch("app.core.config.settings.AI_LLM_ENABLED", False):
        assert get_llm_provider() is None


def test_factory_returns_none_when_no_api_key():
    with patch("app.core.config.settings.AI_LLM_ENABLED", True), \
         patch("app.core.config.settings.AI_PROVIDER", "gemini"), \
         patch("app.core.config.settings.GEMINI_API_KEY", ""):
        assert get_llm_provider() is None


def test_factory_returns_none_for_unknown_provider():
    with patch("app.core.config.settings.AI_LLM_ENABLED", True), \
         patch("app.core.config.settings.AI_PROVIDER", "unknown_provider"):
        assert get_llm_provider() is None


def test_factory_returns_gemini_when_enabled_and_keyed():
    """Factory hiện wrap provider với CachedProvider (PR quick wins).
    Single-provider singleton → Cached(Gemini), không có ChainProvider middle."""
    from app.services.llm.cache import CachedProvider

    with patch("app.core.config.settings.AI_LLM_ENABLED", True), \
         patch("app.core.config.settings.AI_PROVIDERS", ""), \
         patch("app.core.config.settings.AI_PROVIDER", "gemini"), \
         patch("app.core.config.settings.GEMINI_API_KEY", "fake_key"), \
         patch("app.core.config.settings.GEMINI_MODEL", "gemini-2.5-flash-lite"), \
         patch("app.core.config.settings.GROQ_API_KEY", ""):
        provider = get_llm_provider()

    assert provider is not None
    assert isinstance(provider, CachedProvider)
    assert isinstance(provider._inner, GeminiProvider)


# ── Chat endpoint integration: fallback paths ───────────────────────────


def test_chat_falls_back_when_llm_disabled(client: TestClient, session: Session):
    """AI_LLM_ENABLED=False → rule-based reply (cùng behavior như trước PR LLM)."""
    _seed_laptop(session)

    with patch("app.core.config.settings.AI_LLM_ENABLED", False):
        response = client.post("/api/ai/chat", json={"message": "tư vấn laptop", "limit": 5})

    assert response.status_code == 200
    data = response.json()
    # Rule-based reply có pattern đặc trưng "Mình tìm thấy ... sản phẩm phù hợp"
    assert "Mình tìm thấy" in data["reply"]
    assert len(data["products"]) > 0


def test_chat_falls_back_when_api_key_missing(client: TestClient, session: Session):
    """LLM bật nhưng GEMINI_API_KEY="" → fallback rule-based, không gọi API."""
    _seed_laptop(session)

    with patch("app.core.config.settings.AI_LLM_ENABLED", True), \
         patch("app.core.config.settings.AI_PROVIDER", "gemini"), \
         patch("app.core.config.settings.GEMINI_API_KEY", ""):
        response = client.post("/api/ai/chat", json={"message": "tư vấn laptop", "limit": 5})

    assert response.status_code == 200
    data = response.json()
    assert "Mình tìm thấy" in data["reply"]


def test_chat_falls_back_when_llm_raises_error(client: TestClient, session: Session):
    """Provider.generate raise LLMError → fallback rule-based, response vẫn 200."""
    _seed_laptop(session)

    mock_provider = MagicMock()
    mock_provider.generate.side_effect = LLMError("simulated quota exceeded")

    # ai_service.chat_with_ai imports `get_llm_provider` from `app.services.llm`
    # ngay trong hàm — patch tại symbol đó để mỗi call trả mock provider.
    with patch("app.services.llm.get_llm_provider", return_value=mock_provider):
        response = client.post("/api/ai/chat", json={"message": "tư vấn laptop", "limit": 5})

    assert response.status_code == 200
    data = response.json()
    # Reply phải từ rule-based vì LLM lỗi
    assert "Mình tìm thấy" in data["reply"]
    assert mock_provider.generate.called


def test_chat_falls_back_when_llm_raises_unexpected_exception(
    client: TestClient, session: Session
):
    """Bất kỳ exception nào (không phải LLMError) cũng phải fallback, không crash."""
    _seed_laptop(session)

    mock_provider = MagicMock()
    mock_provider.generate.side_effect = RuntimeError("totally unexpected")

    with patch("app.services.llm.get_llm_provider", return_value=mock_provider):
        response = client.post("/api/ai/chat", json={"message": "tư vấn laptop", "limit": 5})

    assert response.status_code == 200
    data = response.json()
    assert "Mình tìm thấy" in data["reply"]


# ── Chat endpoint integration: LLM success path ─────────────────────────


def test_chat_uses_llm_reply_when_provider_succeeds(
    client: TestClient, session: Session
):
    """Provider trả text → reply là LLM text, nhưng products vẫn từ DB (không bịa)."""
    laptop = _seed_laptop(session)

    mock_provider = MagicMock()
    mock_provider.generate.return_value = "Chào bạn! Dell XPS 15 đang giảm giá rất tốt."

    with patch("app.services.llm.get_llm_provider", return_value=mock_provider):
        response = client.post("/api/ai/chat", json={"message": "tư vấn laptop", "limit": 5})

    assert response.status_code == 200
    data = response.json()
    assert data["reply"] == "Chào bạn! Dell XPS 15 đang giảm giá rất tốt."
    # Products vẫn từ DB
    assert len(data["products"]) > 0
    assert data["products"][0]["product"]["id"] == laptop.id
    # Provider được gọi đúng 1 lần với product context
    assert mock_provider.generate.call_count == 1
    call_args = mock_provider.generate.call_args
    user_prompt = call_args[0][1]
    # Prompt phải có tên sản phẩm + giá thật từ DB
    assert "Dell XPS 15" in user_prompt
    assert "14,000,000" in user_prompt  # sale_price


# ── Prompt-structure smoke tests (polish PR) ────────────────────────────


def test_system_prompt_has_anti_hallucination_and_style_guards(
    client: TestClient, session: Session
):
    """System prompt phải chứa các ràng buộc chính: anti-hallucination, brand
    only-from-context, anti-cliché, format 3-câu. Smoke test để bảo vệ tránh
    bị "đơn giản hóa" prompt làm mất guard rails về sau."""
    _seed_laptop(session)

    mock_provider = MagicMock()
    mock_provider.generate.return_value = "mocked reply"

    with patch("app.services.llm.get_llm_provider", return_value=mock_provider):
        client.post("/api/ai/chat", json={"message": "tư vấn laptop", "limit": 5})

    assert mock_provider.generate.call_count == 1
    system_prompt = mock_provider.generate.call_args[0][0]

    # Anti-hallucination
    assert "CHỈ nhắc" in system_prompt
    assert "Không bịa" in system_prompt or "không bịa" in system_prompt.lower()

    # Style — phải nêu xưng "mình" và cấm sáo ngữ cụ thể
    assert "mình" in system_prompt  # xưng hô
    assert "đó ạ" in system_prompt  # cấm cụ thể
    assert "siêu phẩm" in system_prompt  # cấm cụ thể

    # No markdown / bullet
    assert "Không markdown" in system_prompt or "không markdown" in system_prompt.lower()

    # Cấu trúc 3-câu (mở/giữa/kết) + follow-up
    assert "follow-up" in system_prompt.lower()


def test_user_prompt_marks_single_brand_to_avoid_brand_followup(
    client: TestClient, session: Session
):
    """1 brand trong context → user_prompt phải hint "KHÔNG hỏi hãng khác"
    để Gemini không hỏi "có muốn xem hãng Apple/Samsung" khi chỉ có Dell."""
    _seed_laptop(session)  # tạo 1 product Dell duy nhất

    mock_provider = MagicMock()
    mock_provider.generate.return_value = "mocked reply"

    with patch("app.services.llm.get_llm_provider", return_value=mock_provider):
        client.post("/api/ai/chat", json={"message": "tư vấn laptop", "limit": 5})

    user_prompt = mock_provider.generate.call_args[0][1]

    assert "Hãng duy nhất" in user_prompt
    assert "Dell" in user_prompt
    assert "KHÔNG hỏi" in user_prompt


def test_user_prompt_lists_brands_when_multiple_in_context(
    client: TestClient, session: Session
):
    """≥2 brands → user_prompt liệt kê các hãng để Gemini có thể hỏi
    "ưu tiên hãng nào". Bảo đảm chỉ hãng trong DB context được nhắc."""
    # Seed 2 brands khác nhau
    category = Category(name="Laptop", slug="laptop", description="Máy tính xách tay")
    session.add(category)
    session.commit()
    session.refresh(category)

    dell = Brand(name="Dell", slug="dell")
    apple = Brand(name="Apple", slug="apple")
    session.add(dell)
    session.add(apple)
    session.commit()
    session.refresh(dell)
    session.refresh(apple)

    dell_product = Product(
        name="Dell XPS 15",
        slug="dell-xps-15",
        description="Laptop cao cấp",
        price=15_000_000,
        stock=10,
        status="ACTIVE",
        category_id=category.id,
        brand_id=dell.id,
    )
    apple_product = Product(
        name="MacBook Air M3",
        slug="macbook-air-m3",
        description="Laptop Apple",
        price=28_000_000,
        stock=5,
        status="ACTIVE",
        category_id=category.id,
        brand_id=apple.id,
    )
    session.add(dell_product)
    session.add(apple_product)
    session.commit()

    mock_provider = MagicMock()
    mock_provider.generate.return_value = "mocked reply"

    with patch("app.services.llm.get_llm_provider", return_value=mock_provider):
        client.post("/api/ai/chat", json={"message": "tư vấn laptop", "limit": 5})

    user_prompt = mock_provider.generate.call_args[0][1]

    assert "Các hãng trong danh sách" in user_prompt
    assert "Dell" in user_prompt
    assert "Apple" in user_prompt
    # Không có cảnh báo "KHÔNG hỏi" — Gemini được phép hỏi hãng
    assert "Hãng duy nhất" not in user_prompt


def test_chat_llm_no_match_passes_empty_context(
    client: TestClient, session: Session
):
    """Không có sản phẩm match → context báo không tìm thấy, provider vẫn được gọi."""
    # Không seed gì cả — DB rỗng
    mock_provider = MagicMock()
    mock_provider.generate.return_value = "Xin lỗi, không tìm thấy sản phẩm phù hợp."

    with patch("app.services.llm.get_llm_provider", return_value=mock_provider):
        response = client.post(
            "/api/ai/chat",
            json={"message": "tư vấn laptop chống ồn dưới 1 triệu", "limit": 5},
        )

    assert response.status_code == 200
    data = response.json()
    # Reply có thể là LLM (nếu rule-based vẫn fallback popular → có products) hoặc rule-based
    # Quan trọng: status 200 và provider được gọi
    assert mock_provider.generate.called
