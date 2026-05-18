from fastapi.testclient import TestClient


def test_root(client: TestClient):
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["service"] == "TechSphere AI Backend"
    assert data["status"] == "running"
    assert data["docs"] == "/docs"
    assert data["health"] == "/health"


def test_health_check(client: TestClient):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "TechSphere AI Backend"
    assert "timestamp" in data
    assert "environment" in data


def test_detailed_health_admin(client: TestClient, admin_token: str):
    response = client.get(
        "/health/detailed",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ("healthy", "degraded")
    assert data["service"] == "TechSphere AI Backend"
    assert "uptime_seconds" in data
    assert "timestamp" in data
    assert "environment" in data
    assert data["database"]["status"] == "connected"
    assert "cloudinary_configured" in data
    assert "sentry_configured" in data


def test_detailed_health_user_forbidden(client: TestClient, user_token: str):
    response = client.get(
        "/health/detailed",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert response.status_code == 403


def test_detailed_health_no_auth(client: TestClient):
    response = client.get("/health/detailed")
    assert response.status_code in (401, 403)
