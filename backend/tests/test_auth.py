from fastapi.testclient import TestClient


def test_register_success(client: TestClient):
    response = client.post("/api/auth/register", json={
        "full_name": "New User",
        "email": "new@example.com",
        "password": "newpass123",
        "phone": "0900000001",
    })
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "new@example.com"
    assert data["full_name"] == "New User"
    assert data["role"] == "USER"
    assert "id" in data


def test_register_duplicate_email(client: TestClient, test_user):
    response = client.post("/api/auth/register", json={
        "full_name": "Duplicate",
        "email": "test@example.com",
        "password": "test12345",
    })
    assert response.status_code == 400
    assert "already registered" in response.json()["detail"]


def test_register_missing_fields(client: TestClient):
    response = client.post("/api/auth/register", json={
        "email": "incomplete@example.com",
    })
    assert response.status_code == 422


def test_login_success(client: TestClient, test_user):
    response = client.post("/api/auth/login", json={
        "email": "test@example.com",
        "password": "test123",
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_login_wrong_password(client: TestClient, test_user):
    response = client.post("/api/auth/login", json={
        "email": "test@example.com",
        "password": "wrongpassword",
    })
    assert response.status_code == 401
    assert "Invalid" in response.json()["detail"]


def test_login_nonexistent_user(client: TestClient):
    response = client.post("/api/auth/login", json={
        "email": "nonexistent@example.com",
        "password": "test123",
    })
    assert response.status_code == 401


def test_me_with_valid_token(client: TestClient, user_token: str):
    response = client.get("/api/auth/me", headers={
        "Authorization": f"Bearer {user_token}",
    })
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "test@example.com"
    assert data["role"] == "USER"


def test_me_without_token(client: TestClient):
    response = client.get("/api/auth/me")
    assert response.status_code == 401


def test_user_cannot_access_admin_endpoints(client: TestClient, user_token: str):
    response = client.get("/api/users", headers={
        "Authorization": f"Bearer {user_token}",
    })
    assert response.status_code == 403
    data = response.json()
    assert "detail" in data
    assert "error_code" in data
    assert data["error_code"] == "FORBIDDEN"


def test_admin_can_access_admin_endpoints(client: TestClient, admin_token: str):
    response = client.get("/api/users", headers={
        "Authorization": f"Bearer {admin_token}",
    })
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
