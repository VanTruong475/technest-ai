import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import RedirectResponse
from sqlmodel import Session

from app.core.config import settings
from app.core.database import get_session
from app.core.rate_limit import limiter
from app.models.user import User
from app.repositories.order_repository import OrderRepository
from app.services.auth_service import get_current_user
from app.services.vnpay_service import build_payment_url, extract_order_id, verify_return

logger = logging.getLogger("techsphere")

router = APIRouter(tags=["Payments"])


@router.post("/api/orders/{order_id}/payment/vnpay")
@limiter.limit("5/minute")
def create_vnpay_payment(
    request: Request,
    order_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    order_repo = OrderRepository(session)
    order = order_repo.find_by_id(order_id)

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )

    if order.user_id != current_user.id and current_user.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to pay for this order"
        )

    if order.payment_status == "PAID":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Order is already paid"
        )

    order.payment_method = "VNPAY"
    order.payment_status = "PENDING"
    order.updated_at = datetime.now(timezone.utc)
    order_repo.update(order)

    client_ip = request.client.host if request.client else "127.0.0.1"
    payment_url = build_payment_url(order.id, order.total_amount, client_ip)

    return {"payment_url": payment_url}


@router.get("/api/payments/vnpay-return")
def vnpay_return(
    request: Request,
    session: Session = Depends(get_session),
):
    params = dict(request.query_params)

    is_valid, response_code = verify_return(params)

    order_id = extract_order_id(params)
    frontend_url = settings.FRONTEND_URL

    def _redirect_fail(reason: str) -> RedirectResponse:
        url = f"{frontend_url}/payment/result?status=failed&reason={reason}"
        if order_id is not None:
            url += f"&order_id={order_id}"
        return RedirectResponse(url=url, status_code=302)

    if not is_valid or order_id is None:
        return _redirect_fail("invalid")

    order_repo = OrderRepository(session)
    order = order_repo.find_by_id(order_id)

    if not order:
        return _redirect_fail("not_found")

    # Terminal states must never be flipped back. Blocks replay of an old
    # callback after the order has been cancelled or already settled.
    if order.status == "CANCELLED":
        logger.warning(f"VNPay return ignored: order #{order_id} is CANCELLED")
        return _redirect_fail("cancelled")

    if order.payment_status != "PENDING":
        logger.warning(
            f"VNPay return ignored: order #{order_id} payment_status={order.payment_status} (expected PENDING)"
        )
        return _redirect_fail("already_processed")

    # Amount tampering check: VNPay sends amount * 100 (no fractional VND).
    try:
        vnp_amount = int(params.get("vnp_Amount", ""))
    except ValueError:
        return _redirect_fail("invalid")

    expected_amount = round(order.total_amount * 100)
    if vnp_amount != expected_amount:
        logger.warning(
            f"VNPay return amount mismatch for order #{order_id}: "
            f"vnp_Amount={vnp_amount}, expected={expected_amount}"
        )
        return _redirect_fail("amount_mismatch")

    # Replay guard — same txn_ref already consumed by any prior callback
    # (this order or another). UNIQUE constraint on payment_txn_ref also
    # protects at the DB level.
    txn_ref = params.get("vnp_TxnRef", "")
    if txn_ref:
        existing = order_repo.find_by_payment_txn_ref(txn_ref)
        if existing:
            logger.warning(
                f"VNPay return replay detected: txn_ref={txn_ref} already used by order #{existing.id}"
            )
            return _redirect_fail("replay")

    order.payment_txn_ref = txn_ref or None
    if response_code == "00":
        order.payment_status = "PAID"
        order.status = "CONFIRMED"
        logger.info(f"Order #{order_id} payment successful via VNPay")
    else:
        order.payment_status = "FAILED"
        logger.info(f"Order #{order_id} payment failed, response_code={response_code}")

    order.updated_at = datetime.now(timezone.utc)
    order_repo.update(order)

    status_param = "success" if response_code == "00" else "failed"
    return RedirectResponse(
        url=f"{frontend_url}/payment/result?status={status_param}&order_id={order_id}",
        status_code=302,
    )
