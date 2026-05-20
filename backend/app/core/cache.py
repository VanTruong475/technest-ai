import json
import hashlib
import logging
from functools import wraps
from typing import Any, Optional

import redis

from app.core.config import settings

logger = logging.getLogger("techsphere")

_redis_client: Optional[redis.Redis] = None


def get_redis() -> Optional[redis.Redis]:
    global _redis_client
    if _redis_client is not None:
        return _redis_client
    if not settings.REDIS_URL:
        return None
    try:
        _redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
        _redis_client.ping()
        logger.info("Redis connected successfully")
        return _redis_client
    except Exception as e:
        logger.warning(f"Redis connection failed: {e}. Caching disabled.")
        _redis_client = None
        return None


def cache_key(prefix: str, **kwargs) -> str:
    raw = json.dumps(kwargs, sort_keys=True, default=str)
    short_hash = hashlib.md5(raw.encode()).hexdigest()[:12]
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
        keys = r.keys(pattern)
        if keys:
            count = r.delete(*keys)
            logger.info(f"Invalidated {count} cache keys with prefix '{prefix}'")
            return count
    except Exception as e:
        logger.warning(f"Cache invalidate error for prefix '{prefix}': {e}")
    return 0
