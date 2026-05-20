from fastapi.testclient import TestClient
from sqlmodel import Session

from app.models.category import Category


def test_list_categories_empty(client: TestClient):
    response = client.get("/api/categories")
    assert response.status_code == 200
    data = response.json()
    assert data["items"] == []
    assert data["total"] == 0


def test_list_categories(client: TestClient, category: Category):
    response = client.get("/api/categories")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["name"] == "Phones"
    assert data["items"][0]["slug"] == "phones"


def test_list_categories_pagination(client: TestClient, session: Session):
    for i in range(15):
        cat = Category(name=f"Cat {i}", slug=f"cat-{i}")
        session.add(cat)
    session.commit()

    response = client.get("/api/categories?page=2&limit=10")
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 5
    assert data["total"] == 15


def test_get_category_by_id(client: TestClient, category: Category):
    response = client.get(f"/api/categories/{category.id}")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Phones"
    assert data["id"] == category.id


def test_get_category_not_found(client: TestClient):
    response = client.get("/api/categories/999")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_create_category(client: TestClient, admin_token: str):
    response = client.post(
        "/api/categories",
        json={"name": "Laptops", "slug": "laptops", "description": "Laptop computers"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Laptops"
    assert data["slug"] == "laptops"
    assert data["description"] == "Laptop computers"


def test_create_category_requires_admin(client: TestClient, user_token: str):
    response = client.post(
        "/api/categories",
        json={"name": "Test", "slug": "test"},
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert response.status_code == 403


def test_create_category_requires_auth(client: TestClient):
    response = client.post(
        "/api/categories",
        json={"name": "Test", "slug": "test"},
    )
    assert response.status_code == 401


def test_create_category_duplicate_slug(client: TestClient, admin_token: str, category: Category):
    response = client.post(
        "/api/categories",
        json={"name": "Duplicate", "slug": "phones"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 400
    assert "slug" in response.json()["detail"].lower()


def test_update_category(client: TestClient, admin_token: str, category: Category):
    response = client.put(
        f"/api/categories/{category.id}",
        json={"name": "Smartphones"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    assert response.json()["name"] == "Smartphones"


def test_update_category_not_found(client: TestClient, admin_token: str):
    response = client.put(
        "/api/categories/999",
        json={"name": "Test"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 404


def test_delete_category(client: TestClient, admin_token: str, category: Category):
    response = client.delete(
        f"/api/categories/{category.id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 204

    # Verify deleted
    response = client.get(f"/api/categories/{category.id}")
    assert response.status_code == 404


def test_delete_category_not_found(client: TestClient, admin_token: str):
    response = client.delete(
        "/api/categories/999",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 404
