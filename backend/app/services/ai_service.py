from sqlmodel import Session

from app.models.product import Product
from app.repositories.product_repository import ProductRepository
from app.schemas.ai import AISearchRequest, AISearchResponse, AISearchResult
from app.schemas.product import ProductResponse


def _calculate_score(product: Product, keywords: list[str]) -> tuple[float, str]:
    """Tính relevance score cho product dựa trên keywords."""
    name_lower = product.name.lower()
    desc_lower = (product.description or "").lower()

    name_matches = 0
    desc_matches = 0

    for keyword in keywords:
        if keyword in name_lower:
            name_matches += 1
        if keyword in desc_lower:
            desc_matches += 1

    if name_matches == 0 and desc_matches == 0:
        return 0.0, ""

    # Trọng số: name = 10 điểm/keyword, description = 3 điểm/keyword
    score = (name_matches * 10.0) + (desc_matches * 3.0)

    # Bonus nếu tất cả keywords đều khớp
    if name_matches == len(keywords):
        score += 20.0

    # Normalize score về 0-1
    max_possible = len(keywords) * 10.0 + 20.0
    normalized_score = min(score / max_possible, 1.0)

    # Tạo reason
    reasons = []
    if name_matches > 0:
        reasons.append(f"Tên khớp {name_matches}/{len(keywords)} từ khóa")
    if desc_matches > 0:
        reasons.append(f"Mô tả khớp {desc_matches}/{len(keywords)} từ khóa")

    reason = " + ".join(reasons)

    return normalized_score, reason


def _product_to_response(product: Product) -> ProductResponse:
    """Convert Product model sang ProductResponse."""
    return ProductResponse(
        id=product.id,
        category_id=product.category_id,
        brand_id=product.brand_id,
        name=product.name,
        slug=product.slug,
        description=product.description,
        price=product.price,
        sale_price=product.sale_price,
        stock=product.stock,
        status=product.status,
        created_at=product.created_at,
        updated_at=product.updated_at,
    )


def smart_search(
    request: AISearchRequest,
    session: Session,
) -> AISearchResponse:
    """Tìm kiếm thông minh rule-based."""
    repo = ProductRepository(session)

    # Lấy tất cả sản phẩm ACTIVE
    all_products, _ = repo.find_all(
        page=1,
        limit=10000,  # Lấy tất cả để search
        status="ACTIVE",
    )

    # Tách query thành keywords
    query_lower = request.query.lower()
    keywords = query_lower.split()

    if not keywords:
        return AISearchResponse(
            query=request.query,
            results=[],
            total=0,
        )

    # Tính score cho mỗi product
    scored_products = []
    for product in all_products:
        score, reason = _calculate_score(product, keywords)
        if score > 0:
            scored_products.append((product, score, reason))

    # Sắp xếp theo score giảm dần
    scored_products.sort(key=lambda x: x[1], reverse=True)

    # Lấy top N kết quả
    top_results = scored_products[:request.limit]

    # Build response
    results = [
        AISearchResult(
            product=_product_to_response(product),
            score=round(score, 2),
            reason=reason,
        )
        for product, score, reason in top_results
    ]

    return AISearchResponse(
        query=request.query,
        results=results,
        total=len(scored_products),
    )
