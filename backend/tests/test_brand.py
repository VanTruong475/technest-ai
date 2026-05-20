from fastapi.testclient import TestClient
from sqlmodel import Session

from app.models.brand import Brand


def test_list_brands_empty(client: TestClient):
    response = client.get("/api/brands")
    assert response.status_code == 200
    data = response.json()
    assert data["items"] == []
    assert data["total"] == 0


def test_list_brands(client: TestClient, brand: Brand):
    response = client.get("/api/brands")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["name"] == "Apple"
    assert data["items"][0]["slug"] == "apple"


def test_list_brands_pagination(client: TestClient, session: Session):
    for i in range(15):
        b = Brand(name=f"Brand {i}", slug=f"brand-{i}")
        session.add(b)
    session.commit()

    response = client.get("/api/brands?page=2&limit=10")
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 5
    assert data["total"] == 15


def test_get_brand_by_id(client: TestClient, brand: Brand):
    response = client.get(f"/api/brands/{brand.id}")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Apple"
    assert data["id"] == brand.id


def test_get_brand_not_found(client: TestClient):
    response = client.get("/api/brands/999")
    assert response.status_code == 404


def test_create_brand(client: TestClient, admin_token: str):
    response = client.post(
        "/api/brands",
        json={"name": "Samsung", "slug": "samsung"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Samsung"
    assert data["slug"] == "samsung"


def test_create_brand_requires_admin(client: TestClient, user_token: str):
    response = client.post(
        "/api/brands",
        json={"name": "Test", "slug": "test"},
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert response.status_code == 403


def test_create_brand_requires_auth(client: TestClient):
    response = client.post(
        "/api/brands",
        json={"name": "Test", "slug": "test"},
    )
    assert response.status_code == 401


def test_create_brand_duplicate_slug(client: TestClient, admin_token: str, brand: Brand):
    response = client.post(
        "/api/brands",
        json={"name": "Duplicate", "slug": "apple"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 400


def test_update_brand(client: TestClient, admin_token: str, brand: Brand):
    response = client.put(
        f"/api/brands/{brand.id}",
        json={"name": "Apple Inc."},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    assert response.json()["name"] == "Apple Inc."


def test_update_brand_not_found(client: TestClient, admin_token: str):
    response = client.put(
        "/api/brands/999",
        json={"name": "Test"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 404


def test_delete_brand(client: TestClient, admin_token: str, brand: Brand):
    response = client.delete(
        f"/api/brands/{brand.id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 204

    response = client.get(f"/api/brands/{brand.id}")
    assert response.status_code == 404


def test_delete_brand_not_found(client: TestClient, admin_token: str):
    response = client.delete(
        "/api/brands/999",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 404
