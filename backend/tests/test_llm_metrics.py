"""Tests for LLM metrics (cache hit rate, provider success rate)."""
from app.services.llm.metrics import _LLMMetrics


def test_initial_state():
    m = _LLMMetrics()
    stats = m.get_stats()
    assert stats["cache"]["hits"] == 0
    assert stats["cache"]["misses"] == 0
    assert stats["cache"]["total"] == 0
    assert stats["cache"]["hit_rate"] is None
    assert stats["providers"] == {}
    assert stats["chain_failures"] == 0
    assert stats["no_provider_count"] == 0


def test_cache_hit_rate():
    m = _LLMMetrics()
    m.record_cache_hit()
    m.record_cache_hit()
    m.record_cache_miss()
    stats = m.get_stats()
    assert stats["cache"]["hits"] == 2
    assert stats["cache"]["misses"] == 1
    assert stats["cache"]["total"] == 3
    assert stats["cache"]["hit_rate"] == 0.6667


def test_provider_success_rate():
    m = _LLMMetrics()
    m.record_provider_success("GeminiProvider")
    m.record_provider_success("GeminiProvider")
    m.record_provider_failure("GeminiProvider")
    m.record_provider_success("GroqProvider")
    stats = m.get_stats()
    gemini = stats["providers"]["GeminiProvider"]
    assert gemini["success"] == 2
    assert gemini["failure"] == 1
    assert gemini["total"] == 3
    assert gemini["success_rate"] == 0.6667
    groq = stats["providers"]["GroqProvider"]
    assert groq["success"] == 1
    assert groq["failure"] == 0
    assert groq["success_rate"] == 1.0


def test_chain_and_no_provider():
    m = _LLMMetrics()
    m.record_chain_failure()
    m.record_chain_failure()
    m.record_no_provider()
    stats = m.get_stats()
    assert stats["chain_failures"] == 2
    assert stats["no_provider_count"] == 1


def test_reset():
    m = _LLMMetrics()
    m.record_cache_hit()
    m.record_provider_success("GeminiProvider")
    m.record_chain_failure()
    m.reset()
    stats = m.get_stats()
    assert stats["cache"]["hits"] == 0
    assert stats["providers"] == {}
    assert stats["chain_failures"] == 0
