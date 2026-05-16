from fastapi import APIRouter, Depends, Query, status
from sqlmodel import Session

from app.core.database import get_session
from app.models.user import User
from app.schemas.brand import BrandCreate, BrandResponse, BrandUpdate
from app.schemas.common import PaginatedResponse
from app.services.brand_service import (
    create_brand,
    delete_brand,
    get_all_brands,
    get_brand_by_id,
    update_brand,
)
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/api/brands", tags=["Brands"])


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    from app.services.brand_service import require_admin as _require_admin
    return _require_admin(current_user)


@router.get("", response_model=PaginatedResponse[BrandResponse])
def list_brands(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    session: Session = Depends(get_session),
):
    return get_all_brands(session, page=page, limit=limit)


@router.get("/{brand_id}", response_model=BrandResponse)
def get_brand(brand_id: int, session: Session = Depends(get_session)):
    return get_brand_by_id(brand_id, session)


@router.post("", response_model=BrandResponse, status_code=status.HTTP_201_CREATED)
def create(
    data: BrandCreate,
    admin: User = Depends(require_admin),
    session: Session = Depends(get_session),
):
    return create_brand(data, admin, session)


@router.put("/{brand_id}", response_model=BrandResponse)
def update(
    brand_id: int,
    data: BrandUpdate,
    admin: User = Depends(require_admin),
    session: Session = Depends(get_session),
):
    return update_brand(brand_id, data, admin, session)


@router.delete("/{brand_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete(
    brand_id: int,
    admin: User = Depends(require_admin),
    session: Session = Depends(get_session),
):
    delete_brand(brand_id, admin, session)
    return None
