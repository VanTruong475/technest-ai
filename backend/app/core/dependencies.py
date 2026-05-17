from fastapi import Depends

from app.core.exceptions import ForbiddenError
from app.models.user import User
from app.services.auth_service import get_current_user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "ADMIN":
        raise ForbiddenError(detail="Admin access required")
    return current_user
