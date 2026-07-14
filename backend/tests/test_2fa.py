"""Admin TOTP 2FA tests."""

import pyotp
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.models.user import User
from app.services.auth_service import create_access_token


def _enable_2fa_for(client: TestClient, admin_token: str, session: Session, admin_user: User) -> str:
    """Setup + enable 2FA; return the secret for generating codes."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    setup = client.post("/api/auth/2fa/setup", headers=headers)
    assert setup.status_code == 200
    secret = setup.json()["secret"]
    code = pyotp.TOTP(secret).now()
    enable = client.post(
        "/api/auth/2fa/enable",
        headers=headers,
        json={"code": code},
    )
    assert enable.status_code == 200
    session.refresh(admin_user)
    return secret


def test_setup_2fa_admin_only(client: TestClient, user_token: str, admin_token: str):
    # User thường bị 403
    r = client.post(
        "/api/auth/2fa/setup",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert r.status_code == 403

    r = client.post(
        "/api/auth/2fa/setup",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert r.status_code == 200
    data = r.json()
    assert "secret" in data
    assert data["otpauth_uri"].startswith("otpauth://totp/")


def test_enable_and_login_requires_2fa(
    client: TestClient,
    admin_token: str,
    admin_user: User,
    session: Session,
):
    secret = _enable_2fa_for(client, admin_token, session, admin_user)
    assert admin_user.is_2fa_enabled is True

    # Login password only → requires_2fa
    login = client.post(
        "/api/auth/login",
        json={"email": admin_user.email, "password": "admin123"},
    )
    assert login.status_code == 200
    body = login.json()
    assert body["requires_2fa"] is True
    assert body["temp_token"]
    assert body["access_token"] == ""
    # No session cookie yet
    assert "access_token" not in login.cookies or not login.cookies.get("access_token")

    # Wrong code
    bad = client.post(
        "/api/auth/2fa/verify-login",
        json={"temp_token": body["temp_token"], "code": "000000"},
    )
    assert bad.status_code == 401

    # Correct code
    code = pyotp.TOTP(secret).now()
    ok = client.post(
        "/api/auth/2fa/verify-login",
        json={"temp_token": body["temp_token"], "code": code},
    )
    assert ok.status_code == 200
    assert ok.json()["access_token"]
    assert "access_token" in ok.cookies


def test_user_login_no_2fa_step(client: TestClient, test_user: User):
    r = client.post(
        "/api/auth/login",
        json={"email": test_user.email, "password": "test123"},
    )
    assert r.status_code == 200
    assert r.json().get("requires_2fa") is False
    assert r.json()["access_token"]


def test_disable_2fa(
    client: TestClient,
    admin_token: str,
    admin_user: User,
    session: Session,
):
    secret = _enable_2fa_for(client, admin_token, session, admin_user)
    code = pyotp.TOTP(secret).now()
    r = client.post(
        "/api/auth/2fa/disable",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"password": "admin123", "code": code},
    )
    assert r.status_code == 200
    session.refresh(admin_user)
    assert admin_user.is_2fa_enabled is False
    assert admin_user.totp_secret is None

    # Login now single-step
    login = client.post(
        "/api/auth/login",
        json={"email": admin_user.email, "password": "admin123"},
    )
    assert login.status_code == 200
    assert login.json().get("requires_2fa") is False


def test_me_includes_is_2fa_enabled(client: TestClient, admin_token: str):
    r = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert r.status_code == 200
    assert "is_2fa_enabled" in r.json()
