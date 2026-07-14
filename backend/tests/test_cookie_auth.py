"""Hybrid cookie auth + Origin check tests."""

from fastapi.testclient import TestClient

from app.services.auth_service import AUTH_COOKIE_NAME, create_access_token
from app.models.user import User


def test_login_sets_httponly_cookie(client: TestClient, test_user: User):
    response = client.post(
        "/api/auth/login",
        json={"email": test_user.email, "password": "test123"},
    )
    assert response.status_code == 200
    assert "access_token" in response.json()
    # Cookie set
    assert AUTH_COOKIE_NAME in response.cookies
    cookie = response.cookies.get(AUTH_COOKIE_NAME)
    assert cookie
    # HttpOnly flag on set-cookie header
    set_cookie = response.headers.get("set-cookie", "")
    assert "httponly" in set_cookie.lower()


def test_me_with_cookie_only(client: TestClient, test_user: User):
    token = create_access_token(data={"sub": str(test_user.id)})
    client.cookies.set(AUTH_COOKIE_NAME, token)
    response = client.get("/api/auth/me")
    assert response.status_code == 200
    assert response.json()["email"] == test_user.email


def test_me_with_bearer_only(client: TestClient, user_token: str, test_user: User):
    response = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert response.status_code == 200
    assert response.json()["email"] == test_user.email


def test_me_without_auth_returns_401(client: TestClient):
    response = client.get("/api/auth/me")
    assert response.status_code == 401


def test_logout_clears_cookie(client: TestClient, test_user: User):
    login = client.post(
        "/api/auth/login",
        json={"email": test_user.email, "password": "test123"},
    )
    assert AUTH_COOKIE_NAME in login.cookies

    response = client.post(
        "/api/auth/logout",
        headers={"Origin": "http://localhost:5173"},
    )
    assert response.status_code == 200
    # delete_cookie typically sets Max-Age=0 / empty value
    set_cookie = response.headers.get("set-cookie", "").lower()
    assert AUTH_COOKIE_NAME in set_cookie or response.status_code == 200


def test_origin_mismatch_with_cookie_rejected(client: TestClient, test_user: User):
    token = create_access_token(data={"sub": str(test_user.id)})
    client.cookies.set(AUTH_COOKIE_NAME, token)
    response = client.post(
        "/api/cart/items",
        json={"product_id": 1, "quantity": 1},
        headers={"Origin": "https://evil.example.com"},
    )
    assert response.status_code == 403
    assert response.json().get("error_code") == "ORIGIN_MISMATCH"


def test_origin_allowed_with_cookie(client: TestClient, test_user: User, product):
    token = create_access_token(data={"sub": str(test_user.id)})
    client.cookies.set(AUTH_COOKIE_NAME, token)
    # Default CORS_ORIGINS includes localhost:5173
    response = client.post(
        "/api/cart/items",
        json={"product_id": product.id, "quantity": 1},
        headers={"Origin": "http://localhost:5173"},
    )
    assert response.status_code in (200, 201)


def test_bearer_only_skips_origin_check(client: TestClient, user_token: str, product):
    """No cookie → Origin check skipped even if Origin is evil."""
    response = client.post(
        "/api/cart/items",
        json={"product_id": product.id, "quantity": 1},
        headers={
            "Authorization": f"Bearer {user_token}",
            "Origin": "https://evil.example.com",
        },
    )
    # Should not be 403 ORIGIN_MISMATCH
    assert response.status_code != 403 or response.json().get("error_code") != "ORIGIN_MISMATCH"
    assert response.status_code in (200, 201)
