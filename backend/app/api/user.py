from fastapi import APIRouter, Depends, Query
from sqlmodel import Session

from app.core.database import get_session
from app.core.dependencies import require_admin
from app.models.user import User
from app.schemas.auth import UserResponse
from app.schemas.common import PaginatedResponse
from app.schemas.user import UserUpdate
from app.services.auth_service import get_current_user
from app.services.user_service import get_user_by_id, get_users, update_user

router = APIRouter(prefix="/api/users", tags=["Users"])


@router.get("", response_model=PaginatedResponse[UserResponse])
def list_users(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    admin: User = Depends(require_admin),
    session: Session = Depends(get_session),
):
    """Danh sách users (admin only)."""
    return get_users(session, page=page, limit=limit)


@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Chi tiết user. Admin xem tất cả, user thường chỉ xem chính mình."""
    return get_user_by_id(user_id, current_user, session)


@router.put("/{user_id}", response_model=UserResponse)
def update(
    user_id: int,
    data: UserUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Cập nhật user. Admin sửa tất cả, user thường chỉ sửa full_name và phone của mình."""
    return update_user(user_id, data, current_user, session)
