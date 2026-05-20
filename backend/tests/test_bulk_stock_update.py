from fastapi.testclient import TestClient
from sqlmodel import Session

from app.models.brand import Brand
from app.models.category import Category
from app.models.product import Product


def test_bulk_update_stock_success(
    client: TestClient, session: Session, admin_token: str,
    category: Category, brand: Brand,
):
    p1 = Product(name="iPhone", slug="iphone", price=20000000, stock=10,
                 status="ACTIVE", category_id=category.id, brand_id=brand.id)
    p2 = Product(name="AirPods", slug="airpods", price=5000000, stock=20,
                 status="ACTIVE", category_id=category.id, brand_id=brand.id)
    session.add(p1)
    session.add(p2)
    session.commit()
    session.refresh(p1)
    session.refresh(p2)

    response = client.put(
        "/api/products/bulk-update",
        json={"items": [
            {"product_id": p1.id, "stock": 100},
            {"product_id": p2.id, "stock": 50},
        ]},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["updated"] == 2
    assert len(data["products"]) == 2
    stocks = {p["id"]: p["stock"] for p in data["products"]}
    assert stocks[p1.id] == 100
    assert stocks[p2.id] == 50


def test_bulk_update_stock_single_product(
    client: TestClient, session: Session, admin_token: str,
    category: Category, brand: Brand,
):
    p = Product(name="MacBook", slug="macbook", price=30000000, stock=5,
                status="ACTIVE", category_id=category.id, brand_id=brand.id)
    session.add(p)
    session.commit()
    session.refresh(p)

    response = client.put(
        "/api/products/bulk-update",
        json={"items": [{"product_id": p.id, "stock": 0}]},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["updated"] == 1
    assert data["products"][0]["stock"] == 0


def test_bulk_update_stock_product_not_found(
    client: TestClient, admin_token: str,
):
    response = client.put(
        "/api/products/bulk-update",
        json={"items": [{"product_id": 9999, "stock": 10}]},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_bulk_update_stock_partial_not_found(
    client: TestClient, session: Session, admin_token: str,
    category: Category, brand: Brand,
):
    p = Product(name="iPad", slug="ipad", price=15000000, stock=10,
                status="ACTIVE", category_id=category.id, brand_id=brand.id)
    session.add(p)
    session.commit()
    session.refresh(p)

    response = client.put(
        "/api/products/bulk-update",
        json={"items": [
            {"product_id": p.id, "stock": 20},
            {"product_id": 9999, "stock": 30},
        ]},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 404


def test_bulk_update_stock_negative_stock(
    client: TestClient, admin_token: str,
):
    response = client.put(
        "/api/products/bulk-update",
        json={"items": [{"product_id": 1, "stock": -1}]},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 422


def test_bulk_update_stock_empty_items(
    client: TestClient, admin_token: str,
):
    response = client.put(
        "/api/products/bulk-update",
        json={"items": []},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["updated"] == 0


def test_bulk_update_stock_requires_admin(
    client: TestClient, user_token: str,
):
    response = client.put(
        "/api/products/bulk-update",
        json={"items": [{"product_id": 1, "stock": 10}]},
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert response.status_code == 403


def test_bulk_update_stock_requires_auth(client: TestClient):
    response = client.put(
        "/api/products/bulk-update",
        json={"items": [{"product_id": 1, "stock": 10}]},
    )
    assert response.status_code == 401


def test_bulk_update_stock_persists(
    client: TestClient, session: Session, admin_token: str,
    category: Category, brand: Brand,
):
    p = Product(name="Watch", slug="watch", price=10000000, stock=5,
                status="ACTIVE", category_id=category.id, brand_id=brand.id)
    session.add(p)
    session.commit()
    session.refresh(p)

    client.put(
        "/api/products/bulk-update",
        json={"items": [{"product_id": p.id, "stock": 99}]},
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    response = client.get(f"/api/products/{p.id}")
    assert response.status_code == 200
    assert response.json()["stock"] == 99
