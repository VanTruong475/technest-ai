from fastapi.testclient import TestClient
from sqlmodel import Session

from app.models.product import Product


def test_get_cart_empty(client: TestClient, user_token: str):
    response = client.get("/api/cart", headers={
        "Authorization": f"Bearer {user_token}",
    })
    assert response.status_code == 200
    data = response.json()
    assert data["items"] == []
    assert data["total_items"] == 0
    assert data["total_amount"] == 0.0


def test_add_item_to_cart(client: TestClient, user_token: str, product: Product):
    response = client.post("/api/cart/items", headers={
        "Authorization": f"Bearer {user_token}",
    }, json={
        "product_id": product.id,
        "quantity": 2,
    })
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 1
    assert data["items"][0]["product_id"] == product.id
    assert data["items"][0]["quantity"] == 2
    assert data["total_items"] == 2
    # sale_price=27490000, subtotal = 27490000 * 2 = 54980000
    assert data["total_amount"] == 54980000


def test_add_same_item_increases_quantity(client: TestClient, user_token: str, product: Product):
    client.post("/api/cart/items", headers={
        "Authorization": f"Bearer {user_token}",
    }, json={"product_id": product.id, "quantity": 2})

    response = client.post("/api/cart/items", headers={
        "Authorization": f"Bearer {user_token}",
    }, json={"product_id": product.id, "quantity": 3})

    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 1
    assert data["items"][0]["quantity"] == 5


def test_add_item_product_not_found(client: TestClient, user_token: str):
    response = client.post("/api/cart/items", headers={
        "Authorization": f"Bearer {user_token}",
    }, json={
        "product_id": 9999,
        "quantity": 1,
    })
    assert response.status_code == 404
    assert "Product not found" in response.json()["detail"]


def test_add_item_exceeds_stock(client: TestClient, user_token: str, product: Product):
    response = client.post("/api/cart/items", headers={
        "Authorization": f"Bearer {user_token}",
    }, json={
        "product_id": product.id,
        "quantity": 100,
    })
    assert response.status_code == 400
    assert "Not enough stock" in response.json()["detail"]


def test_update_cart_item(client: TestClient, user_token: str, product: Product):
    add_response = client.post("/api/cart/items", headers={
        "Authorization": f"Bearer {user_token}",
    }, json={"product_id": product.id, "quantity": 1})
    item_id = add_response.json()["items"][0]["id"]

    response = client.put(f"/api/cart/items/{item_id}", headers={
        "Authorization": f"Bearer {user_token}",
    }, json={"quantity": 5})
    assert response.status_code == 200
    data = response.json()
    assert data["items"][0]["quantity"] == 5


def test_update_cart_item_not_found(client: TestClient, user_token: str):
    response = client.put("/api/cart/items/9999", headers={
        "Authorization": f"Bearer {user_token}",
    }, json={"quantity": 1})
    assert response.status_code == 404


def test_delete_cart_item(client: TestClient, user_token: str, product: Product):
    add_response = client.post("/api/cart/items", headers={
        "Authorization": f"Bearer {user_token}",
    }, json={"product_id": product.id, "quantity": 1})
    item_id = add_response.json()["items"][0]["id"]

    response = client.delete(f"/api/cart/items/{item_id}", headers={
        "Authorization": f"Bearer {user_token}",
    })
    assert response.status_code == 200
    data = response.json()
    assert data["items"] == []
    assert data["total_items"] == 0


def test_delete_cart_item_not_found(client: TestClient, user_token: str):
    response = client.delete("/api/cart/items/9999", headers={
        "Authorization": f"Bearer {user_token}",
    })
    assert response.status_code == 404


def test_cart_requires_auth(client: TestClient):
    response = client.get("/api/cart")
    assert response.status_code == 401


def test_add_multiple_products(client: TestClient, user_token: str, product: Product, product2: Product):
    client.post("/api/cart/items", headers={
        "Authorization": f"Bearer {user_token}",
    }, json={"product_id": product.id, "quantity": 1})

    response = client.post("/api/cart/items", headers={
        "Authorization": f"Bearer {user_token}",
    }, json={"product_id": product2.id, "quantity": 2})

    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 2
    assert data["total_items"] == 3


# ── PR #5 H5: GET cart không mutate DB ──

def test_get_cart_does_not_delete_inactive_item(
    client: TestClient, user_token: str, product: Product, session: Session
):
    """GET /api/cart phải pure read — không xóa cart_item ngay cả khi product
    bị deactivate. Stale items chỉ được dọn ở checkout (atomic) hoặc khi user
    chủ động delete."""
    client.post("/api/cart/items", headers={
        "Authorization": f"Bearer {user_token}",
    }, json={"product_id": product.id, "quantity": 2})

    # Admin deactivates the product after user added it
    product.status = "INACTIVE"
    session.add(product)
    session.commit()

    # GET filters stale item out of response, but row remains in DB
    response = client.get("/api/cart", headers={
        "Authorization": f"Bearer {user_token}",
    })
    assert response.status_code == 200
    assert response.json()["items"] == []

    from app.models.cart import CartItem
    from sqlmodel import select
    remaining = list(session.exec(select(CartItem)).all())
    assert len(remaining) == 1
    assert remaining[0].product_id == product.id
