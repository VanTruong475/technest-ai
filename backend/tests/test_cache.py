from unittest.mock import patch, MagicMock

from app.core.cache import cache_key, get_cached, set_cached, invalidate_prefix


def test_cache_key_deterministic():
    k1 = cache_key("products", page=1, limit=10)
    k2 = cache_key("products", page=1, limit=10)
    assert k1 == k2
    assert k1.startswith("techsphere:products:")


def test_cache_key_different_params():
    k1 = cache_key("products", page=1)
    k2 = cache_key("products", page=2)
    assert k1 != k2


def test_cache_key_different_prefixes():
    k1 = cache_key("products", page=1)
    k2 = cache_key("categories", page=1)
    assert k1 != k2


@patch("app.core.cache.get_redis")
def test_get_cached_no_redis(mock_get_redis):
    mock_get_redis.return_value = None
    assert get_cached("test:key") is None


@patch("app.core.cache.get_redis")
def test_set_cached_no_redis(mock_get_redis):
    mock_get_redis.return_value = None
    set_cached("test:key", {"data": "value"}, ttl=60)


@patch("app.core.cache.get_redis")
def test_invalidate_prefix_no_redis(mock_get_redis):
    mock_get_redis.return_value = None
    assert invalidate_prefix("products") == 0


@patch("app.core.cache.get_redis")
def test_get_cached_hit(mock_get_redis):
    mock_redis = MagicMock()
    mock_redis.get.return_value = '{"items": [], "total": 0}'
    mock_get_redis.return_value = mock_redis

    result = get_cached("techsphere:products:abc123")
    assert result == {"items": [], "total": 0}
    mock_redis.get.assert_called_once_with("techsphere:products:abc123")


@patch("app.core.cache.get_redis")
def test_get_cached_miss(mock_get_redis):
    mock_redis = MagicMock()
    mock_redis.get.return_value = None
    mock_get_redis.return_value = mock_redis

    result = get_cached("techsphere:products:abc123")
    assert result is None


@patch("app.core.cache.get_redis")
def test_set_cached_success(mock_get_redis):
    mock_redis = MagicMock()
    mock_get_redis.return_value = mock_redis

    set_cached("techsphere:products:abc123", {"items": []}, ttl=300)
    mock_redis.setex.assert_called_once_with(
        "techsphere:products:abc123", 300, '{"items": []}'
    )


@patch("app.core.cache.get_redis")
def test_invalidate_prefix_success(mock_get_redis):
    mock_redis = MagicMock()
    mock_redis.scan.return_value = (0, [
        "techsphere:products:aaa",
        "techsphere:products:bbb",
    ])
    mock_redis.delete.return_value = 2
    mock_get_redis.return_value = mock_redis

    count = invalidate_prefix("products")
    assert count == 2
    mock_redis.scan.assert_called_once_with(cursor=0, match="techsphere:products:*", count=100)


@patch("app.core.cache.get_redis")
def test_invalidate_prefix_no_keys(mock_get_redis):
    mock_redis = MagicMock()
    mock_redis.scan.return_value = (0, [])
    mock_get_redis.return_value = mock_redis

    count = invalidate_prefix("products")
    assert count == 0


@patch("app.core.cache.get_redis")
def test_get_cached_handles_redis_error(mock_get_redis):
    mock_redis = MagicMock()
    mock_redis.get.side_effect = Exception("Connection error")
    mock_get_redis.return_value = mock_redis

    result = get_cached("test:key")
    assert result is None


@patch("app.core.cache.get_redis")
def test_set_cached_handles_redis_error(mock_get_redis):
    mock_redis = MagicMock()
    mock_redis.setex.side_effect = Exception("Connection error")
    mock_get_redis.return_value = mock_redis

    set_cached("test:key", {"data": "value"}, ttl=60)
