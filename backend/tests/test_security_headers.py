from fastapi.testclient import TestClient


def test_security_headers_on_health(client: TestClient):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.headers.get("X-Content-Type-Options") == "nosniff"
    assert response.headers.get("X-Frame-Options") == "DENY"
    assert response.headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"
    assert "camera=()" in (response.headers.get("Permissions-Policy") or "")
    assert "default-src 'none'" in (response.headers.get("Content-Security-Policy") or "")


def test_security_headers_on_api(client: TestClient):
    response = client.get("/api/products")
    assert response.status_code == 200
    assert response.headers.get("X-Content-Type-Options") == "nosniff"
    assert response.headers.get("X-Frame-Options") == "DENY"


def test_docs_has_relaxed_csp(client: TestClient):
    """Swagger UI pages must get a permissive CSP so CDN assets load."""
    response = client.get("/docs")
    csp = response.headers.get("Content-Security-Policy", "")
    assert "default-src 'self'" in csp
    assert "cdn.jsdelivr.net" in csp


def test_api_has_strict_csp(client: TestClient):
    """API endpoints must keep the strict default-src 'none' CSP."""
    response = client.get("/health")
    csp = response.headers.get("Content-Security-Policy", "")
    assert "default-src 'none'" in csp
    assert "cdn.jsdelivr.net" not in csp


def test_hsts_absent_in_non_production(client: TestClient, monkeypatch):
    """Default test env is not production — HSTS must not be forced on HTTP local."""
    monkeypatch.setattr("app.core.config.settings.ENVIRONMENT", "development")
    # Middleware already constructed with settings at import; re-check via patch
    # of the name used inside the middleware module.
    monkeypatch.setattr(
        "app.core.security_headers.settings.ENVIRONMENT", "development"
    )
    response = client.get("/health")
    assert "Strict-Transport-Security" not in response.headers


def test_hsts_present_in_production(client: TestClient, monkeypatch):
    monkeypatch.setattr(
        "app.core.security_headers.settings.ENVIRONMENT", "production"
    )
    response = client.get("/health")
    hsts = response.headers.get("Strict-Transport-Security", "")
    assert "max-age=31536000" in hsts
    assert "includeSubDomains" in hsts
