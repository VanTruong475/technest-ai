import hashlib
import hmac
from datetime import datetime, timezone
from unittest.mock import patch
from urllib.parse import urlencode, quote

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.models.product import Product


def _add_to_cart(client: TestClient, token: str, product_id: int, quantity: int = 1):
    client.post("/api/cart/items", headers={
        "Authorization": f"Bearer {token}",
    }, json={"product_id": product_id, "quantity": quantity})


def _create_order(client: TestClient, token: str, product: Product) -> int:
    _add_to_cart(client, token, product.id, 1)
    res = client.post("/api/orders", headers={
        "Authorization": f"Bearer {token}",
    }, json={"shipping_address": "Addr", "phone": "0900000000"})
    return res.json()["id"]


def _build_vnpay_return_url(order_id: int, response_code: str = "00", secret: str = "test_secret") -> str:
    """Build a valid VNPay return URL with proper HMAC-SHA512 hash.
    Uses raw values for hash (same logic as vnpay_service._build_hash_data)."""
    timestamp = int(datetime.now(timezone.utc).timestamp())
    params = {
        "vnp_Version": "2.1.0",
        "vnp_Command": "pay",
        "vnp_TmnCode": "test_tmn",
        "vnp_Amount": "2749000000",
        "vnp_CurrCode": "VND",
        "vnp_TxnRef": f"order_{order_id}_{timestamp}",
        "vnp_OrderInfo": f"Thanh toan don hang #{order_id}",
        "vnp_OrderType": "other",
        "vnp_Locale": "vn",
        "vnp_ReturnUrl": "http://localhost:8000/api/payments/vnpay-return",
        "vnp_IpAddr": "127.0.0.1",
        "vnp_CreateDate": datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S"),
        "vnp_ResponseCode": response_code,
        "vnp_TransactionNo": "123456",
        "vnp_BankCode": "NCB",
        "vnp_PayDate": datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S"),
    }

    sorted_params = sorted(params.items())
    # Hash from raw values (no URL encoding) - matches vnpay_service logic
    hash_data = "&".join(f"{k}={v}" for k, v in sorted_params)
    secure_hash = hmac.new(
        secret.encode(),
        hash_data.encode(),
        hashlib.sha512,
    ).hexdigest()

    query_string = urlencode(sorted_params, quote_via=quote)
    return f"?{query_string}&vnp_SecureHash={secure_hash}"


@patch("app.core.config.settings.VNPAY_TMN_CODE", "test_tmn")
@patch("app.core.config.settings.VNPAY_HASH_SECRET", "test_secret")
@patch("app.core.config.settings.VNPAY_PAYMENT_URL", "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html")
@patch("app.core.config.settings.VNPAY_RETURN_URL", "http://localhost:8000/api/payments/vnpay-return")
def test_create_vnpay_payment(client: TestClient, user_token: str, product: Product):
    order_id = _create_order(client, user_token, product)

    response = client.post(f"/api/orders/{order_id}/payment/vnpay", headers={
        "Authorization": f"Bearer {user_token}",
    })
    assert response.status_code == 200
    data = response.json()
    assert "payment_url" in data
    assert "sandbox.vnpayment.vn" in data["payment_url"]
    assert f"order_{order_id}" in data["payment_url"]


@patch("app.core.config.settings.VNPAY_TMN_CODE", "test_tmn")
@patch("app.core.config.settings.VNPAY_HASH_SECRET", "test_secret")
@patch("app.core.config.settings.VNPAY_PAYMENT_URL", "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html")
@patch("app.core.config.settings.VNPAY_RETURN_URL", "http://localhost:8000/api/payments/vnpay-return")
def test_create_vnpay_payment_not_owner(
    client: TestClient, user_token: str, admin_token: str, product: Product
):
    order_id = _create_order(client, user_token, product)

    # Another user (admin can access, but a second user cannot)
    response = client.post(f"/api/orders/{order_id}/payment/vnpay", headers={
        "Authorization": f"Bearer {admin_token}",
    })
    # Admin is allowed (owner check is user_id != current_user AND role != ADMIN)
    assert response.status_code == 200


@patch("app.core.config.settings.VNPAY_TMN_CODE", "test_tmn")
@patch("app.core.config.settings.VNPAY_HASH_SECRET", "test_secret")
@patch("app.core.config.settings.VNPAY_PAYMENT_URL", "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html")
@patch("app.core.config.settings.VNPAY_RETURN_URL", "http://localhost:8000/api/payments/vnpay-return")
def test_create_vnpay_payment_already_paid(
    client: TestClient, user_token: str, product: Product, session: Session
):
    order_id = _create_order(client, user_token, product)

    # Pay the order first
    client.post(f"/api/orders/{order_id}/payment/vnpay", headers={
        "Authorization": f"Bearer {user_token}",
    })

    # Manually set payment_status to PAID in DB
    from app.models.order import Order
    order = session.get(Order, order_id)
    order.payment_status = "PAID"
    session.add(order)
    session.commit()

    # Try to create payment again
    response = client.post(f"/api/orders/{order_id}/payment/vnpay", headers={
        "Authorization": f"Bearer {user_token}",
    })
    assert response.status_code == 400
    assert "already paid" in response.json()["detail"]


@patch("app.core.config.settings.VNPAY_HASH_SECRET", "test_secret")
@patch("app.core.config.settings.FRONTEND_URL", "http://localhost:5173")
def test_vnpay_return_success(client: TestClient, user_token: str, product: Product, session: Session):
    order_id = _create_order(client, user_token, product)

    # Set payment_status to PENDING
    from app.models.order import Order
    order = session.get(Order, order_id)
    order.payment_method = "VNPAY"
    order.payment_status = "PENDING"
    session.add(order)
    session.commit()

    return_url = _build_vnpay_return_url(order_id, response_code="00", secret="test_secret")
    response = client.get(f"/api/payments/vnpay-return{return_url}", follow_redirects=False)

    assert response.status_code == 302
    assert "status=success" in response.headers["location"]
    assert f"order_id={order_id}" in response.headers["location"]

    session.refresh(order)
    assert order.payment_status == "PAID"


@patch("app.core.config.settings.VNPAY_HASH_SECRET", "test_secret")
@patch("app.core.config.settings.FRONTEND_URL", "http://localhost:5173")
def test_vnpay_return_failure(client: TestClient, user_token: str, product: Product, session: Session):
    order_id = _create_order(client, user_token, product)

    from app.models.order import Order
    order = session.get(Order, order_id)
    order.payment_method = "VNPAY"
    order.payment_status = "PENDING"
    session.add(order)
    session.commit()

    return_url = _build_vnpay_return_url(order_id, response_code="24", secret="test_secret")
    response = client.get(f"/api/payments/vnpay-return{return_url}", follow_redirects=False)

    assert response.status_code == 302
    assert "status=failed" in response.headers["location"]
    assert f"order_id={order_id}" in response.headers["location"]

    session.refresh(order)
    assert order.payment_status == "FAILED"


@patch("app.core.config.settings.VNPAY_HASH_SECRET", "test_secret")
@patch("app.core.config.settings.FRONTEND_URL", "http://localhost:5173")
def test_vnpay_return_invalid_hash(client: TestClient, user_token: str, product: Product, session: Session):
    order_id = _create_order(client, user_token, product)

    from app.models.order import Order
    order = session.get(Order, order_id)
    order.payment_method = "VNPAY"
    order.payment_status = "PENDING"
    session.add(order)
    session.commit()

    # Build return URL with wrong secret
    return_url = _build_vnpay_return_url(order_id, response_code="00", secret="wrong_secret")
    response = client.get(f"/api/payments/vnpay-return{return_url}", follow_redirects=False)

    assert response.status_code == 302
    assert "status=failed" in response.headers["location"]
    assert "reason=invalid" in response.headers["location"]

    # Payment status should remain PENDING (not updated)
    session.refresh(order)
    assert order.payment_status == "PENDING"
