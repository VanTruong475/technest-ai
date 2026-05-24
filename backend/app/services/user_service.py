import math

from fastapi import HTTPException, status
from sqlmodel import Session

from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.auth import UserResponse
from app.schemas.common import PaginatedResponse
from app.schemas.user import UserUpdate


def get_users(session: Session, page: int = 1, limit: int = 10) -> PaginatedResponse[UserResponse]:
    repo = UserRepository(session)
    items, total = repo.find_all(page=page, limit=limit)
    total_pages = math.ceil(total / limit) if total > 0 else 0

    return PaginatedResponse(
        items=[UserResponse.model_validate(u) for u in items],
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages,
    )


def get_user_by_id(user_id: int, current_user: User, session: Session) -> UserResponse:
    # Phân quyền: admin xem tất cả, user thường chỉ xem chính mình
    if current_user.role != "ADMIN" and current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view your own profile",
        )

    repo = UserRepository(session)
    user = repo.find_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return UserResponse.model_validate(user)


def update_user(
    user_id: int,
    data: UserUpdate,
    current_user: User,
    session: Session,
) -> UserResponse:
    repo = UserRepository(session)
    user = repo.find_by_id(user_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    is_admin = current_user.role == "ADMIN"
    is_self = current_user.id == user_id

    # User thường chỉ sửa được chính mình
    if not is_admin and not is_self:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update your own profile",
        )

    # User thường không được gửi role hoặc is_active
    if not is_admin:
        if data.role is not None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You cannot change role",
            )
        if data.is_active is not None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You cannot change active status",
            )

    # Admin không được tự demote hoặc disable chính mình (tránh khoá hệ thống)
    if is_admin and is_self:
        if data.role is not None and data.role != user.role:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Admin cannot change their own role",
            )
        if data.is_active is False:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Admin cannot disable their own account",
            )

    # Apply updates
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(user, key, value)

    repo.update(user)
    return UserResponse.model_validate(user)
