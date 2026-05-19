from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.core.database import get_session
from app.core.dependencies import require_admin
from app.models.user import User
from app.schemas.admin import AdminDashboardResponse
from app.services.admin_service import AdminService

router = APIRouter(prefix="/api/admin", tags=["Admin"])


@router.get("/stats", response_model=AdminDashboardResponse)
def get_dashboard_stats(
    admin: User = Depends(require_admin),
    session: Session = Depends(get_session),
) -> AdminDashboardResponse:
    service = AdminService(session)
    return service.get_dashboard_stats()
