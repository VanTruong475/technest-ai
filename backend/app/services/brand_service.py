import math

from fastapi import HTTPException, status
from sqlmodel import Session, select, func

from app.models.brand import Brand
from app.models.product import Product
from app.models.user import User
from app.repositories.brand_repository import BrandRepository
from app.schemas.brand import BrandCreate, BrandUpdate
from app.schemas.common import PaginatedResponse


def get_all_brands(session: Session, page: int = 1, limit: int = 10) -> PaginatedResponse[Brand]:
    repo = BrandRepository(session)
    items, total = repo.find_all(page=page, limit=limit)
    total_pages = math.ceil(total / limit) if total > 0 else 0

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages,
    )


def get_brand_by_id(brand_id: int, session: Session) -> Brand:
    repo = BrandRepository(session)
    brand = repo.find_by_id(brand_id)
    if not brand:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Brand not found"
        )
    return brand


def create_brand(
    data: BrandCreate,
    admin: User,
    session: Session,
) -> Brand:
    repo = BrandRepository(session)

    if repo.find_by_slug(data.slug):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Slug already exists"
        )

    brand = Brand(**data.model_dump())
    return repo.create(brand)


def update_brand(
    brand_id: int,
    data: BrandUpdate,
    admin: User,
    session: Session,
) -> Brand:
    repo = BrandRepository(session)
    brand = repo.find_by_id(brand_id)

    if not brand:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Brand not found"
        )

    update_data = data.model_dump(exclude_unset=True)

    if "slug" in update_data and update_data["slug"] != brand.slug:
        existing = repo.find_by_slug(update_data["slug"])
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Slug already exists"
            )

    for key, value in update_data.items():
        setattr(brand, key, value)

    return repo.update(brand)


def delete_brand(
    brand_id: int,
    admin: User,
    session: Session,
) -> None:
    repo = BrandRepository(session)
    brand = repo.find_by_id(brand_id)

    if not brand:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Brand not found"
        )

    # Check if brand has products before deleting
    product_count = session.exec(
        select(func.count()).select_from(Product).where(Product.brand_id == brand_id)
    ).one()
    if product_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete brand with {product_count} products. Remove or reassign products first."
        )

    repo.delete(brand)
