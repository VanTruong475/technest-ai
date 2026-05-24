from fastapi.testclient import TestClient

from app.models.user import User


def test_admin_list_users(client: TestClient, admin_token: str, test_user: User):
    response = client.get(
        "/api/users",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 2  # admin + test_user
    emails = [u["email"] for u in data["items"]]
    assert "test@example.com" in emails
    assert "admin@example.com" in emails


def test_user_list_users_forbidden(client: TestClient, user_token: str):
    response = client.get(
        "/api/users",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert response.status_code == 403


def test_admin_get_user_by_id(client: TestClient, admin_token: str, test_user: User):
    response = client.get(
        f"/api/users/{test_user.id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "test@example.com"
    assert data["full_name"] == "Test User"


def test_user_get_own_profile(client: TestClient, user_token: str, test_user: User):
    response = client.get(
        f"/api/users/{test_user.id}",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert response.status_code == 200
    assert response.json()["email"] == "test@example.com"


def test_user_get_other_user_forbidden(
    client: TestClient, user_token: str, admin_user: User
):
    response = client.get(
        f"/api/users/{admin_user.id}",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert response.status_code == 403
    assert "own profile" in response.json()["detail"].lower()


def test_user_not_found(client: TestClient, admin_token: str):
    response = client.get(
        "/api/users/999",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 404


def test_admin_update_user(client: TestClient, admin_token: str, test_user: User):
    response = client.put(
        f"/api/users/{test_user.id}",
        json={"full_name": "Updated Name", "phone": "0999999999"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["full_name"] == "Updated Name"
    assert data["phone"] == "0999999999"


def test_admin_update_user_role(client: TestClient, admin_token: str, test_user: User):
    response = client.put(
        f"/api/users/{test_user.id}",
        json={"role": "ADMIN"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    assert response.json()["role"] == "ADMIN"


def test_user_update_own_profile(client: TestClient, user_token: str, test_user: User):
    response = client.put(
        f"/api/users/{test_user.id}",
        json={"full_name": "Self Updated", "phone": "0888888888"},
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert response.status_code == 200
    assert response.json()["full_name"] == "Self Updated"


def test_user_update_other_user_forbidden(
    client: TestClient, user_token: str, admin_user: User
):
    response = client.put(
        f"/api/users/{admin_user.id}",
        json={"full_name": "Hacked"},
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert response.status_code == 403


def test_user_cannot_escalate_role(
    client: TestClient, user_token: str, test_user: User
):
    response = client.put(
        f"/api/users/{test_user.id}",
        json={"role": "ADMIN"},
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert response.status_code == 403
    assert "role" in response.json()["detail"].lower()


def test_user_cannot_change_is_active(
    client: TestClient, user_token: str, test_user: User
):
    response = client.put(
        f"/api/users/{test_user.id}",
        json={"is_active": False},
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert response.status_code == 403
    assert "active" in response.json()["detail"].lower()


def test_update_user_not_found(client: TestClient, admin_token: str):
    response = client.put(
        "/api/users/999",
        json={"full_name": "Ghost"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 404


def test_admin_cannot_demote_self(client: TestClient, admin_token: str, admin_user: User):
    response = client.put(
        f"/api/users/{admin_user.id}",
        json={"role": "USER"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 400
    assert "own role" in response.json()["detail"].lower()


def test_admin_cannot_disable_self(client: TestClient, admin_token: str, admin_user: User):
    response = client.put(
        f"/api/users/{admin_user.id}",
        json={"is_active": False},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 400
    assert "disable" in response.json()["detail"].lower()


def test_admin_can_demote_other_admin(
    client: TestClient, admin_token: str, session
):
    """Admin can still demote another admin (just not themselves)."""
    from app.models.user import User as UserModel
    from app.services.auth_service import hash_password

    other_admin = UserModel(
        full_name="Other Admin",
        email="other_admin@example.com",
        password_hash=hash_password("test123"),
        role="ADMIN",
        is_active=True,
    )
    session.add(other_admin)
    session.commit()
    session.refresh(other_admin)

    response = client.put(
        f"/api/users/{other_admin.id}",
        json={"role": "USER"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    assert response.json()["role"] == "USER"


def test_admin_self_update_full_name_still_works(
    client: TestClient, admin_token: str, admin_user: User
):
    """Self-protection only blocks role/is_active, other fields fine."""
    response = client.put(
        f"/api/users/{admin_user.id}",
        json={"full_name": "Admin Renamed"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    assert response.json()["full_name"] == "Admin Renamed"
