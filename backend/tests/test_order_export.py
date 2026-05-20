import csv
import io
from datetime import datetime, timezone, timedelta

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.models.brand import Brand
from app.models.category import Category
from app.models.order import Order, OrderItem
from app.models.product import Product
from app.models.user import User


def _create_order_in_db(
    session: Session,
    user: User,
    category: Category,
    brand: Brand,
    status: str = "PENDING",
    created_at: datetime | None = None,
) -> Order:
    product = Product(
        name=f"Test Product {user.id}",
        slug=f"test-product-{user.id}-{datetime.now().timestamp()}",
        price=1000000,
        stock=50,
        status="ACTIVE",
        category_id=category.id,
        brand_id=brand.id,
    )
    session.add(product)
    session.commit()
    session.refresh(product)

    order = Order(
        user_id=user.id,
        total_amount=2000000,
        status=status,
        payment_method="COD",
        payment_status="UNPAID",
        shipping_address="123 Test Street",
        phone="0900000000",
        note="Test note",
    )
    if created_at:
        order.created_at = created_at
    session.add(order)
    session.commit()
    session.refresh(order)

    item = OrderItem(
        order_id=order.id,
        product_id=product.id,
        product_name=product.name,
        price=product.price,
        quantity=2,
        subtotal=2000000,
    )
    session.add(item)
    session.commit()

    return order


def _parse_csv(response) -> tuple[list[str], list[dict]]:
    content = response.content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(content))
    return reader.fieldnames or [], list(reader)


def test_export_empty(client: TestClient, admin_token: str):
    response = client.get(
        "/api/admin/orders/export",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")
    assert "attachment" in response.headers.get("content-disposition", "")

    headers, rows = _parse_csv(response)
    assert "order_id" in headers
    assert "customer_name" in headers
    assert len(rows) == 0


def test_export_all(
    client: TestClient, session: Session, admin_token: str,
    admin_user: User, test_user: User,
    category: Category, brand: Brand,
):
    _create_order_in_db(session, admin_user, category, brand)
    _create_order_in_db(session, test_user, category, brand)

    response = client.get(
        "/api/admin/orders/export",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200

    headers, rows = _parse_csv(response)
    assert len(rows) == 2
    assert all("order_id" in row for row in rows)
    assert all("customer_name" in row for row in rows)


def test_export_by_date_range(
    client: TestClient, session: Session, admin_token: str,
    admin_user: User, category: Category, brand: Brand,
):
    old_date = datetime.now(timezone.utc) - timedelta(days=30)
    _create_order_in_db(session, admin_user, category, brand, created_at=old_date)
    _create_order_in_db(session, admin_user, category, brand)

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%d")

    response = client.get(
        f"/api/admin/orders/export?from={yesterday}&to={today}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200

    _, rows = _parse_csv(response)
    assert len(rows) == 1


def test_export_by_status(
    client: TestClient, session: Session, admin_token: str,
    admin_user: User, category: Category, brand: Brand,
):
    _create_order_in_db(session, admin_user, category, brand, status="PENDING")
    _create_order_in_db(session, admin_user, category, brand, status="COMPLETED")

    response = client.get(
        "/api/admin/orders/export?status=COMPLETED",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200

    _, rows = _parse_csv(response)
    assert len(rows) == 1
    assert rows[0]["order_status"] == "COMPLETED"


def test_export_combined_filter(
    client: TestClient, session: Session, admin_token: str,
    admin_user: User, category: Category, brand: Brand,
):
    old_completed = datetime.now(timezone.utc) - timedelta(days=30)
    _create_order_in_db(session, admin_user, category, brand, status="COMPLETED", created_at=old_completed)
    _create_order_in_db(session, admin_user, category, brand, status="PENDING")
    _create_order_in_db(session, admin_user, category, brand, status="COMPLETED")

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%d")

    response = client.get(
        f"/api/admin/orders/export?from={yesterday}&to={today}&status=COMPLETED",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200

    _, rows = _parse_csv(response)
    assert len(rows) == 1


def test_export_invalid_status(client: TestClient, admin_token: str):
    response = client.get(
        "/api/admin/orders/export?status=INVALID",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 400
    assert "Invalid status" in response.json()["detail"]


def test_export_requires_admin(client: TestClient, user_token: str):
    response = client.get(
        "/api/admin/orders/export",
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert response.status_code == 403


def test_export_requires_auth(client: TestClient):
    response = client.get("/api/admin/orders/export")
    assert response.status_code == 401


def test_export_csv_format(
    client: TestClient, session: Session, admin_token: str,
    admin_user: User, category: Category, brand: Brand,
):
    _create_order_in_db(session, admin_user, category, brand)

    response = client.get(
        "/api/admin/orders/export",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200

    headers, rows = _parse_csv(response)
    expected_headers = [
        "order_id", "order_date", "customer_name", "customer_email",
        "customer_phone", "shipping_address", "payment_method",
        "payment_status", "order_status", "product_name", "price",
        "sale_price", "quantity", "subtotal", "total_amount", "note",
    ]
    assert headers == expected_headers
    assert len(rows) == 1

    row = rows[0]
    assert row["customer_name"] == admin_user.full_name
    assert row["customer_email"] == admin_user.email
    assert row["customer_phone"] == "0900000000"
    assert row["shipping_address"] == "123 Test Street"
    assert row["payment_method"] == "COD"
    assert row["order_status"] == "PENDING"
    assert row["product_name"] == f"Test Product {admin_user.id}"
    assert row["quantity"] == "2"
    assert row["subtotal"] == "2000000.0"
    assert row["total_amount"] == "2000000.0"
    assert row["note"] == "Test note"


def test_export_unicode_content(
    client: TestClient, session: Session, admin_token: str,
    admin_user: User, category: Category, brand: Brand,
):
    _create_order_in_db(session, admin_user, category, brand)

    response = client.get(
        "/api/admin/orders/export",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 200

    content = response.content
    assert content.startswith(b"\xef\xbb\xbf")

    decoded = content.decode("utf-8-sig")
    assert "order_id" in decoded
