import logging

from fastapi.testclient import TestClient


def test_request_returns_correct_response(client: TestClient):
    """Middleware không làm thay đổi response."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"


def test_health_not_logged(client: TestClient, caplog):
    """Endpoint /health không bị log."""
    with caplog.at_level(logging.INFO, logger="techsphere"):
        client.get("/health")

    log_messages = [record.message for record in caplog.records]
    assert not any("/health" in msg for msg in log_messages)


def test_normal_endpoint_logged(client: TestClient, caplog):
    """Endpoint bình thường được log ở INFO level."""
    with caplog.at_level(logging.INFO, logger="techsphere"):
        client.get("/api/products")

    log_messages = [record.message for record in caplog.records]
    assert any("/api/products" in msg and "GET" in msg for msg in log_messages)


def test_404_logged_as_warning(client: TestClient, caplog):
    """Endpoint trả 404 được log ở WARNING level."""
    with caplog.at_level(logging.WARNING, logger="techsphere"):
        client.get("/api/products/99999")

    warning_records = [r for r in caplog.records if r.levelno >= logging.WARNING]
    assert any("/api/products/99999" in r.message for r in warning_records)


def test_403_logged_as_warning(client: TestClient, caplog):
    """Endpoint trả 403 được log ở WARNING level."""
    with caplog.at_level(logging.WARNING, logger="techsphere"):
        client.get("/api/users")

    warning_records = [r for r in caplog.records if r.levelno >= logging.WARNING]
    assert any("/api/users" in r.message for r in warning_records)


def test_log_contains_method_and_status(client: TestClient, caplog):
    """Log chứa method, path, status_code."""
    with caplog.at_level(logging.INFO, logger="techsphere"):
        client.get("/api/products")

    log_messages = [record.message for record in caplog.records]
    product_logs = [msg for msg in log_messages if "/api/products" in msg]
    assert len(product_logs) > 0
    assert "GET" in product_logs[0]
    assert "200" in product_logs[0]
