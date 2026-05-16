import math

from fastapi import HTTPException, status
from sqlmodel import Session

from app.models.category import Category
from app.models.user import User
from app.repositories.category_repository import CategoryRepository
from app.schemas.category import CategoryCreate, CategoryUpdate
from app.schemas.common import PaginatedResponse


def require_admin(current_user: User) -> User:
    if current_user.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user


def get_all_categories(session: Session, page: int = 1, limit: int = 10) -> PaginatedResponse[Category]:
    repo = CategoryRepository(session)
    items, total = repo.find_all(page=page, limit=limit)
    total_pages = math.ceil(total / limit) if total > 0 else 0

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages,
    )


def get_category_by_id(category_id: int, session: Session) -> Category:
    repo = CategoryRepository(session)
    category = repo.find_by_id(category_id)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )
    return category


def create_category(
    data: CategoryCreate,
    admin: User,
    session: Session,
) -> Category:
    repo = CategoryRepository(session)

    if repo.find_by_slug(data.slug):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Slug already exists"
        )

    category = Category(**data.model_dump())
    return repo.create(category)


def update_category(
    category_id: int,
    data: CategoryUpdate,
    admin: User,
    session: Session,
) -> Category:
    repo = CategoryRepository(session)
    category = repo.find_by_id(category_id)

    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )

    update_data = data.model_dump(exclude_unset=True)

    if "slug" in update_data and update_data["slug"] != category.slug:
        existing = repo.find_by_slug(update_data["slug"])
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Slug already exists"
            )

    for key, value in update_data.items():
        setattr(category, key, value)

    return repo.update(category)


def delete_category(
    category_id: int,
    admin: User,
    session: Session,
) -> None:
    repo = CategoryRepository(session)
    category = repo.find_by_id(category_id)

    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )

    repo.delete(category)
