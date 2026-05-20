import json

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.models.brand import Brand
from app.models.category import Category
from app.models.order import Order, OrderItem
from app.models.product import Product
from app.models.user import User


def _create_product_via_api(client: TestClient, admin_token: str, category: Category, brand: Brand, name: str = "Test Product") -> dict:
    response = client.post(
        "/api/products",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "name": name,
            "slug": name.lower().replace(" ", "-"),
            "category_id": category.id,
            "brand_id": brand.id,
            "price": 1000000,
            "stock": 10,
            "status": "ACTIVE",
        },
    )
    return response.json()


def test_audit_log_on_product_create(
    client: TestClient, session: Session, admin_token: str,
    admin_user: User, category: Category, brand: Brand,
):
    _create_product_via_api(client, admin_token, category, brand, "New Phone")

    response = client.get(
        "/api/admin/audit-logs",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1

    create_log = next((l for l in data["items"] if l["action"] == "CREATE" and l["target_type"] == "PRODUCT"), None)
    assert create_log is not None
    assert create_log["user_id"] == admin_user.id
    assert create_log["user_name"] == admin_user.full_name
    assert create_log["target_id"] is not None


def test_audit_log_on_product_delete(
    client: TestClient, session: Session, admin_token: str,
    admin_user: User, category: Category, brand: Brand,
):
    product = _create_product_via_api(client, admin_token, category, brand, "Delete Me")

    client.delete(
        f"/api/products/{product['id']}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    response = client.get(
        "/api/admin/audit-logs?action=DELETE&target_type=PRODUCT",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1

    delete_log = data["items"][0]
    assert delete_log["action"] == "DELETE"
    assert delete_log["target_type"] == "PRODUCT"
    assert delete_log["target_id"] == product["id"]


def test_audit_log_on_order_status_change(
    client: TestClient, session: Session, admin_token: str,
    admin_user: User, test_user: User, category: Category, brand: Brand,
):
    product = Product(
        name="Order Product", slug="order-product",
        price=500000, stock=50, status="ACTIVE",
        category_id=category.id, brand_id=brand.id,
    )
    session.add(product)
    session.commit()
    session.refresh(product)

    order = Order(
        user_id=test_user.id, total_amount=500000,
        status="PENDING", payment_method="COD", payment_status="UNPAID",
        shipping_address="123 Test", phone="0900000000",
    )
    session.add(order)
    session.commit()
    session.refresh(order)

    item = OrderItem(
        order_id=order.id, product_id=product.id,
        product_name=product.name, price=product.price,
        quantity=1, subtotal=500000,
    )
    session.add(item)
    session.commit()

    client.put(
        f"/api/orders/{order.id}/status",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"status": "CONFIRMED"},
    )

    response = client.get(
        "/api/admin/audit-logs?action=UPDATE&target_type=ORDER",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1

    update_log = data["items"][0]
    assert update_log["action"] == "UPDATE"
    assert update_log["target_type"] == "ORDER"
    assert update_log["target_id"] == order.id
    details = json.loads(update_log["details"])
    assert details["old_status"] == "PENDING"
    assert details["new_status"] == "CONFIRMED"


def test_audit_log_on_export(
    client: TestClient, admin_token: str, admin_user: User,
):
    client.get(
        "/api/admin/orders/export",
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    response = client.get(
        "/api/admin/audit-logs?action=EXPORT",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1

    export_log = data["items"][0]
    assert export_log["action"] == "EXPORT"
    assert export_log["target_type"] == "ORDER"
    assert export_log["target_id"] is None


def test_audit_log_on_bulk_inventory(
    client: TestClient, session: Session, admin_token: str,
    admin_user: User, category: Category, brand: Brand,
):
    p1 = Product(name="P1", slug="p1-audit", price=100000, stock=5,
                 status="ACTIVE", category_id=category.id, brand_id=brand.id)
    p2 = Product(name="P2", slug="p2-audit", price=200000, stock=10,
                 status="ACTIVE", category_id=category.id, brand_id=brand.id)
    session.add(p1)
    session.add(p2)
    session.commit()
    session.refresh(p1)
    session.refresh(p2)

    client.put(
        "/api/products/bulk-update",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"items": [
            {"product_id": p1.id, "stock": 100},
            {"product_id": p2.id, "stock": 50},
        ]},
    )

    response = client.get(
        "/api/admin/audit-logs?action=UPDATE&target_type=INVENTORY",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1

    inv_log = data["items"][0]
    assert inv_log["action"] == "UPDATE"
    assert inv_log["target_type"] == "INVENTORY"
    assert inv_log["target_id"] is None
    details = json.loads(inv_log["details"])
    assert details["updated"] == 2


def test_audit_log_requires_admin(client: TestClient, user_token: str):
    response = client.get(
        "/api/admin/audit-logs",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert response.status_code == 403


def test_audit_log_requires_auth(client: TestClient):
    response = client.get("/api/admin/audit-logs")
    assert response.status_code == 401


def test_audit_log_pagination(
    client: TestClient, session: Session, admin_token: str,
    admin_user: User, category: Category, brand: Brand,
):
    for i in range(5):
        _create_product_via_api(client, admin_token, category, brand, f"Pag Product {i}")

    response = client.get(
        "/api/admin/audit-logs?page=1&limit=2",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 2
    assert data["total"] >= 5
    assert data["page"] == 1
    assert data["limit"] == 2
    assert data["total_pages"] >= 3


def test_audit_log_filter_by_target_type(
    client: TestClient, session: Session, admin_token: str,
    admin_user: User, category: Category, brand: Brand,
):
    _create_product_via_api(client, admin_token, category, brand, "Filter Product")

    response = client.get(
        "/api/admin/audit-logs?target_type=PRODUCT",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert all(log["target_type"] == "PRODUCT" for log in data["items"])


def test_audit_log_empty(client: TestClient, session: Session, admin_token: str):
    response = client.get(
        "/api/admin/audit-logs",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["items"] == []
    assert data["total"] == 0
