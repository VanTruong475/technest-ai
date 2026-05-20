from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import StreamingResponse
from sqlmodel import Session

from app.core.database import get_session
from app.core.dependencies import require_admin
from app.models.user import User
from app.schemas.admin import AdminDashboardResponse, AdminReviewsResponse
from app.services.admin_service import AdminService

router = APIRouter(prefix="/api/admin", tags=["Admin"])


@router.get("/stats", response_model=AdminDashboardResponse)
def get_dashboard_stats(
    admin: User = Depends(require_admin),
    session: Session = Depends(get_session),
) -> AdminDashboardResponse:
    service = AdminService(session)
    return service.get_dashboard_stats()


@router.get("/reviews", response_model=AdminReviewsResponse)
def get_all_reviews(
    page: int = 1,
    limit: int = 10,
    admin: User = Depends(require_admin),
    session: Session = Depends(get_session),
) -> AdminReviewsResponse:
    service = AdminService(session)
    return service.get_all_reviews(page=page, limit=limit)


@router.delete("/reviews/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_review(
    review_id: int,
    admin: User = Depends(require_admin),
    session: Session = Depends(get_session),
) -> None:
    service = AdminService(session)
    service.delete_review(review_id)


@router.get("/orders/export")
def export_orders(
    from_date: Optional[str] = Query(None, alias="from"),
    to_date: Optional[str] = Query(None),
    order_status: Optional[str] = Query(None, alias="status"),
    admin: User = Depends(require_admin),
    session: Session = Depends(get_session),
) -> StreamingResponse:
    service = AdminService(session)
    return service.export_orders_csv(
        from_date=from_date,
        to_date=to_date,
        order_status=order_status,
    )
