from fastapi.testclient import TestClient
import pytest
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


def test_orders_sorted_newest_first(client: TestClient, user_token: str, product: Product):
    # Create 3 orders
    for _ in range(3):
        _add_to_cart(client, user_token, product.id, 1)
        client.post("/api/orders", headers={
            "Authorization": f"Bearer {user_token}",
        }, json={"shipping_address": "Addr", "phone": "0900000000"})

    response = client.get("/api/orders?page=1&limit=10", headers={
        "Authorization": f"Bearer {user_token}",
    })
    assert response.status_code == 200
    data = response.json()
    items = data["items"]
    assert len(items) == 3
    # Newest first: each item should have a created_at >= the next
    for i in range(len(items) - 1):
        assert items[i]["created_at"] >= items[i + 1]["created_at"]


def test_orders_pagination(client: TestClient, user_token: str, product: Product):
    # Create 15 orders
    for _ in range(15):
        _add_to_cart(client, user_token, product.id, 1)
        client.post("/api/orders", headers={
            "Authorization": f"Bearer {user_token}",
        }, json={"shipping_address": "Addr", "phone": "0900000000"})

    # Page 1
    r1 = client.get("/api/orders?page=1&limit=10", headers={
        "Authorization": f"Bearer {user_token}",
    })
    d1 = r1.json()
    assert len(d1["items"]) == 10
    assert d1["total"] == 15
    assert d1["page"] == 1
    assert d1["limit"] == 10
    assert d1["total_pages"] == 2

    # Page 2
    r2 = client.get("/api/orders?page=2&limit=10", headers={
        "Authorization": f"Bearer {user_token}",
    })
    d2 = r2.json()
    assert len(d2["items"]) == 5
    assert d2["page"] == 2

    # No overlap
    ids_p1 = {o["id"] for o in d1["items"]}
    ids_p2 = {o["id"] for o in d2["items"]}
    assert ids_p1.isdisjoint(ids_p2)


def test_orders_filter_status(client: TestClient, user_token: str, admin_token: str, product: Product):
    # Create 2 orders
    _add_to_cart(client, user_token, product.id, 1)
    r1 = client.post("/api/orders", headers={
        "Authorization": f"Bearer {user_token}",
    }, json={"shipping_address": "Addr 1", "phone": "0900000001"})
    order1_id = r1.json()["id"]

    _add_to_cart(client, user_token, product.id, 1)
    r2 = client.post("/api/orders", headers={
        "Authorization": f"Bearer {user_token}",
    }, json={"shipping_address": "Addr 2", "phone": "0900000002"})
    order2_id = r2.json()["id"]

    # Update order1 to COMPLETED (as admin) — must go through transitions
    client.put(f"/api/orders/{order1_id}/status", headers={
        "Authorization": f"Bearer {admin_token}",
    }, json={"status": "CONFIRMED"})
    client.put(f"/api/orders/{order1_id}/status", headers={
        "Authorization": f"Bearer {admin_token}",
    }, json={"status": "SHIPPING"})
    client.put(f"/api/orders/{order1_id}/status", headers={
        "Authorization": f"Bearer {admin_token}",
    }, json={"status": "COMPLETED"})

    # Filter PENDING
    r_pending = client.get("/api/orders?status=PENDING", headers={
        "Authorization": f"Bearer {user_token}",
    })
    pending_items = r_pending.json()["items"]
    assert len(pending_items) == 1
    assert pending_items[0]["id"] == order2_id
    assert pending_items[0]["status"] == "PENDING"

    # Filter COMPLETED
    r_completed = client.get("/api/orders?status=COMPLETED", headers={
        "Authorization": f"Bearer {user_token}",
    })
    completed_items = r_completed.json()["items"]
    assert len(completed_items) == 1
    assert completed_items[0]["id"] == order1_id
    assert completed_items[0]["status"] == "COMPLETED"


def test_orders_filter_invalid_status(client: TestClient, user_token: str):
    response = client.get("/api/orders?status=INVALID", headers={
        "Authorization": f"Bearer {user_token}",
    })
    assert response.status_code == 400
    assert "Invalid status" in response.json()["detail"]


def test_admin_sees_all_orders(client: TestClient, user_token: str, admin_token: str, product: Product):
    # User creates 2 orders
    for _ in range(2):
        _add_to_cart(client, user_token, product.id, 1)
        client.post("/api/orders", headers={
            "Authorization": f"Bearer {user_token}",
        }, json={"shipping_address": "Addr", "phone": "0900000000"})

    # Admin sees all
    response = client.get("/api/orders", headers={
        "Authorization": f"Bearer {admin_token}",
    })
    data = response.json()
    assert data["total"] == 2
    assert len(data["items"]) == 2


def test_user_only_sees_own_orders(client: TestClient, user_token: str, admin_token: str, product: Product):
    # User creates 1 order
    _add_to_cart(client, user_token, product.id, 1)
    client.post("/api/orders", headers={
        "Authorization": f"Bearer {user_token}",
    }, json={"shipping_address": "Addr", "phone": "0900000000"})

    # Admin creates 1 order
    _add_to_cart(client, admin_token, product.id, 1)
    client.post("/api/orders", headers={
        "Authorization": f"Bearer {admin_token}",
    }, json={"shipping_address": "Admin Addr", "phone": "0901234567"})

    # User sees only their own
    response = client.get("/api/orders", headers={
        "Authorization": f"Bearer {user_token}",
    })
    data = response.json()
    assert data["total"] == 1

    # Admin sees all
    response = client.get("/api/orders", headers={
        "Authorization": f"Bearer {admin_token}",
    })
    data = response.json()
    assert data["total"] == 2


# ─────────────────────────────────────────────
# Atomic transaction tests (PR #2)
# ─────────────────────────────────────────────


def test_create_order_rolls_back_on_failure(
    client: TestClient, user_token: str, product: Product, session: Session, monkeypatch
):
    """If commit fails mid-flow, order + items + stock + cart must all revert."""
    from sqlmodel import select
    from app.models.order import Order, OrderItem
    from app.models.cart import CartItem

    _add_to_cart(client, user_token, product.id, 2)

    original_stock = product.stock
    original_order_count = len(session.exec(select(Order)).all())
    original_item_count = len(session.exec(select(OrderItem)).all())
    original_cart_item_count = len(session.exec(select(CartItem)).all())
    assert original_cart_item_count >= 1  # cart has the item we added

    # Fail the next commit (which will be the create_order commit)
    original_commit = Session.commit
    fired = {"done": False}

    def failing_commit(self):
        if not fired["done"]:
            fired["done"] = True
            raise RuntimeError("simulated DB failure")
        return original_commit(self)

    monkeypatch.setattr(Session, "commit", failing_commit)

    # TestClient re-raises unhandled exceptions by default; the route does
    # `try/except → rollback → raise`, so we must catch it here.
    with pytest.raises(RuntimeError, match="simulated DB failure"):
        client.post("/api/orders", headers={
            "Authorization": f"Bearer {user_token}",
        }, json={"shipping_address": "Addr", "phone": "0900000000"})

    assert fired["done"], "expected first commit to be intercepted"

    # Restore commit so subsequent reads work normally
    monkeypatch.setattr(Session, "commit", original_commit)

    session.expire_all()
    refreshed_product = session.get(Product, product.id)
    assert refreshed_product.stock == original_stock

    assert len(session.exec(select(Order)).all()) == original_order_count
    assert len(session.exec(select(OrderItem)).all()) == original_item_count
    assert len(session.exec(select(CartItem)).all()) == original_cart_item_count


def test_cancel_order_restores_stock_atomically(
    client: TestClient, user_token: str, admin_token: str, product: Product, session: Session
):
    """Cancelling an order must restore stock and update status in one transaction."""
    _add_to_cart(client, user_token, product.id, 3)
    create_res = client.post("/api/orders", headers={
        "Authorization": f"Bearer {user_token}",
    }, json={"shipping_address": "Addr", "phone": "0900000000"})
    assert create_res.status_code == 201
    order_id = create_res.json()["id"]

    session.expire_all()
    stock_after_create = session.get(Product, product.id).stock

    cancel_res = client.put(f"/api/orders/{order_id}/status", headers={
        "Authorization": f"Bearer {admin_token}",
    }, json={"status": "CANCELLED"})
    assert cancel_res.status_code == 200
    assert cancel_res.json()["status"] == "CANCELLED"

    session.expire_all()
    stock_after_cancel = session.get(Product, product.id).stock
    assert stock_after_cancel == stock_after_create + 3


# ─────────────────────────────────────────────
# Stock atomicity tests (PR #3)
# ─────────────────────────────────────────────


def test_decrement_stock_if_available_atomic(session: Session, product: Product):
    """Conditional UPDATE: succeeds when stock sufficient, fails when not."""
    from app.repositories.product_repository import ProductRepository

    product.stock = 1
    session.add(product)
    session.commit()

    repo = ProductRepository(session)

    # First decrement succeeds
    assert repo.decrement_stock_if_available(product.id, 1) is True
    session.commit()
    session.expire_all()
    assert session.get(Product, product.id).stock == 0

    # Second decrement fails — stock is 0
    assert repo.decrement_stock_if_available(product.id, 1) is False
    session.commit()
    session.expire_all()
    assert session.get(Product, product.id).stock == 0  # unchanged


def test_decrement_stock_rejects_when_quantity_exceeds(session: Session, product: Product):
    from app.repositories.product_repository import ProductRepository

    product.stock = 2
    session.add(product)
    session.commit()

    repo = ProductRepository(session)
    assert repo.decrement_stock_if_available(product.id, 5) is False
    session.commit()
    session.expire_all()
    assert session.get(Product, product.id).stock == 2  # unchanged


def test_increment_stock_restores_correctly(session: Session, product: Product):
    from app.repositories.product_repository import ProductRepository

    product.stock = 5
    session.add(product)
    session.commit()

    repo = ProductRepository(session)
    repo.increment_stock(product.id, 3)
    session.commit()
    session.expire_all()
    assert session.get(Product, product.id).stock == 8


def test_create_order_rolls_back_when_stock_race_lost(
    client: TestClient, user_token: str, product: Product, session: Session, monkeypatch
):
    """Simulate a concurrent purchase: cart pre-check passes, but between
    pre-check and conditional UPDATE the stock is gone → must 409 + rollback."""
    from sqlmodel import select
    from app.models.order import Order, OrderItem
    from app.repositories import product_repository as repo_module

    _add_to_cart(client, user_token, product.id, 2)

    # Stock is 50 (fixture). Pre-check will pass. Patch decrement to always fail,
    # simulating a competing transaction that drained stock first.
    original_decrement = repo_module.ProductRepository.decrement_stock_if_available

    def always_lose_race(self, product_id, quantity):
        return False

    monkeypatch.setattr(
        repo_module.ProductRepository,
        "decrement_stock_if_available",
        always_lose_race,
    )

    original_order_count = len(session.exec(select(Order)).all())
    original_item_count = len(session.exec(select(OrderItem)).all())
    original_stock = product.stock

    response = client.post("/api/orders", headers={
        "Authorization": f"Bearer {user_token}",
    }, json={"shipping_address": "Addr", "phone": "0900000000"})

    assert response.status_code == 409
    assert "Stock changed" in response.json()["detail"]

    monkeypatch.setattr(
        repo_module.ProductRepository,
        "decrement_stock_if_available",
        original_decrement,
    )

    session.expire_all()
    # No order/item persisted, stock unchanged
    assert len(session.exec(select(Order)).all()) == original_order_count
    assert len(session.exec(select(OrderItem)).all()) == original_item_count
    assert session.get(Product, product.id).stock == original_stock
