from fastapi.testclient import TestClient

from app.models.brand import Brand
from app.models.category import Category
from app.models.product import Product


def test_get_product_by_id(client: TestClient, product: Product):
    response = client.get(f"/api/products/{product.id}")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "iPhone 15 Pro"
    assert data["price"] == 29990000
    assert data["sale_price"] == 27490000


def test_get_product_not_found(client: TestClient):
    response = client.get("/api/products/999")
    assert response.status_code == 404


def test_create_product(
    client: TestClient, admin_token: str, category: Category, brand: Brand
):
    response = client.post(
        "/api/products",
        json={
            "name": "New Phone",
            "slug": "new-phone",
            "price": 15000000,
            "stock": 100,
            "status": "ACTIVE",
            "category_id": category.id,
            "brand_id": brand.id,
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "New Phone"
    assert data["slug"] == "new-phone"
    assert data["price"] == 15000000


def test_create_product_requires_admin(
    client: TestClient, user_token: str, category: Category, brand: Brand
):
    response = client.post(
        "/api/products",
        json={
            "name": "Test",
            "slug": "test",
            "price": 1000,
            "stock": 1,
            "status": "ACTIVE",
            "category_id": category.id,
            "brand_id": brand.id,
        },
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert response.status_code == 403


def test_update_product(client: TestClient, admin_token: str, product: Product):
    response = client.put(
        f"/api/products/{product.id}",
        json={"name": "iPhone 15 Pro Max", "price": 32990000},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "iPhone 15 Pro Max"
    assert data["price"] == 32990000


def test_update_product_not_found(client: TestClient, admin_token: str):
    response = client.put(
        "/api/products/999",
        json={"name": "Ghost"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 404


def test_delete_product(client: TestClient, admin_token: str, product: Product):
    response = client.delete(
        f"/api/products/{product.id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    # Product should still exist (soft delete — status changed)
    data = response.json()
    assert data["id"] == product.id


def test_delete_product_not_found(client: TestClient, admin_token: str):
    response = client.delete(
        "/api/products/999",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 404


def test_list_products_with_filters(
    client: TestClient, product: Product, product2: Product,
    category: Category, brand: Brand,
):
    # Filter by category
    response = client.get(f"/api/products?category_id={category.id}")
    assert response.status_code == 200
    assert response.json()["total"] == 2

    # Filter by search
    response = client.get("/api/products?search=iPhone")
    assert response.status_code == 200
    assert response.json()["total"] == 1
    assert response.json()["items"][0]["name"] == "iPhone 15 Pro"

    # Filter by price range
    response = client.get("/api/products?min_price=10000000")
    assert response.status_code == 200
    assert response.json()["total"] == 1

    # Filter by status
    response = client.get("/api/products?status=ACTIVE")
    assert response.status_code == 200
    assert response.json()["total"] == 2


def test_list_products_pagination(client: TestClient, product: Product, product2: Product):
    response = client.get("/api/products?page=1&limit=1")
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 1
    assert data["total"] == 2
    assert data["total_pages"] == 2
