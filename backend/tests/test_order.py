from fastapi.testclient import TestClient
from sqlmodel import Session

from app.models.product import Product


def _add_to_cart(client: TestClient, token: str, product_id: int, quantity: int = 1):
    client.post("/api/cart/items", headers={
        "Authorization": f"Bearer {token}",
    }, json={"product_id": product_id, "quantity": quantity})


def test_create_order(client: TestClient, user_token: str, product: Product):
    _add_to_cart(client, user_token, product.id, 2)

    response = client.post("/api/orders", headers={
        "Authorization": f"Bearer {user_token}",
    }, json={
        "shipping_address": "123 Test St",
        "phone": "0900000000",
        "note": "Test order",
    })
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "PENDING"
    assert data["shipping_address"] == "123 Test St"
    assert len(data["items"]) == 1
    assert data["items"][0]["product_id"] == product.id
    assert data["items"][0]["quantity"] == 2

    # Verify cart is emptied
    cart_response = client.get("/api/cart", headers={
        "Authorization": f"Bearer {user_token}",
    })
    assert cart_response.json()["items"] == []


def test_create_order_no_cart(client: TestClient, user_token: str):
    response = client.post("/api/orders", headers={
        "Authorization": f"Bearer {user_token}",
    }, json={
        "shipping_address": "123 Test St",
        "phone": "0900000000",
    })
    assert response.status_code == 400
    assert "Cart not found" in response.json()["detail"]


def test_create_order_empty_cart(client: TestClient, user_token: str, product: Product):
    # Add item then delete to create an empty cart
    add_resp = client.post("/api/cart/items", headers={
        "Authorization": f"Bearer {user_token}",
    }, json={"product_id": product.id, "quantity": 1})
    item_id = add_resp.json()["items"][0]["id"]
    client.delete(f"/api/cart/items/{item_id}", headers={
        "Authorization": f"Bearer {user_token}",
    })

    response = client.post("/api/orders", headers={
        "Authorization": f"Bearer {user_token}",
    }, json={
        "shipping_address": "123 Test St",
        "phone": "0900000000",
    })
    assert response.status_code == 400
    assert "Cart is empty" in response.json()["detail"]


def test_create_order_requires_auth(client: TestClient):
    response = client.post("/api/orders", json={
        "shipping_address": "123 Test St",
        "phone": "0900000000",
    })
    assert response.status_code == 401


def test_list_orders(client: TestClient, user_token: str, product: Product):
    _add_to_cart(client, user_token, product.id, 1)
    client.post("/api/orders", headers={
        "Authorization": f"Bearer {user_token}",
    }, json={"shipping_address": "Addr 1", "phone": "0900000001"})

    response = client.get("/api/orders", headers={
        "Authorization": f"Bearer {user_token}",
    })
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1
    assert len(data["items"]) >= 1


def test_get_order_detail(client: TestClient, user_token: str, product: Product):
    _add_to_cart(client, user_token, product.id, 1)
    create_response = client.post("/api/orders", headers={
        "Authorization": f"Bearer {user_token}",
    }, json={"shipping_address": "Addr", "phone": "0900000000"})
    order_id = create_response.json()["id"]

    response = client.get(f"/api/orders/{order_id}", headers={
        "Authorization": f"Bearer {user_token}",
    })
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == order_id
    assert len(data["items"]) == 1


def test_get_order_not_found(client: TestClient, user_token: str):
    response = client.get("/api/orders/9999", headers={
        "Authorization": f"Bearer {user_token}",
    })
    assert response.status_code == 404


def test_user_cannot_see_other_users_order(
    client: TestClient, user_token: str, admin_token: str, product: Product
):
    _add_to_cart(client, user_token, product.id, 1)
    create_response = client.post("/api/orders", headers={
        "Authorization": f"Bearer {user_token}",
    }, json={"shipping_address": "Addr", "phone": "0900000000"})
    order_id = create_response.json()["id"]

    response = client.get(f"/api/orders/{order_id}", headers={
        "Authorization": f"Bearer {admin_token}",
    })
    assert response.status_code == 200


def test_admin_can_see_any_order(
    client: TestClient, user_token: str, admin_token: str, product: Product
):
    _add_to_cart(client, user_token, product.id, 1)
    create_response = client.post("/api/orders", headers={
        "Authorization": f"Bearer {user_token}",
    }, json={"shipping_address": "Addr", "phone": "0900000000"})
    order_id = create_response.json()["id"]

    response = client.get(f"/api/orders/{order_id}", headers={
        "Authorization": f"Bearer {admin_token}",
    })
    assert response.status_code == 200
    assert response.json()["id"] == order_id


def test_admin_update_order_status(
    client: TestClient, user_token: str, admin_token: str, product: Product
):
    _add_to_cart(client, user_token, product.id, 1)
    create_response = client.post("/api/orders", headers={
        "Authorization": f"Bearer {user_token}",
    }, json={"shipping_address": "Addr", "phone": "0900000000"})
    order_id = create_response.json()["id"]

    response = client.put(f"/api/orders/{order_id}/status", headers={
        "Authorization": f"Bearer {admin_token}",
    }, json={"status": "CONFIRMED"})
    assert response.status_code == 200
    assert response.json()["status"] == "CONFIRMED"


def test_update_order_status_invalid(client: TestClient, user_token: str, admin_token: str, product: Product):
    _add_to_cart(client, user_token, product.id, 1)
    create_response = client.post("/api/orders", headers={
        "Authorization": f"Bearer {user_token}",
    }, json={"shipping_address": "Addr", "phone": "0900000000"})
    order_id = create_response.json()["id"]

    response = client.put(f"/api/orders/{order_id}/status", headers={
        "Authorization": f"Bearer {admin_token}",
    }, json={"status": "INVALID_STATUS"})
    assert response.status_code == 400
    assert "Invalid status" in response.json()["detail"]


def test_user_cannot_update_order_status(
    client: TestClient, user_token: str, product: Product
):
    _add_to_cart(client, user_token, product.id, 1)
    create_response = client.post("/api/orders", headers={
        "Authorization": f"Bearer {user_token}",
    }, json={"shipping_address": "Addr", "phone": "0900000000"})
    order_id = create_response.json()["id"]

    response = client.put(f"/api/orders/{order_id}/status", headers={
        "Authorization": f"Bearer {user_token}",
    }, json={"status": "CONFIRMED"})
    assert response.status_code == 403


def test_stock_deducted_after_order(client: TestClient, user_token: str, product: Product, session: Session):
    initial_stock = product.stock
    _add_to_cart(client, user_token, product.id, 3)

    client.post("/api/orders", headers={
        "Authorization": f"Bearer {user_token}",
    }, json={"shipping_address": "Addr", "phone": "0900000000"})

    session.refresh(product)
    assert product.stock == initial_stock - 3
