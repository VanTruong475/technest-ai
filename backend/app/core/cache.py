import hashlib
import json
import logging
import threading
from typing import Any, Optional

import redis

from app.core.config import settings

logger = logging.getLogger("techsphere")

_redis_client: Optional[redis.Redis] = None
_lock = threading.Lock()


def get_redis() -> Optional[redis.Redis]:
    global _redis_client
    if _redis_client is not None:
        return _redis_client
    if not settings.REDIS_URL:
        return None
    with _lock:
        if _redis_client is not None:
            return _redis_client
        try:
            _redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
            _redis_client.ping()
            logger.info("Redis connected successfully")
            return _redis_client
        except Exception as e:
            logger.warning(f"Redis connection failed: {e}. Caching disabled.")
            _redis_client = None
            return None


def close_redis() -> None:
    global _redis_client
    if _redis_client is not None:
        _redis_client.close()
        _redis_client = None
        logger.info("Redis connection closed")


def cache_key(prefix: str, **kwargs) -> str:
    raw = json.dumps(kwargs, sort_keys=True, default=str)
    short_hash = hashlib.sha256(raw.encode()).hexdigest()[:16]
    return f"techsphere:{prefix}:{short_hash}"


def get_cached(key: str) -> Optional[Any]:
    r = get_redis()
    if r is None:
        return None
    try:
        data = r.get(key)
        if data:
            return json.loads(data)
    except Exception as e:
        logger.warning(f"Cache get error for {key}: {e}")
    return None


def set_cached(key: str, value: Any, ttl: int = 300) -> None:
    r = get_redis()
    if r is None:
        return
    try:
        r.setex(key, ttl, json.dumps(value, default=str))
    except Exception as e:
        logger.warning(f"Cache set error for {key}: {e}")


def invalidate_prefix(prefix: str) -> int:
    r = get_redis()
    if r is None:
        return 0
    try:
        pattern = f"techsphere:{prefix}:*"
        total = 0
        cursor = 0
        while True:
            cursor, keys = r.scan(cursor=cursor, match=pattern, count=100)
            if keys:
                total += r.delete(*keys)
            if cursor == 0:
                break
        if total:
            logger.info(f"Invalidated {total} cache keys with prefix '{prefix}'")
        return total
    except Exception as e:
        logger.warning(f"Cache invalidate error for prefix '{prefix}': {e}")
    return 0
