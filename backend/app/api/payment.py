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

    if not is_valid or order_id is None:
        return RedirectResponse(
            url=f"{frontend_url}/payment/result?status=failed&reason=invalid",
            status_code=302,
        )

    order_repo = OrderRepository(session)
    order = order_repo.find_by_id(order_id)

    if not order:
        return RedirectResponse(
            url=f"{frontend_url}/payment/result?status=failed&reason=not_found",
            status_code=302,
        )

    if response_code == "00":
        order.payment_status = "PAID"
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
