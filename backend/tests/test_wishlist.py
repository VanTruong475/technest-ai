from fastapi.testclient import TestClient
from sqlmodel import Session

from app.models.product import Product


def test_add_to_wishlist(client: TestClient, user_token: str, product: Product):
    response = client.post(
        f"/api/wishlist/{product.id}",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert response.status_code == 201
    assert response.json()["message"] == "Added to wishlist"


def test_add_duplicate_wishlist(client: TestClient, user_token: str, product: Product):
    client.post(
        f"/api/wishlist/{product.id}",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    response = client.post(
        f"/api/wishlist/{product.id}",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert response.status_code == 409
    assert "already" in response.json()["detail"].lower()


def test_add_wishlist_product_not_found(client: TestClient, user_token: str):
    response = client.post(
        "/api/wishlist/99999",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert response.status_code == 404


def test_remove_from_wishlist(client: TestClient, user_token: str, product: Product):
    client.post(
        f"/api/wishlist/{product.id}",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    response = client.delete(
        f"/api/wishlist/{product.id}",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert response.status_code == 204


def test_remove_wishlist_not_found(client: TestClient, user_token: str):
    response = client.delete(
        "/api/wishlist/99999",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert response.status_code == 404


def test_list_wishlist(client: TestClient, user_token: str, product: Product):
    client.post(
        f"/api/wishlist/{product.id}",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    response = client.get(
        "/api/wishlist",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["product_id"] == product.id
    assert data[0]["product_name"] == product.name


def test_list_wishlist_empty(client: TestClient, user_token: str):
    response = client.get(
        "/api/wishlist",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert response.status_code == 200
    assert response.json() == []


def test_check_favorited(client: TestClient, user_token: str, product: Product):
    client.post(
        f"/api/wishlist/{product.id}",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    response = client.get(
        f"/api/wishlist/check/{product.id}",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert response.status_code == 200
    assert response.json()["is_favorited"] is True


def test_check_not_favorited(client: TestClient, user_token: str, product: Product):
    response = client.get(
        f"/api/wishlist/check/{product.id}",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert response.status_code == 200
    assert response.json()["is_favorited"] is False


def test_add_wishlist_no_auth(client: TestClient, product: Product):
    response = client.post(f"/api/wishlist/{product.id}")
    assert response.status_code in (401, 403)


def test_list_wishlist_no_auth(client: TestClient):
    response = client.get("/api/wishlist")
    assert response.status_code in (401, 403)
