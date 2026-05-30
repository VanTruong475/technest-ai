from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.models.order import Order, OrderItem
from app.models.product import Product
from app.models.review import Review
from app.models.user import User


def _create_order(
    session: Session,
    user: User,
    status: str = "COMPLETED",
    total: float = 100000,
    created_at: datetime | None = None,
    payment_status: str = "PAID",
) -> Order:
    order = Order(
        user_id=user.id,
        total_amount=total,
        status=status,
        payment_status=payment_status,
        shipping_address="123 Test St",
        phone="0900000000",
        created_at=created_at or datetime.now(timezone.utc),
    )
    session.add(order)
    session.commit()
    session.refresh(order)
    return order


def _create_order_item(
    session: Session,
    order: Order,
    product: Product,
    quantity: int = 1,
    subtotal: float = 100000,
) -> OrderItem:
    item = OrderItem(
        order_id=order.id,
        product_id=product.id,
        product_name=product.name,
        price=product.price,
        sale_price=product.sale_price,
        quantity=quantity,
        subtotal=subtotal,
    )
    session.add(item)
    session.commit()
    session.refresh(item)
    return item


def _create_review(
    session: Session,
    user: User,
    product: Product,
    rating: int = 5,
) -> Review:
    review = Review(
        user_id=user.id,
        product_id=product.id,
        rating=rating,
        comment="Good product",
    )
    session.add(review)
    session.commit()
    session.refresh(review)
    return review


# --- Authorization tests ---


def test_stats_requires_auth(client: TestClient) -> None:
    response = client.get("/api/admin/stats")
    assert response.status_code == 401


def test_stats_requires_admin(client: TestClient, user_token: str) -> None:
    response = client.get("/api/admin/stats", headers={"Authorization": f"Bearer {user_token}"})
    assert response.status_code == 403


# --- Empty state tests ---


def test_stats_empty_database(client: TestClient, admin_token: str) -> None:
    response = client.get("/api/admin/stats", headers={"Authorization": f"Bearer {admin_token}"})
    assert response.status_code == 200
    data = response.json()

    # admin_user exists in DB (created by admin_token fixture)
    assert data["summary"]["total_users"] == 1
    assert data["summary"]["total_products"] == 0
    assert data["summary"]["total_orders"] == 0
    assert data["summary"]["total_revenue"] == 0
    assert data["summary"]["pending_orders"] == 0
    assert data["summary"]["low_stock_products"] == 0
    assert data["summary"]["out_of_stock_products"] == 0
    assert data["summary"]["total_reviews"] == 0
    assert data["summary"]["average_rating"] == 0
    assert data["charts"]["revenue_by_day"] == []
    assert data["charts"]["orders_by_status"] == []
    assert data["recent_orders"] == []
    assert data["top_products"] == []


# --- Summary tests ---


def test_stats_summary_counts(
    client: TestClient,
    admin_token: str,
    session: Session,
    admin_user: User,
    test_user: User,
    product: Product,
    product2: Product,
) -> None:
    # Create orders with different statuses
    order1 = _create_order(session, test_user, status="COMPLETED", total=200000)
    _create_order_item(session, order1, product, quantity=2, subtotal=400000)
    _create_order(session, test_user, status="PENDING", total=100000)
    _create_order(session, test_user, status="CANCELLED", total=50000)

    # Create review
    _create_review(session, test_user, product, rating=4)
    _create_review(session, admin_user, product, rating=5)

    # Set low stock on product2
    product2.stock = 5
    session.add(product2)
    session.commit()

    response = client.get("/api/admin/stats", headers={"Authorization": f"Bearer {admin_token}"})
    assert response.status_code == 200
    data = response.json()

    assert data["summary"]["total_users"] == 2  # admin + test_user
    assert data["summary"]["total_products"] == 2
    assert data["summary"]["total_orders"] == 3
    assert data["summary"]["total_revenue"] == 300000  # excludes cancelled
    assert data["summary"]["pending_orders"] == 1
    assert data["summary"]["low_stock_products"] == 1  # product2 with stock=5
    assert data["summary"]["out_of_stock_products"] == 0
    assert data["summary"]["total_reviews"] == 2
    assert data["summary"]["average_rating"] == 4.5


def test_stats_out_of_stock(
    client: TestClient,
    admin_token: str,
    session: Session,
    product: Product,
) -> None:
    product.stock = 0
    session.add(product)
    session.commit()

    response = client.get("/api/admin/stats", headers={"Authorization": f"Bearer {admin_token}"})
    data = response.json()

    assert data["summary"]["out_of_stock_products"] == 1
    assert data["summary"]["low_stock_products"] == 0


# --- Charts tests ---


def test_stats_orders_by_status(
    client: TestClient,
    admin_token: str,
    session: Session,
    test_user: User,
) -> None:
    _create_order(session, test_user, status="PENDING")
    _create_order(session, test_user, status="PENDING")
    _create_order(session, test_user, status="COMPLETED")
    _create_order(session, test_user, status="CANCELLED")

    response = client.get("/api/admin/stats", headers={"Authorization": f"Bearer {admin_token}"})
    data = response.json()

    status_map = {s["status"]: s["count"] for s in data["charts"]["orders_by_status"]}
    assert status_map["PENDING"] == 2
    assert status_map["COMPLETED"] == 1
    assert status_map["CANCELLED"] == 1


# --- Recent orders tests ---


def test_stats_recent_orders(
    client: TestClient,
    admin_token: str,
    session: Session,
    test_user: User,
) -> None:
    # Use explicit timestamps to ensure deterministic ordering
    base = datetime(2026, 5, 1, tzinfo=timezone.utc)
    for i in range(7):
        _create_order(
            session,
            test_user,
            status="COMPLETED",
            total=(i + 1) * 100000,
            created_at=base + timedelta(days=i),
        )

    response = client.get("/api/admin/stats", headers={"Authorization": f"Bearer {admin_token}"})
    data = response.json()

    assert len(data["recent_orders"]) == 5  # capped at 5
    # Should be newest first (highest amount = latest created_at)
    amounts = [o["total_amount"] for o in data["recent_orders"]]
    assert amounts == sorted(amounts, reverse=True)


# --- Top products tests ---


def test_stats_top_products(
    client: TestClient,
    admin_token: str,
    session: Session,
    test_user: User,
    product: Product,
    product2: Product,
) -> None:
    # product: 5 units sold, product2: 2 units sold
    order1 = _create_order(session, test_user, status="COMPLETED")
    _create_order_item(session, order1, product, quantity=3, subtotal=90000000)
    _create_order_item(session, order1, product2, quantity=2, subtotal=11980000)

    order2 = _create_order(session, test_user, status="COMPLETED")
    _create_order_item(session, order2, product, quantity=2, subtotal=60000000)

    response = client.get("/api/admin/stats", headers={"Authorization": f"Bearer {admin_token}"})
    data = response.json()

    assert len(data["top_products"]) == 2
    # product should be first (5 units > 2 units)
    assert data["top_products"][0]["product_id"] == product.id
    assert data["top_products"][0]["total_quantity"] == 5
    assert data["top_products"][0]["product_name"] == product.name
    assert data["top_products"][1]["product_id"] == product2.id
    assert data["top_products"][1]["total_quantity"] == 2


# --- Response structure test ---


def test_stats_response_structure(
    client: TestClient,
    admin_token: str,
    session: Session,
    test_user: User,
    product: Product,
) -> None:
    order = _create_order(session, test_user, status="COMPLETED")
    _create_order_item(session, order, product, quantity=1, subtotal=100000)
    _create_review(session, test_user, product, rating=5)

    response = client.get("/api/admin/stats", headers={"Authorization": f"Bearer {admin_token}"})
    data = response.json()

    # Verify all top-level keys exist
    assert "summary" in data
    assert "charts" in data
    assert "recent_orders" in data
    assert "top_products" in data

    # Verify summary fields
    summary_keys = {
        "total_users", "total_products", "total_orders", "total_revenue",
        "pending_orders", "low_stock_products", "out_of_stock_products",
        "total_reviews", "average_rating",
    }
    assert set(data["summary"].keys()) == summary_keys

    # Verify charts fields
    assert "revenue_by_day" in data["charts"]
    assert "orders_by_status" in data["charts"]

    # Verify recent_orders fields
    assert len(data["recent_orders"]) > 0
    order_keys = {"id", "user_id", "total_amount", "status", "created_at"}
    assert set(data["recent_orders"][0].keys()) == order_keys

    # Verify top_products fields
    assert len(data["top_products"]) > 0
    product_keys = {"product_id", "product_name", "total_quantity", "total_revenue"}
    assert set(data["top_products"][0].keys()) == product_keys
