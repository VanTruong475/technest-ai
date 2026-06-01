"""Batch endpoint for homepage — reduces 4 API calls to 1."""

from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.core.cache import cache_key, get_cached, set_cached
from app.core.database import get_session
from app.schemas.brand import BrandResponse
from app.schemas.category import CategoryResponse
from app.schemas.product import ProductResponse
from app.services.brand_service import get_all_brands
from app.services.category_service import get_all_categories
from app.services.product_service import get_all_products

router = APIRouter(tags=["Homepage"])


@router.get("/api/homepage")
def get_homepage_data(session: Session = Depends(get_session)):
    """Return brands, categories, and products in a single response.

    Cached for 60 seconds to reduce DB load while keeping data fresh.
    """
    ck = cache_key("homepage")
    cached = get_cached(ck)
    if cached is not None:
        return cached

    brands_result = get_all_brands(session, page=1, limit=100)
    categories_result = get_all_categories(session, page=1, limit=100)
    products_result = get_all_products(session, page=1, limit=8)

    response = {
        "brands": [BrandResponse.model_validate(b).model_dump() for b in brands_result.items],
        "categories": [CategoryResponse.model_validate(c).model_dump() for c in categories_result.items],
        "products": [ProductResponse.model_validate(p).model_dump() for p in products_result.items],
    }

    set_cached(ck, response, ttl=60)
    return response
