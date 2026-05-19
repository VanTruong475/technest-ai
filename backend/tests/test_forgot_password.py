from datetime import datetime, timedelta, timezone
from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.models.user import User
from app.services.auth_service import hash_password, _hash_token


def test_forgot_password_existing_email(client: TestClient, test_user: User):
    response = client.post("/api/auth/forgot-password", json={
        "email": "test@example.com",
    })
    assert response.status_code == 200
    assert "reset link has been sent" in response.json()["message"]


def test_forgot_password_nonexistent_email(client: TestClient):
    response = client.post("/api/auth/forgot-password", json={
        "email": "nonexistent@example.com",
    })
    assert response.status_code == 200
    assert "reset link has been sent" in response.json()["message"]


def test_reset_password_valid_token(client: TestClient, test_user: User, session: Session):
    token = "valid-reset-token-123"
    token_hash = _hash_token(token)

    test_user.reset_token_hash = token_hash
    test_user.reset_token_expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)
    session.add(test_user)
    session.commit()

    response = client.post("/api/auth/reset-password", json={
        "token": token,
        "new_password": "newpass123",
        "confirm_password": "newpass123",
    })
    assert response.status_code == 200
    assert "Password reset successfully" in response.json()["message"]

    login_response = client.post("/api/auth/login", json={
        "email": "test@example.com",
        "password": "newpass123",
    })
    assert login_response.status_code == 200
    assert "access_token" in login_response.json()


def test_reset_password_invalid_token(client: TestClient):
    response = client.post("/api/auth/reset-password", json={
        "token": "invalid-token",
        "new_password": "newpass123",
        "confirm_password": "newpass123",
    })
    assert response.status_code == 400
    assert "Invalid or expired" in response.json()["detail"]


def test_reset_password_expired_token(client: TestClient, test_user: User, session: Session):
    token = "expired-token-123"
    token_hash = _hash_token(token)

    test_user.reset_token_hash = token_hash
    test_user.reset_token_expires_at = datetime.now(timezone.utc) - timedelta(minutes=1)
    session.add(test_user)
    session.commit()

    response = client.post("/api/auth/reset-password", json={
        "token": token,
        "new_password": "newpass123",
        "confirm_password": "newpass123",
    })
    assert response.status_code == 400
    assert "Invalid or expired" in response.json()["detail"]


def test_reset_password_used_token(client: TestClient, test_user: User, session: Session):
    token = "used-token-123"
    token_hash = _hash_token(token)

    test_user.reset_token_hash = token_hash
    test_user.reset_token_expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)
    session.add(test_user)
    session.commit()

    response = client.post("/api/auth/reset-password", json={
        "token": token,
        "new_password": "newpass123",
        "confirm_password": "newpass123",
    })
    assert response.status_code == 200

    response2 = client.post("/api/auth/reset-password", json={
        "token": token,
        "new_password": "anotherpass",
        "confirm_password": "anotherpass",
    })
    assert response2.status_code == 400
    assert "Invalid or expired" in response2.json()["detail"]


def test_reset_password_short_password(client: TestClient, test_user: User, session: Session):
    token = "short-pw-token"
    token_hash = _hash_token(token)

    test_user.reset_token_hash = token_hash
    test_user.reset_token_expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)
    session.add(test_user)
    session.commit()

    response = client.post("/api/auth/reset-password", json={
        "token": token,
        "new_password": "short",
        "confirm_password": "short",
    })
    assert response.status_code == 422


def test_reset_password_mismatched_confirm(client: TestClient, test_user: User, session: Session):
    token = "mismatch-token"
    token_hash = _hash_token(token)

    test_user.reset_token_hash = token_hash
    test_user.reset_token_expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)
    session.add(test_user)
    session.commit()

    response = client.post("/api/auth/reset-password", json={
        "token": token,
        "new_password": "newpass123",
        "confirm_password": "differentpass",
    })
    assert response.status_code == 422


def test_login_old_password_after_reset(client: TestClient, test_user: User, session: Session):
    token = "old-pw-token"
    token_hash = _hash_token(token)

    test_user.reset_token_hash = token_hash
    test_user.reset_token_expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)
    session.add(test_user)
    session.commit()

    client.post("/api/auth/reset-password", json={
        "token": token,
        "new_password": "newpass123",
        "confirm_password": "newpass123",
    })

    login_response = client.post("/api/auth/login", json={
        "email": "test@example.com",
        "password": "test123",
    })
    assert login_response.status_code == 401


def test_login_new_password_after_reset(client: TestClient, test_user: User, session: Session):
    token = "new-pw-token"
    token_hash = _hash_token(token)

    test_user.reset_token_hash = token_hash
    test_user.reset_token_expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)
    session.add(test_user)
    session.commit()

    client.post("/api/auth/reset-password", json={
        "token": token,
        "new_password": "newpass123",
        "confirm_password": "newpass123",
    })

    login_response = client.post("/api/auth/login", json={
        "email": "test@example.com",
        "password": "newpass123",
    })
    assert login_response.status_code == 200
    assert "access_token" in login_response.json()
