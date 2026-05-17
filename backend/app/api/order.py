from fastapi import APIRouter, Depends, Query, status
from sqlmodel import Session

from app.core.database import get_session
from app.core.dependencies import require_admin
from app.models.user import User
from app.schemas.common import PaginatedResponse
from app.schemas.order import OrderCreate, OrderResponse, OrderStatusUpdate
from app.services.auth_service import get_current_user
from app.services.order_service import (
    create_order,
    get_all_orders,
    get_order_by_id,
    get_user_orders,
    update_order_status,
)

router = APIRouter(prefix="/api/orders", tags=["Orders"])


@router.post("", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
def create(
    data: OrderCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    return create_order(current_user, data, session)


@router.get("", response_model=PaginatedResponse[OrderResponse])
def list_orders(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    if current_user.role == "ADMIN":
        return get_all_orders(session, page=page, limit=limit)
    return get_user_orders(current_user, session, page=page, limit=limit)


@router.get("/{order_id}", response_model=OrderResponse)
def get_order(
    order_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    is_admin = current_user.role == "ADMIN"
    return get_order_by_id(current_user, order_id, session, is_admin)


@router.put("/{order_id}/status", response_model=OrderResponse)
def update_status(
    order_id: int,
    data: OrderStatusUpdate,
    admin: User = Depends(require_admin),
    session: Session = Depends(get_session),
):
    return update_order_status(order_id, data, session)
