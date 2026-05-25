"""Tests cho ChainProvider, CachedProvider, GroqProvider và factory chain logic.

KHÔNG gọi API thật — mock httpx + Redis. Mục tiêu cover quick wins PR:
1. GroqProvider: parse OpenAI-compat response, errors.
2. ChainProvider: fail-through tới next provider, all-fail → LLMError.
3. CachedProvider: hit / miss / TTL=0 disable / Redis-down graceful skip.
4. Factory: parse AI_PROVIDERS comma-list, backwards compat AI_PROVIDER,
   skip unknown / unavailable, wrap với cache.
"""
from unittest.mock import MagicMock, patch

import httpx
import pytest

from app.services.llm import LLMError, get_llm_provider
from app.services.llm.cache import CachedProvider, _build_cache_key
from app.services.llm.chain import ChainProvider
from app.services.llm.gemini import GeminiProvider
from app.services.llm.groq import GroqProvider


def _build_mock_httpx_client(*, status_code=200, json_data=None, raise_exc=None):
    """Reusable mock httpx.Client context manager."""
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


# ── GroqProvider unit tests ──────────────────────────────────────────────


def test_groq_is_available_false_when_key_missing():
    assert GroqProvider(api_key="", model="llama-3.1-8b-instant").is_available() is False


def test_groq_is_available_false_when_model_missing():
    assert GroqProvider(api_key="fake", model="").is_available() is False


def test_groq_is_available_true_with_full_config():
    assert GroqProvider(api_key="fake", model="llama-3.1-8b-instant").is_available() is True


def test_groq_generate_success_returns_text():
    mock_client = _build_mock_httpx_client(
        status_code=200,
        json_data={
            "choices": [
                {"message": {"role": "assistant", "content": "Xin chào từ Groq"}}
            ]
        },
    )
    with patch("app.services.llm.groq.httpx.Client", mock_client):
        provider = GroqProvider(api_key="fake", model="llama-3.1-8b-instant")
        result = provider.generate("system", "user", timeout=5.0)

    assert result == "Xin chào từ Groq"


def test_groq_generate_timeout_raises_llm_error():
    mock_client = _build_mock_httpx_client(
        raise_exc=httpx.TimeoutException("timed out")
    )
    with patch("app.services.llm.groq.httpx.Client", mock_client):
        with pytest.raises(LLMError, match="timed out"):
            GroqProvider("fake", "model").generate("s", "u")


def test_groq_generate_non_200_raises_llm_error():
    mock_client = _build_mock_httpx_client(status_code=429, json_data={"error": "rate"})
    with patch("app.services.llm.groq.httpx.Client", mock_client):
        with pytest.raises(LLMError, match="status 429"):
            GroqProvider("fake", "model").generate("s", "u")


def test_groq_generate_empty_choices_raises_llm_error():
    mock_client = _build_mock_httpx_client(status_code=200, json_data={"choices": []})
    with patch("app.services.llm.groq.httpx.Client", mock_client):
        with pytest.raises(LLMError, match="no choices"):
            GroqProvider("fake", "model").generate("s", "u")


def test_groq_generate_empty_content_raises_llm_error():
    mock_client = _build_mock_httpx_client(
        status_code=200,
        json_data={"choices": [{"message": {"content": ""}}]},
    )
    with patch("app.services.llm.groq.httpx.Client", mock_client):
        with pytest.raises(LLMError, match="empty text"):
            GroqProvider("fake", "model").generate("s", "u")


# ── ChainProvider tests ──────────────────────────────────────────────────


def test_chain_is_available_true_if_any_inner_available():
    a = MagicMock(spec=GeminiProvider)
    a.is_available.return_value = False
    b = MagicMock(spec=GroqProvider)
    b.is_available.return_value = True
    assert ChainProvider([a, b]).is_available() is True


def test_chain_is_available_false_when_all_inner_unavailable():
    a = MagicMock()
    a.is_available.return_value = False
    b = MagicMock()
    b.is_available.return_value = False
    assert ChainProvider([a, b]).is_available() is False


def test_chain_returns_first_successful_provider_result():
    a = MagicMock()
    a.is_available.return_value = True
    a.generate.return_value = "from A"
    b = MagicMock()
    b.is_available.return_value = True
    b.generate.return_value = "from B"

    result = ChainProvider([a, b]).generate("s", "u")

    assert result == "from A"
    assert a.generate.called
    assert not b.generate.called


def test_chain_falls_through_on_llm_error():
    """Provider đầu raise LLMError → thử provider tiếp theo."""
    a = MagicMock()
    a.is_available.return_value = True
    a.generate.side_effect = LLMError("quota exceeded")
    b = MagicMock()
    b.is_available.return_value = True
    b.generate.return_value = "from B"

    result = ChainProvider([a, b]).generate("s", "u")

    assert result == "from B"
    assert a.generate.called
    assert b.generate.called


def test_chain_skips_unavailable_providers():
    """Provider không khả dụng (thiếu key) → bị skip, không gọi generate."""
    a = MagicMock()
    a.is_available.return_value = False
    b = MagicMock()
    b.is_available.return_value = True
    b.generate.return_value = "from B"

    result = ChainProvider([a, b]).generate("s", "u")

    assert result == "from B"
    assert not a.generate.called


def test_chain_all_fail_raises_last_error():
    a = MagicMock()
    a.is_available.return_value = True
    a.generate.side_effect = LLMError("A failed")
    b = MagicMock()
    b.is_available.return_value = True
    b.generate.side_effect = LLMError("B failed")

    with pytest.raises(LLMError, match="All 2 LLM provider"):
        ChainProvider([a, b]).generate("s", "u")


def test_chain_no_available_provider_raises_specific_error():
    a = MagicMock()
    a.is_available.return_value = False
    b = MagicMock()
    b.is_available.return_value = False

    with pytest.raises(LLMError, match="No LLM provider in chain is available"):
        ChainProvider([a, b]).generate("s", "u")


# ── CachedProvider tests ─────────────────────────────────────────────────


def test_cache_key_deterministic():
    k1 = _build_cache_key("system A", "user B")
    k2 = _build_cache_key("system A", "user B")
    assert k1 == k2
    assert k1.startswith("techsphere:llm:resp:")


def test_cache_key_changes_with_input():
    k1 = _build_cache_key("system", "user A")
    k2 = _build_cache_key("system", "user B")
    assert k1 != k2


def test_cached_provider_ttl_zero_bypasses_cache():
    """TTL=0 → không gọi Redis, gọi thẳng inner."""
    inner = MagicMock()
    inner.generate.return_value = "fresh"

    with patch("app.services.llm.cache.get_cached") as mock_get, \
         patch("app.services.llm.cache.set_cached") as mock_set:
        result = CachedProvider(inner, ttl_seconds=0).generate("s", "u")

    assert result == "fresh"
    assert inner.generate.call_count == 1
    assert not mock_get.called
    assert not mock_set.called


@patch("app.services.llm.cache.set_cached")
@patch("app.services.llm.cache.get_cached")
def test_cached_provider_miss_then_hit(mock_get, mock_set):
    """Miss lần 1 → gọi inner + set cache; hit lần 2 → trả cache, không gọi inner."""
    inner = MagicMock()
    inner.generate.return_value = "from inner"

    # Lần 1: cache miss
    mock_get.return_value = None
    cached = CachedProvider(inner, ttl_seconds=3600)
    result1 = cached.generate("s", "u")
    assert result1 == "from inner"
    assert inner.generate.call_count == 1
    assert mock_set.call_count == 1

    # Lần 2: cache hit
    mock_get.return_value = "from inner"
    result2 = cached.generate("s", "u")
    assert result2 == "from inner"
    # Inner KHÔNG được gọi thêm lần nào
    assert inner.generate.call_count == 1


@patch("app.services.llm.cache.set_cached")
@patch("app.services.llm.cache.get_cached")
def test_cached_provider_redis_down_falls_through_to_inner(mock_get, mock_set):
    """get_cached trả None (Redis down) → gọi inner, set cũng skip im lặng."""
    mock_get.return_value = None  # graceful behavior của get_cached khi Redis down
    inner = MagicMock()
    inner.generate.return_value = "from inner"

    result = CachedProvider(inner, ttl_seconds=3600).generate("s", "u")

    assert result == "from inner"
    assert inner.generate.called


@patch("app.services.llm.cache.set_cached")
@patch("app.services.llm.cache.get_cached")
def test_cached_provider_does_not_cache_inner_error(mock_get, mock_set):
    """Inner raise LLMError → bubble up, KHÔNG cache lỗi."""
    mock_get.return_value = None
    inner = MagicMock()
    inner.generate.side_effect = LLMError("inner failed")

    with pytest.raises(LLMError, match="inner failed"):
        CachedProvider(inner, ttl_seconds=3600).generate("s", "u")

    assert not mock_set.called


def test_cached_provider_is_available_delegates_to_inner():
    inner = MagicMock()
    inner.is_available.return_value = True
    assert CachedProvider(inner, ttl_seconds=3600).is_available() is True

    inner.is_available.return_value = False
    assert CachedProvider(inner, ttl_seconds=3600).is_available() is False


# ── Factory chain logic ──────────────────────────────────────────────────


def test_factory_disabled_returns_none():
    with patch("app.core.config.settings.AI_LLM_ENABLED", False):
        assert get_llm_provider() is None


def test_factory_no_available_providers_returns_none():
    with patch("app.core.config.settings.AI_LLM_ENABLED", True), \
         patch("app.core.config.settings.AI_PROVIDERS", "gemini,groq"), \
         patch("app.core.config.settings.GEMINI_API_KEY", ""), \
         patch("app.core.config.settings.GROQ_API_KEY", ""):
        assert get_llm_provider() is None


def test_factory_wraps_single_provider_with_cache_no_chain():
    """Chỉ 1 provider khả dụng → trực tiếp Cached(Provider), bỏ qua ChainProvider."""
    with patch("app.core.config.settings.AI_LLM_ENABLED", True), \
         patch("app.core.config.settings.AI_PROVIDERS", "gemini,groq"), \
         patch("app.core.config.settings.GEMINI_API_KEY", "fake"), \
         patch("app.core.config.settings.GEMINI_MODEL", "gemini-2.5-flash-lite"), \
         patch("app.core.config.settings.GROQ_API_KEY", ""):
        provider = get_llm_provider()

    assert isinstance(provider, CachedProvider)
    # Inner phải là GeminiProvider trực tiếp (single → bỏ chain wrapper)
    assert isinstance(provider._inner, GeminiProvider)


def test_factory_builds_chain_when_multiple_providers_available():
    with patch("app.core.config.settings.AI_LLM_ENABLED", True), \
         patch("app.core.config.settings.AI_PROVIDERS", "gemini,groq"), \
         patch("app.core.config.settings.GEMINI_API_KEY", "fake"), \
         patch("app.core.config.settings.GROQ_API_KEY", "fake"):
        provider = get_llm_provider()

    assert isinstance(provider, CachedProvider)
    assert isinstance(provider._inner, ChainProvider)
    # Thứ tự = thứ tự trong AI_PROVIDERS
    inner_providers = provider._inner._providers
    assert isinstance(inner_providers[0], GeminiProvider)
    assert isinstance(inner_providers[1], GroqProvider)


def test_factory_backwards_compat_uses_ai_provider_when_providers_empty():
    """AI_PROVIDERS rỗng → fallback singleton AI_PROVIDER (config v1)."""
    with patch("app.core.config.settings.AI_LLM_ENABLED", True), \
         patch("app.core.config.settings.AI_PROVIDERS", ""), \
         patch("app.core.config.settings.AI_PROVIDER", "gemini"), \
         patch("app.core.config.settings.GEMINI_API_KEY", "fake"):
        provider = get_llm_provider()

    assert isinstance(provider, CachedProvider)
    assert isinstance(provider._inner, GeminiProvider)


def test_factory_ignores_unknown_providers_in_list():
    """AI_PROVIDERS='xyz,gemini' → bỏ xyz, dùng Gemini."""
    with patch("app.core.config.settings.AI_LLM_ENABLED", True), \
         patch("app.core.config.settings.AI_PROVIDERS", "xyz,gemini,unknown"), \
         patch("app.core.config.settings.GEMINI_API_KEY", "fake"):
        provider = get_llm_provider()

    assert isinstance(provider, CachedProvider)
    assert isinstance(provider._inner, GeminiProvider)


def test_factory_cache_ttl_zero_passed_through():
    """AI_LLM_CACHE_TTL_SECONDS=0 → CachedProvider có _ttl=0 (cache disabled)."""
    with patch("app.core.config.settings.AI_LLM_ENABLED", True), \
         patch("app.core.config.settings.AI_PROVIDERS", "gemini"), \
         patch("app.core.config.settings.GEMINI_API_KEY", "fake"), \
         patch("app.core.config.settings.AI_LLM_CACHE_TTL_SECONDS", 0):
        provider = get_llm_provider()

    assert isinstance(provider, CachedProvider)
    assert provider._ttl == 0
