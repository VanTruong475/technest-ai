"""Tests cho streaming chat (SSE): endpoint /api/ai/chat/stream, stream_generate
của các provider, fallback, và SSE line parsers.

KHÔNG gọi LLM thật — provider/HTTP đều mock. Mục tiêu:
1. Endpoint stream: token events + done event (products từ DB), fallback paths.
2. Provider.stream_generate: base default delegate, chain fail-over, cache.
3. SSE parsers: Gemini (alt=sse) và Groq (OpenAI-compatible).
"""
import json
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.models.brand import Brand
from app.models.category import Category
from app.models.product import Product
from app.services.llm import LLMError
from app.services.llm.base import BaseLLMProvider
from app.services.llm.chain import ChainProvider
from app.services.llm.cache import CachedProvider
from app.services.llm.gemini import _parse_gemini_sse_line
from app.services.llm.groq import _parse_groq_sse_line


# ── Fixtures / helpers ────────────────────────────────────────────────────


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


def _parse_sse(text: str) -> list[dict]:
    """Tách body SSE thành list các event dict đã JSON-decode."""
    events: list[dict] = []
    for block in text.split("\n\n"):
        block = block.strip()
        if not block.startswith("data:"):
            continue
        payload = block[len("data:"):].strip()
        if payload:
            events.append(json.loads(payload))
    return events


# ── Endpoint: /api/ai/chat/stream ─────────────────────────────────────────


def test_chat_stream_yields_tokens_then_done(client: TestClient, session: Session):
    """Provider stream token → SSE có token events + 1 done event với products DB."""
    laptop = _seed_laptop(session)

    mock_provider = MagicMock()
    mock_provider.stream_generate.return_value = ["Chào ", "bạn, ", "Dell XPS 15 rất tốt."]

    with patch("app.services.llm.get_llm_provider", return_value=mock_provider):
        response = client.post(
            "/api/ai/chat/stream", json={"message": "tư vấn laptop", "limit": 5}
        )

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/event-stream")

    events = _parse_sse(response.text)
    tokens = [e for e in events if e["type"] == "token"]
    done = [e for e in events if e["type"] == "done"]

    # Ghép token phải bằng text provider phát ra
    assert "".join(t["text"] for t in tokens) == "Chào bạn, Dell XPS 15 rất tốt."
    # Đúng 1 done event ở cuối, products lấy từ DB (không do LLM bịa)
    assert len(done) == 1
    assert events[-1]["type"] == "done"
    assert done[0]["products"][0]["product"]["id"] == laptop.id
    assert done[0]["total"] >= 1


def test_chat_stream_falls_back_when_no_provider(client: TestClient, session: Session):
    """Không có provider → phát rule-based reply 1 token rồi done, vẫn có products."""
    _seed_laptop(session)

    with patch("app.services.llm.get_llm_provider", return_value=None):
        response = client.post(
            "/api/ai/chat/stream", json={"message": "tư vấn laptop", "limit": 5}
        )

    assert response.status_code == 200
    events = _parse_sse(response.text)
    tokens = [e for e in events if e["type"] == "token"]
    done = [e for e in events if e["type"] == "done"]

    assert len(tokens) == 1
    assert "Mình tìm thấy" in tokens[0]["text"]
    assert len(done) == 1
    assert len(done[0]["products"]) > 0


def test_chat_stream_falls_back_on_llm_error(client: TestClient, session: Session):
    """stream_generate raise LLMError → fallback rule-based reply, vẫn 200 + done."""
    _seed_laptop(session)

    mock_provider = MagicMock()
    mock_provider.stream_generate.side_effect = LLMError("quota exceeded")

    with patch("app.services.llm.get_llm_provider", return_value=mock_provider):
        response = client.post(
            "/api/ai/chat/stream", json={"message": "tư vấn laptop", "limit": 5}
        )

    assert response.status_code == 200
    events = _parse_sse(response.text)
    tokens = [e for e in events if e["type"] == "token"]
    assert any("Mình tìm thấy" in t["text"] for t in tokens)
    assert events[-1]["type"] == "done"


def test_chat_stream_falls_back_on_unexpected_exception(
    client: TestClient, session: Session
):
    """Exception lạ (không phải LLMError) cũng fallback, không crash stream."""
    _seed_laptop(session)

    mock_provider = MagicMock()
    mock_provider.stream_generate.side_effect = RuntimeError("totally unexpected")

    with patch("app.services.llm.get_llm_provider", return_value=mock_provider):
        response = client.post(
            "/api/ai/chat/stream", json={"message": "tư vấn laptop", "limit": 5}
        )

    assert response.status_code == 200
    events = _parse_sse(response.text)
    assert any(e["type"] == "token" for e in events)
    assert events[-1]["type"] == "done"


def test_chat_stream_empty_provider_output_uses_rule_based(
    client: TestClient, session: Session
):
    """Provider không phát token nào → fallback rule-based reply (không bỏ trống)."""
    _seed_laptop(session)

    mock_provider = MagicMock()
    mock_provider.stream_generate.return_value = []  # không yield gì

    with patch("app.services.llm.get_llm_provider", return_value=mock_provider):
        response = client.post(
            "/api/ai/chat/stream", json={"message": "tư vấn laptop", "limit": 5}
        )

    events = _parse_sse(response.text)
    tokens = [e for e in events if e["type"] == "token"]
    assert len(tokens) == 1
    assert "Mình tìm thấy" in tokens[0]["text"]


# ── BaseLLMProvider.stream_generate default ───────────────────────────────


def test_base_stream_generate_default_delegates_to_generate():
    """Provider không override stream_generate → yield nguyên kết quả generate()."""

    class _Dummy(BaseLLMProvider):
        def is_available(self) -> bool:
            return True

        def generate(self, system, user, *, timeout=10.0):
            return "full reply"

    chunks = list(_Dummy().stream_generate("s", "u"))
    assert chunks == ["full reply"]


# ── ChainProvider.stream_generate fail-over ───────────────────────────────


def test_chain_stream_uses_first_available_provider():
    a = MagicMock()
    a.is_available.return_value = True
    a.stream_generate.return_value = ["A1", "A2"]
    b = MagicMock()
    b.is_available.return_value = True

    chunks = list(ChainProvider([a, b]).stream_generate("s", "u"))

    assert chunks == ["A1", "A2"]
    assert not b.stream_generate.called


def test_chain_stream_fails_over_before_first_token():
    """Provider đầu lỗi TRƯỚC khi phát token → thử provider kế (không lặp text)."""
    a = MagicMock()
    a.is_available.return_value = True
    a.stream_generate.side_effect = LLMError("down before token")
    b = MagicMock()
    b.is_available.return_value = True
    b.stream_generate.return_value = ["B1", "B2"]

    chunks = list(ChainProvider([a, b]).stream_generate("s", "u"))

    assert chunks == ["B1", "B2"]


def test_chain_stream_raises_when_failure_after_first_token():
    """Lỗi SAU khi đã phát token → raise (không fallback provider khác để tránh
    lặp text). Token đã phát vẫn tới được caller."""

    def _explode_midway(system, user, *, timeout=10.0):
        yield "partial"
        raise LLMError("died mid-stream")

    a = MagicMock()
    a.is_available.return_value = True
    a.stream_generate.side_effect = _explode_midway
    b = MagicMock()
    b.is_available.return_value = True
    b.stream_generate.return_value = ["B1"]

    produced = []
    try:
        for chunk in ChainProvider([a, b]).stream_generate("s", "u"):
            produced.append(chunk)
        raised = False
    except LLMError:
        raised = True

    assert produced == ["partial"]
    assert raised is True
    assert not b.stream_generate.called  # KHÔNG fallback sau khi đã phát token


def test_chain_stream_no_available_provider_raises():
    a = MagicMock()
    a.is_available.return_value = False

    try:
        list(ChainProvider([a]).stream_generate("s", "u"))
        raised = False
    except LLMError:
        raised = True
    assert raised is True


# ── CachedProvider.stream_generate ────────────────────────────────────────


@patch("app.services.llm.cache.set_cached")
@patch("app.services.llm.cache.get_cached")
def test_cached_stream_miss_then_stores_joined(mock_get, mock_set):
    """Cache miss → stream từ inner và lưu lại bản ghép full-text."""
    mock_get.return_value = None
    inner = MagicMock()
    inner.stream_generate.return_value = ["Hello ", "world"]

    chunks = list(CachedProvider(inner, ttl_seconds=3600).stream_generate("s", "u"))

    assert chunks == ["Hello ", "world"]
    # Lưu bản ghép (strip) để lần non-stream sau hit cache
    assert mock_set.call_count == 1
    assert mock_set.call_args[0][1] == "Hello world"


@patch("app.services.llm.cache.set_cached")
@patch("app.services.llm.cache.get_cached")
def test_cached_stream_hit_yields_cached_single_chunk(mock_get, mock_set):
    """Cache hit → yield nguyên text cached 1 lần, không gọi inner."""
    mock_get.return_value = "cached reply"
    inner = MagicMock()

    chunks = list(CachedProvider(inner, ttl_seconds=3600).stream_generate("s", "u"))

    assert chunks == ["cached reply"]
    assert not inner.stream_generate.called
    assert not mock_set.called


@patch("app.services.llm.cache.set_cached")
@patch("app.services.llm.cache.get_cached")
def test_cached_stream_ttl_zero_bypasses_cache(mock_get, mock_set):
    inner = MagicMock()
    inner.stream_generate.return_value = ["x", "y"]

    chunks = list(CachedProvider(inner, ttl_seconds=0).stream_generate("s", "u"))

    assert chunks == ["x", "y"]
    assert not mock_get.called
    assert not mock_set.called


# ── SSE line parsers ──────────────────────────────────────────────────────


def test_parse_gemini_sse_line_extracts_text():
    line = 'data: {"candidates":[{"content":{"parts":[{"text":"xin chào"}]}}]}'
    assert _parse_gemini_sse_line(line) == "xin chào"


def test_parse_gemini_sse_line_ignores_non_data_and_done():
    assert _parse_gemini_sse_line("") == ""
    assert _parse_gemini_sse_line(": keep-alive") == ""
    assert _parse_gemini_sse_line("data: [DONE]") == ""
    assert _parse_gemini_sse_line("data: not-json") == ""
    assert _parse_gemini_sse_line('data: {"candidates":[]}') == ""


def test_parse_groq_sse_line_extracts_delta():
    line = 'data: {"choices":[{"delta":{"content":"hello"}}]}'
    assert _parse_groq_sse_line(line) == "hello"


def test_parse_groq_sse_line_ignores_non_data_and_done():
    assert _parse_groq_sse_line("") == ""
    assert _parse_groq_sse_line("data: [DONE]") == ""
    assert _parse_groq_sse_line("data: not-json") == ""
    assert _parse_groq_sse_line('data: {"choices":[]}') == ""
    # delta không có content (vd: role-only chunk đầu) → rỗng
    assert _parse_groq_sse_line('data: {"choices":[{"delta":{"role":"assistant"}}]}') == ""
