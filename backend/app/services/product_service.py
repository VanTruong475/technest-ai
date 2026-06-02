import json
import math
from typing import Optional

from fastapi import HTTPException, status
from sqlmodel import Session

from app.models.product import Product
from app.models.user import User
from app.repositories.brand_repository import BrandRepository
from app.repositories.category_repository import CategoryRepository
from app.repositories.product_repository import ProductRepository
from app.repositories.review_repository import ReviewRepository
from app.schemas.common import PaginatedResponse
from app.schemas.product import (
    BulkStockUpdateRequest,
    BulkStockUpdateResponse,
    ProductCreate,
    ProductResponse,
    ProductUpdate,
)
from app.services.audit_service import log_action


def _enrich_product(session: Session, product: Product) -> dict:
    """Enrich a single product with rating data, return as dict."""
    review_repo = ReviewRepository(session)
    summary = review_repo.get_product_rating_summary(product.id)
    item = ProductResponse.model_validate(product).model_dump()
    item["average_rating"] = summary["rating_average"]
    item["review_count"] = summary["rating_count"]
    return item


def get_all_products(
    session: Session,
    page: int = 1,
    limit: int = 10,
    category_id: Optional[int] = None,
    brand_id: Optional[int] = None,
    status_filter: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    search: Optional[str] = None,
    sort: str = "newest",
    min_rating: Optional[float] = None,
) -> PaginatedResponse[Product]:
    repo = ProductRepository(session)
    items, total = repo.find_all(
        page=page,
        limit=limit,
        category_id=category_id,
        brand_id=brand_id,
        status=status_filter,
        min_price=min_price,
        max_price=max_price,
        search=search,
        sort=sort,
        min_rating=min_rating,
    )
    total_pages = math.ceil(total / limit) if total > 0 else 0

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages,
    )


def get_all_products_with_ratings(
    session: Session,
    page: int = 1,
    limit: int = 10,
    category_id: Optional[int] = None,
    brand_id: Optional[int] = None,
    status_filter: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    search: Optional[str] = None,
    sort: str = "newest",
    min_rating: Optional[float] = None,
) -> dict:
    """Same as get_all_products but enriches items with rating data.

    Returns a plain dict (not PaginatedResponse) since items are dicts, not Product models.
    """
    result = get_all_products(
        session, page, limit, category_id, brand_id, status_filter,
        min_price, max_price, search, sort, min_rating,
    )
    enriched_items = [_enrich_product(session, p) for p in result.items]
    return {
        "items": enriched_items,
        "total": result.total,
        "page": result.page,
        "limit": result.limit,
        "total_pages": result.total_pages,
    }


def get_product_by_id(product_id: int, session: Session) -> dict:
    repo = ProductRepository(session)
    product = repo.find_by_id(product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    return _enrich_product(session, product)


def create_product(
    data: ProductCreate,
    admin: User,
    session: Session,
) -> Product:
    product_repo = ProductRepository(session)
    category_repo = CategoryRepository(session)
    brand_repo = BrandRepository(session)

    if product_repo.find_by_slug(data.slug):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Slug already exists"
        )

    if not category_repo.find_by_id(data.category_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Category not found"
        )

    if not brand_repo.find_by_id(data.brand_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Brand not found"
        )

    if data.sale_price is not None and data.sale_price >= data.price:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sale price must be less than price"
        )

    product = Product(**data.model_dump())
    product = product_repo.create(product)
    log_action(session, admin.id, "CREATE", "PRODUCT", product.id, f"Created product: {product.name}")
    return product


def update_product(
    product_id: int,
    data: ProductUpdate,
    admin: User,
    session: Session,
) -> Product:
    product_repo = ProductRepository(session)
    category_repo = CategoryRepository(session)
    brand_repo = BrandRepository(session)

    product = product_repo.find_by_id(product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )

    update_data = data.model_dump(exclude_unset=True)

    if "slug" in update_data and update_data["slug"] != product.slug:
        existing = product_repo.find_by_slug(update_data["slug"])
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Slug already exists"
            )

    if "category_id" in update_data:
        if not category_repo.find_by_id(update_data["category_id"]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Category not found"
            )

    if "brand_id" in update_data:
        if not brand_repo.find_by_id(update_data["brand_id"]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Brand not found"
            )

    price = update_data.get("price", product.price)
    sale_price = update_data.get("sale_price", product.sale_price)
    if sale_price is not None and sale_price >= price:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sale price must be less than price"
        )

    for key, value in update_data.items():
        setattr(product, key, value)

    product = product_repo.update(product)
    log_action(session, admin.id, "UPDATE", "PRODUCT", product.id, json.dumps(update_data, default=str))
    return product


def delete_product(
    product_id: int,
    admin: User,
    session: Session,
) -> None:
    repo = ProductRepository(session)
    product = repo.find_by_id(product_id)

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )

    product.status = "INACTIVE"
    repo.update(product)
    log_action(session, admin.id, "DELETE", "PRODUCT", product.id, f"Soft-deleted product: {product.name}")


def bulk_update_stock(
    data: BulkStockUpdateRequest,
    admin: User,
    session: Session,
) -> BulkStockUpdateResponse:
    repo = ProductRepository(session)

    product_ids = [item.product_id for item in data.items]
    products = repo.find_by_ids(product_ids)

    found_ids = {p.id for p in products}
    missing_ids = [pid for pid in product_ids if pid not in found_ids]
    if missing_ids:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Products not found: {missing_ids}"
        )

    stock_map = {item.product_id: item.stock for item in data.items}
    for product in products:
        product.stock = stock_map[product.id]

    updated_products = repo.bulk_update(products)

    log_action(
        session, admin.id, "UPDATE", "INVENTORY", None,
        json.dumps({"updated": len(updated_products), "items": [{"product_id": i.product_id, "stock": i.stock} for i in data.items]}, default=str),
    )

    return BulkStockUpdateResponse(
        updated=len(updated_products),
        products=updated_products,
    )
