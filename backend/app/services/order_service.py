import json
import logging
import math
from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException, status
from sqlmodel import Session

from app.models.order import Order, OrderItem
from app.models.user import User
from app.repositories.cart_repository import CartItemRepository, CartRepository
from app.repositories.order_repository import OrderItemRepository, OrderRepository
from app.repositories.product_repository import ProductRepository
from app.repositories.user_repository import UserRepository
from app.schemas.common import PaginatedResponse
from app.schemas.order import OrderCreate, OrderResponse, OrderItemResponse, OrderStatusUpdate
from app.services.audit_service import log_action
from app.services.email_service import send_order_confirmation, send_status_update

logger = logging.getLogger("techsphere")

VALID_STATUSES = ["PENDING", "CONFIRMED", "SHIPPING", "COMPLETED", "CANCELLED"]


def _build_order_response(order: Order, session: Session) -> OrderResponse:
    item_repo = OrderItemRepository(session)
    items = item_repo.find_by_order_id(order.id)

    order_items = [
        OrderItemResponse(
            id=item.id,
            product_id=item.product_id,
            product_name=item.product_name,
            image_url=item.image_url,
            price=item.price,
            sale_price=item.sale_price,
            quantity=item.quantity,
            subtotal=item.subtotal,
        )
        for item in items
    ]

    return OrderResponse(
        id=order.id,
        user_id=order.user_id,
        total_amount=order.total_amount,
        status=order.status,
        payment_method=order.payment_method,
        payment_status=order.payment_status,
        shipping_address=order.shipping_address,
        phone=order.phone,
        note=order.note,
        items=order_items,
        created_at=order.created_at,
        updated_at=order.updated_at,
    )


def create_order(
    current_user: User,
    data: OrderCreate,
    session: Session,
) -> OrderResponse:
    cart_repo = CartRepository(session)
    cart_item_repo = CartItemRepository(session)
    product_repo = ProductRepository(session)
    order_repo = OrderRepository(session)
    order_item_repo = OrderItemRepository(session)

    cart = cart_repo.find_by_user_id(current_user.id)
    if not cart:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cart not found"
        )

    cart_items = cart_item_repo.find_by_cart_id(cart.id)
    if not cart_items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cart is empty"
        )

    total_amount = 0.0
    order_items_data = []

    for cart_item in cart_items:
        product = product_repo.find_by_id(cart_item.product_id)
        if not product:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Product {cart_item.product_id} not found"
            )

        if product.status != "ACTIVE":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Product {product.name} is not available"
            )

        if product.stock < cart_item.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Not enough stock for {product.name}. Available: {product.stock}"
            )

        price = product.sale_price if product.sale_price else product.price
        subtotal = price * cart_item.quantity
        total_amount += subtotal

        order_items_data.append({
            "product_id": product.id,
            "product_name": product.name,
            "image_url": product.image_url,
            "price": product.price,
            "sale_price": product.sale_price,
            "quantity": cart_item.quantity,
            "subtotal": subtotal,
        })

    order = Order(
        user_id=current_user.id,
        total_amount=total_amount,
        status="PENDING",
        payment_method=data.payment_method if data.payment_method in ("COD", "VNPAY") else "COD",
        payment_status="UNPAID" if data.payment_method == "VNPAY" else "UNPAID",
        shipping_address=data.shipping_address,
        phone=data.phone,
        note=data.note,
    )
    order = order_repo.create(order)

    created_items = []
    for item_data in order_items_data:
        order_item = OrderItem(order_id=order.id, **item_data)
        order_item = order_item_repo.create(order_item)
        created_items.append(order_item)

    for cart_item in cart_items:
        product = product_repo.find_by_id(cart_item.product_id)
        if product:
            product.stock -= cart_item.quantity
            product_repo.update(product)
        cart_item_repo.delete(cart_item)

    order_response = _build_order_response(order, session)

    try:
        send_order_confirmation(current_user, order, created_items)
    except Exception as e:
        logger.error(f"Email notification failed for order #{order.id}: {e}")

    return order_response


def get_user_orders(current_user: User, session: Session, page: int = 1, limit: int = 10, status: str | None = None) -> PaginatedResponse[OrderResponse]:
    order_repo = OrderRepository(session)
    orders, total = order_repo.find_all_by_user_id(current_user.id, page=page, limit=limit, status=status)
    total_pages = math.ceil(total / limit) if total > 0 else 0

    items = [_build_order_response(order, session) for order in orders]

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages,
    )


def get_all_orders(session: Session, page: int = 1, limit: int = 10, status: str | None = None) -> PaginatedResponse[OrderResponse]:
    order_repo = OrderRepository(session)
    orders, total = order_repo.find_all(page=page, limit=limit, status=status)
    total_pages = math.ceil(total / limit) if total > 0 else 0

    items = [_build_order_response(order, session) for order in orders]

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages,
    )


def get_order_by_id(
    current_user: User,
    order_id: int,
    session: Session,
    is_admin: bool = False,
) -> OrderResponse:
    order_repo = OrderRepository(session)
    order = order_repo.find_by_id(order_id)

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )

    if not is_admin and order.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this order"
        )

    return _build_order_response(order, session)


def update_order_status(
    order_id: int,
    data: OrderStatusUpdate,
    session: Session,
    admin_user: Optional[User] = None,
) -> OrderResponse:
    if data.status not in VALID_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Must be one of: {', '.join(VALID_STATUSES)}"
        )

    order_repo = OrderRepository(session)
    order = order_repo.find_by_id(order_id)

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )

    old_status = order.status
    order.status = data.status
    order.updated_at = datetime.now(timezone.utc)
    order_repo.update(order)

    order_response = _build_order_response(order, session)

    if old_status != data.status:
        if admin_user:
            log_action(
                session, admin_user.id, "UPDATE", "ORDER", order.id,
                json.dumps({"old_status": old_status, "new_status": data.status}),
            )
        try:
            user_repo = UserRepository(session)
            order_user = user_repo.find_by_id(order.user_id)
            if order_user:
                send_status_update(order_user, order, old_status, data.status)
        except Exception as e:
            logger.error(f"Email notification failed for order #{order.id} status update: {e}")

    return order_response
