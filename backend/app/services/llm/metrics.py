"""LLM metrics — thread-safe counters for cache hit rate & provider success rate.

Dùng threading.Lock + dict (không cần Prometheus/StatsD cho project này).
Counters là in-memory, reset khi restart server.
"""
import threading
from typing import Any


class _LLMMetrics:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._cache_hits: int = 0
        self._cache_misses: int = 0
        self._provider_success: dict[str, int] = {}
        self._provider_failure: dict[str, int] = {}
        self._chain_failures: int = 0
        self._no_provider_count: int = 0

    def record_cache_hit(self) -> None:
        with self._lock:
            self._cache_hits += 1

    def record_cache_miss(self) -> None:
        with self._lock:
            self._cache_misses += 1

    def record_provider_success(self, provider_name: str) -> None:
        with self._lock:
            self._provider_success[provider_name] = (
                self._provider_success.get(provider_name, 0) + 1
            )

    def record_provider_failure(self, provider_name: str) -> None:
        with self._lock:
            self._provider_failure[provider_name] = (
                self._provider_failure.get(provider_name, 0) + 1
            )

    def record_chain_failure(self) -> None:
        with self._lock:
            self._chain_failures += 1

    def record_no_provider(self) -> None:
        with self._lock:
            self._no_provider_count += 1

    def get_stats(self) -> dict[str, Any]:
        with self._lock:
            cache_total = self._cache_hits + self._cache_misses
            cache_hit_rate = (
                round(self._cache_hits / cache_total, 4) if cache_total > 0 else None
            )

            providers: dict[str, dict[str, Any]] = {}
            all_names = set(self._provider_success) | set(self._provider_failure)
            for name in sorted(all_names):
                success = self._provider_success.get(name, 0)
                failure = self._provider_failure.get(name, 0)
                total = success + failure
                providers[name] = {
                    "success": success,
                    "failure": failure,
                    "total": total,
                    "success_rate": round(success / total, 4) if total > 0 else None,
                }

            return {
                "cache": {
                    "hits": self._cache_hits,
                    "misses": self._cache_misses,
                    "total": cache_total,
                    "hit_rate": cache_hit_rate,
                },
                "providers": providers,
                "chain_failures": self._chain_failures,
                "no_provider_count": self._no_provider_count,
            }

    def reset(self) -> None:
        with self._lock:
            self._cache_hits = 0
            self._cache_misses = 0
            self._provider_success.clear()
            self._provider_failure.clear()
            self._chain_failures = 0
            self._no_provider_count = 0


llm_metrics = _LLMMetrics()
