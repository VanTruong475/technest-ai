from fastapi.testclient import TestClient


def test_change_password_success(client: TestClient, user_token: str):
    response = client.put("/api/auth/change-password", headers={
        "Authorization": f"Bearer {user_token}",
    }, json={
        "current_password": "test123",
        "new_password": "newpassword123",
        "confirm_password": "newpassword123",
    })
    assert response.status_code == 200
    assert response.json()["message"] == "Password changed successfully"


def test_change_password_wrong_current(client: TestClient, user_token: str):
    response = client.put("/api/auth/change-password", headers={
        "Authorization": f"Bearer {user_token}",
    }, json={
        "current_password": "wrongpassword",
        "new_password": "newpassword123",
        "confirm_password": "newpassword123",
    })
    assert response.status_code == 400
    assert "incorrect" in response.json()["detail"].lower()


def test_change_password_too_short(client: TestClient, user_token: str):
    response = client.put("/api/auth/change-password", headers={
        "Authorization": f"Bearer {user_token}",
    }, json={
        "current_password": "test123",
        "new_password": "short",
        "confirm_password": "short",
    })
    assert response.status_code == 422


def test_change_password_confirm_mismatch(client: TestClient, user_token: str):
    response = client.put("/api/auth/change-password", headers={
        "Authorization": f"Bearer {user_token}",
    }, json={
        "current_password": "test123",
        "new_password": "newpassword123",
        "confirm_password": "different123",
    })
    assert response.status_code == 422


def test_change_password_login_with_old_password(client: TestClient, user_token: str):
    # Change password first
    client.put("/api/auth/change-password", headers={
        "Authorization": f"Bearer {user_token}",
    }, json={
        "current_password": "test123",
        "new_password": "newpassword123",
        "confirm_password": "newpassword123",
    })

    # Try login with old password
    response = client.post("/api/auth/login", json={
        "email": "test@example.com",
        "password": "test123",
    })
    assert response.status_code == 401


def test_change_password_login_with_new_password(client: TestClient, user_token: str):
    # Change password first
    client.put("/api/auth/change-password", headers={
        "Authorization": f"Bearer {user_token}",
    }, json={
        "current_password": "test123",
        "new_password": "newpassword123",
        "confirm_password": "newpassword123",
    })

    # Login with new password
    response = client.post("/api/auth/login", json={
        "email": "test@example.com",
        "password": "newpassword123",
    })
    assert response.status_code == 200
    assert "access_token" in response.json()


def test_change_password_no_auth(client: TestClient):
    response = client.put("/api/auth/change-password", json={
        "current_password": "test123",
        "new_password": "newpassword123",
        "confirm_password": "newpassword123",
    })
    assert response.status_code in (401, 403)
