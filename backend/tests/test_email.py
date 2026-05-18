from unittest.mock import patch, MagicMock

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.models.product import Product
from app.models.user import User
from app.models.order import Order, OrderItem
from app.services.email_service import (
    send_order_confirmation,
    send_status_update,
    _is_configured,
)


# --- Helpers ---

def _add_to_cart(client: TestClient, token: str, product_id: int, quantity: int = 1):
    client.post("/api/cart/items", headers={
        "Authorization": f"Bearer {token}",
    }, json={"product_id": product_id, "quantity": quantity})


def _create_order(client: TestClient, token: str, product: Product) -> dict:
    _add_to_cart(client, token, product.id, 2)
    response = client.post("/api/orders", headers={
        "Authorization": f"Bearer {token}",
    }, json={
        "shipping_address": "123 Test St",
        "phone": "0900000000",
        "note": "Test order",
    })
    return response.json()


# --- Unit tests for email_service ---

@patch("app.services.email_service.resend")
@patch("app.services.email_service.settings")
def test_send_order_confirmation_success(mock_settings, mock_resend, test_user: User):
    mock_settings.EMAIL_ENABLED = True
    mock_settings.RESEND_API_KEY = "re_test"
    mock_settings.EMAIL_FROM = "test@resend.dev"

    order = Order(id=1, user_id=test_user.id, total_amount=100000, status="PENDING",
                  shipping_address="123 Test", phone="0900000000")
    items = [OrderItem(id=1, order_id=1, product_id=1, product_name="Test Product",
                       price=50000, quantity=2, subtotal=100000)]

    result = send_order_confirmation(test_user, order, items)
    assert result is True
    mock_resend.Emails.send.assert_called_once()


@patch("app.services.email_service.resend")
@patch("app.services.email_service.settings")
def test_send_status_update_success(mock_settings, mock_resend, test_user: User):
    mock_settings.EMAIL_ENABLED = True
    mock_settings.RESEND_API_KEY = "re_test"
    mock_settings.EMAIL_FROM = "test@resend.dev"

    order = Order(id=1, user_id=test_user.id, total_amount=100000, status="CONFIRMED",
                  shipping_address="123 Test", phone="0900000000")

    result = send_status_update(test_user, order, "PENDING", "CONFIRMED")
    assert result is True
    mock_resend.Emails.send.assert_called_once()


@patch("app.services.email_service.settings")
def test_send_email_disabled(mock_settings, test_user: User):
    mock_settings.EMAIL_ENABLED = False
    mock_settings.RESEND_API_KEY = ""

    order = Order(id=1, user_id=test_user.id, total_amount=100000, status="PENDING",
                  shipping_address="123 Test", phone="0900000000")
    items = []

    result = send_order_confirmation(test_user, order, items)
    assert result is False


@patch("app.services.email_service.resend")
@patch("app.services.email_service.settings")
def test_send_email_api_error(mock_settings, mock_resend, test_user: User):
    mock_settings.EMAIL_ENABLED = True
    mock_settings.RESEND_API_KEY = "re_test"
    mock_settings.EMAIL_FROM = "test@resend.dev"
    mock_resend.Emails.send.side_effect = Exception("API Error")

    order = Order(id=1, user_id=test_user.id, total_amount=100000, status="PENDING",
                  shipping_address="123 Test", phone="0900000000")
    items = []

    result = send_order_confirmation(test_user, order, items)
    assert result is False


@patch("app.services.email_service.settings")
def test_is_configured_true(mock_settings):
    mock_settings.EMAIL_ENABLED = True
    mock_settings.RESEND_API_KEY = "re_test"
    assert _is_configured() is True


@patch("app.services.email_service.settings")
def test_is_configured_false_no_key(mock_settings):
    mock_settings.EMAIL_ENABLED = True
    mock_settings.RESEND_API_KEY = ""
    assert _is_configured() is False


@patch("app.services.email_service.settings")
def test_is_configured_false_disabled(mock_settings):
    mock_settings.EMAIL_ENABLED = False
    mock_settings.RESEND_API_KEY = "re_test"
    assert _is_configured() is False


# --- Integration tests: order creation with email ---

@patch("app.services.email_service.resend")
@patch("app.services.email_service.settings")
def test_order_creation_sends_email(mock_settings, mock_resend, client: TestClient, user_token: str, product: Product):
    mock_settings.EMAIL_ENABLED = True
    mock_settings.RESEND_API_KEY = "re_test"
    mock_settings.EMAIL_FROM = "test@resend.dev"

    _create_order(client, user_token, product)
    mock_resend.Emails.send.assert_called_once()


@patch("app.services.email_service.resend")
@patch("app.services.email_service.settings")
def test_order_creation_email_failure_doesnt_fail_order(mock_settings, mock_resend, client: TestClient, user_token: str, product: Product):
    mock_settings.EMAIL_ENABLED = True
    mock_settings.RESEND_API_KEY = "re_test"
    mock_settings.EMAIL_FROM = "test@resend.dev"
    mock_resend.Emails.send.side_effect = Exception("API Error")

    _add_to_cart(client, user_token, product.id, 1)
    response = client.post("/api/orders", headers={
        "Authorization": f"Bearer {user_token}",
    }, json={
        "shipping_address": "123 Test St",
        "phone": "0900000000",
    })
    assert response.status_code == 201


@patch("app.services.email_service.settings")
def test_order_creation_no_email_when_disabled(mock_settings, client: TestClient, user_token: str, product: Product):
    mock_settings.EMAIL_ENABLED = False
    mock_settings.RESEND_API_KEY = ""

    _add_to_cart(client, user_token, product.id, 1)
    response = client.post("/api/orders", headers={
        "Authorization": f"Bearer {user_token}",
    }, json={
        "shipping_address": "123 Test St",
        "phone": "0900000000",
    })
    assert response.status_code == 201


# --- Integration tests: status update with email ---

@patch("app.services.email_service.resend")
@patch("app.services.email_service.settings")
def test_status_update_sends_email(mock_settings, mock_resend, client: TestClient, admin_token: str, user_token: str, product: Product):
    mock_settings.EMAIL_ENABLED = True
    mock_settings.RESEND_API_KEY = "re_test"
    mock_settings.EMAIL_FROM = "test@resend.dev"

    order_data = _create_order(client, user_token, product)
    order_id = order_data["id"]

    response = client.put(f"/api/orders/{order_id}/status", headers={
        "Authorization": f"Bearer {admin_token}",
    }, json={"status": "CONFIRMED"})
    assert response.status_code == 200
    assert mock_resend.Emails.send.call_count == 2  # confirmation + status update


@patch("app.services.email_service.resend")
@patch("app.services.email_service.settings")
def test_status_update_same_status_no_email(mock_settings, mock_resend, client: TestClient, admin_token: str, user_token: str, product: Product):
    mock_settings.EMAIL_ENABLED = True
    mock_settings.RESEND_API_KEY = "re_test"
    mock_settings.EMAIL_FROM = "test@resend.dev"

    order_data = _create_order(client, user_token, product)
    order_id = order_data["id"]

    # Update to same status
    response = client.put(f"/api/orders/{order_id}/status", headers={
        "Authorization": f"Bearer {admin_token}",
    }, json={"status": "PENDING"})
    assert response.status_code == 200
    assert mock_resend.Emails.send.call_count == 1  # only confirmation
