import json
import logging
import math
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import update
from sqlmodel import Session

from app.models.order import Order, OrderItem
from app.models.product import Product
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

VALID_TRANSITIONS = {
    "PENDING": ["CONFIRMED", "CANCELLED"],
    "CONFIRMED": ["SHIPPING", "CANCELLED"],
    "SHIPPING": ["COMPLETED", "CANCELLED"],
    "COMPLETED": [],
    "CANCELLED": [],
}


def _build_order_response(order: Order, session: Session, items: list[OrderItem] | None = None) -> OrderResponse:
    if items is None:
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


def _build_order_responses(orders: list[Order], session: Session) -> list[OrderResponse]:
    order_ids = [o.id for o in orders]
    item_repo = OrderItemRepository(session)
    all_items = item_repo.find_by_order_ids(order_ids) if order_ids else []
    items_map: dict[int, list[OrderItem]] = {}
    for item in all_items:
        items_map.setdefault(item.order_id, []).append(item)

    return [_build_order_response(o, session, items_map.get(o.id, [])) for o in orders]


def create_order(
    current_user: User,
    data: OrderCreate,
    session: Session,
) -> OrderResponse:
    cart_repo = CartRepository(session)
    cart_item_repo = CartItemRepository(session)
    product_repo = ProductRepository(session)

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

    product_ids = [ci.product_id for ci in cart_items]
    products = product_repo.find_by_ids(product_ids)
    product_map = {p.id: p for p in products}

    total_amount = Decimal("0")
    order_items_data = []
    valid_cart_items: list = []
    stale_cart_items: list = []

    # Partition cart items: skip stale ones (product missing/inactive) — these
    # get atomically deleted inside the order transaction below to keep the
    # cart consistent. Without this, GET cart filters them out (PR #5 H5) but
    # they would block checkout forever.
    for cart_item in cart_items:
        product = product_map.get(cart_item.product_id)
        if not product or product.status != "ACTIVE":
            stale_cart_items.append(cart_item)
            continue

        if product.stock < cart_item.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Not enough stock for {product.name}. Available: {product.stock}"
            )

        price = product.sale_price if product.sale_price else product.price
        subtotal = price * cart_item.quantity
        total_amount += subtotal
        valid_cart_items.append(cart_item)

        order_items_data.append({
            "product_id": product.id,
            "product_name": product.name,
            "image_url": product.image_url,
            "price": product.price,
            "sale_price": product.sale_price,
            "quantity": cart_item.quantity,
            "subtotal": subtotal,
        })

    if not valid_cart_items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không có sản phẩm khả dụng trong giỏ hàng. Vui lòng làm mới và thử lại."
        )

    # ── Atomic transaction: all-or-nothing ──
    # Bypass repo helpers (which auto-commit) and stage everything in one
    # transaction so a mid-flow failure rolls back order + items + stock + cart.
    order = Order(
        user_id=current_user.id,
        total_amount=total_amount,
        status="PENDING",
        payment_method=data.payment_method,
        payment_status="UNPAID",
        shipping_address=data.shipping_address,
        phone=data.phone,
        note=data.note,
    )
    try:
        session.add(order)
        session.flush()  # obtain order.id without committing

        created_items: list[OrderItem] = []
        for item_data in order_items_data:
            order_item = OrderItem(order_id=order.id, **item_data)
            session.add(order_item)
            created_items.append(order_item)

        # Atomic conditional decrement — guards against oversell when two
        # concurrent checkouts both pass the read-time stock check.
        for cart_item in valid_cart_items:
            product = product_map[cart_item.product_id]
            ok = product_repo.decrement_stock_if_available(
                cart_item.product_id, cart_item.quantity
            )
            if not ok:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Stock changed for {product.name}, please retry"
                )
            session.delete(cart_item)

        # Cleanup stale items atomically — fails together with the order if
        # anything else in this transaction goes wrong.
        for stale in stale_cart_items:
            session.delete(stale)

        session.commit()
    except HTTPException:
        session.rollback()
        raise
    except Exception:
        session.rollback()
        raise

    session.refresh(order)
    for item in created_items:
        session.refresh(item)

    order_response = _build_order_response(order, session, items=created_items)

    try:
        send_order_confirmation(current_user, order, created_items)
    except Exception as e:
        logger.error(f"Email notification failed for order #{order.id}: {e}")

    return order_response


def get_user_orders(current_user: User, session: Session, page: int = 1, limit: int = 10, status: str | None = None) -> PaginatedResponse[OrderResponse]:
    order_repo = OrderRepository(session)
    orders, total = order_repo.find_all_by_user_id(current_user.id, page=page, limit=limit, status=status)
    total_pages = math.ceil(total / limit) if total > 0 else 0

    items = _build_order_responses(orders, session)

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

    items = _build_order_responses(orders, session)

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

    if data.status != old_status:
        allowed = VALID_TRANSITIONS.get(old_status, [])
        if data.status not in allowed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot transition from {old_status} to {data.status}. Allowed: {', '.join(allowed) or 'none'}"
            )

    # ── Atomic: status change + (optional) stock restore in one transaction ──
    order.status = data.status
    order.updated_at = datetime.now(timezone.utc)

    try:
        session.add(order)

        if data.status == "CANCELLED" and old_status != "CANCELLED":
            item_repo = OrderItemRepository(session)
            order_items = item_repo.find_by_order_id(order.id)
            if order_items:
                # Bulk stock restore: aggregate quantities per product
                agg_qty: dict[int, int] = {}
                for item in order_items:
                    agg_qty[item.product_id] = agg_qty.get(item.product_id, 0) + item.quantity
                for pid, qty in agg_qty.items():
                    session.exec(
                        update(Product)
                        .where(Product.id == pid)
                        .values(stock=Product.stock + qty)
                    )

        session.commit()
    except Exception:
        session.rollback()
        raise

    session.refresh(order)
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
