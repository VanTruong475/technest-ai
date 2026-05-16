from sqlmodel import Session, select, func, or_

from app.models.cart import Cart, CartItem
from app.models.order import Order, OrderItem
from app.models.product import Product
from app.repositories.cart_repository import CartRepository, CartItemRepository
from app.repositories.order_repository import OrderRepository, OrderItemRepository
from app.repositories.product_repository import ProductRepository
from app.schemas.ai import (
    AISearchRequest, AISearchResponse, AISearchResult,
    AIRecommendResponse, AIRecommendResult,
)
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


# ─────────────────────────────────────────────
# AI Recommendation
# ─────────────────────────────────────────────

def _get_popular_products(session: Session, exclude_ids: set[int], limit: int) -> list[tuple[Product, float, str]]:
    """Sản phẩm được đặt nhiều nhất (dựa trên order_items)."""
    statement = (
        select(Product, func.count(OrderItem.id).label("order_count"))
        .join(OrderItem, OrderItem.product_id == Product.id)
        .where(Product.status == "ACTIVE", Product.stock > 0)
        .where(Product.id.not_in(exclude_ids) if exclude_ids else True)
        .group_by(Product.id)
        .order_by(func.count(OrderItem.id).desc())
        .limit(limit)
    )
    rows = session.exec(statement).all()
    results = []
    max_count = rows[0][1] if rows else 1
    for product, count in rows:
        score = min(count / max_count, 1.0) if max_count > 0 else 0.0
        reason = f"Được đặt {count} lần"
        results.append((product, round(score, 2), reason))
    return results


def _get_products_by_ids(session: Session, product_ids: list[int]) -> list[Product]:
    """Lấy product theo list id."""
    if not product_ids:
        return []
    statement = select(Product).where(Product.id.in_(product_ids))
    return list(session.exec(statement).all())


def _get_latest_products(session: Session, exclude_ids: set[int], limit: int) -> list[tuple[Product, float, str]]:
    """Sản phẩm mới nhất (ACTIVE, stock > 0), sort theo id desc."""
    conditions = [Product.status == "ACTIVE", Product.stock > 0]
    if exclude_ids:
        conditions.append(Product.id.not_in(exclude_ids))
    statement = select(Product).where(*conditions).order_by(Product.id.desc()).limit(limit)
    items = list(session.exec(statement).all())
    return [(p, 0.5, "Sản phẩm mới") for p in items]


def recommend_by_cart(user_id: int, limit: int, session: Session) -> AIRecommendResponse:
    """Gợi ý dựa trên sản phẩm trong giỏ hàng."""
    cart_repo = CartRepository(session)
    cart_item_repo = CartItemRepository(session)

    cart = cart_repo.find_by_user_id(user_id)
    if not cart:
        return _fallback_popular("cart", limit, session, set())

    cart_items = cart_item_repo.find_by_cart_id(cart.id)
    if not cart_items:
        return _fallback_popular("cart", limit, session, set())

    # Lấy thông tin sản phẩm trong giỏ
    cart_product_ids = {item.product_id for item in cart_items}
    cart_products = _get_products_by_ids(session, list(cart_product_ids))

    # Xác định category và brand từ sản phẩm trong giỏ
    cart_category_ids = {p.category_id for p in cart_products}
    cart_brand_ids = {p.brand_id for p in cart_products}

    # Tìm sản phẩm liên quan
    conditions = [
        Product.status == "ACTIVE",
        Product.stock > 0,
        Product.id.not_in(cart_product_ids),
    ]
    # Ưu tiên cùng category hoặc brand
    conditions.append(
        or_(
            Product.category_id.in_(cart_category_ids),
            Product.brand_id.in_(cart_brand_ids),
        )
    )

    statement = select(Product).where(*conditions).limit(limit * 3)
    candidates = list(session.exec(statement).all())

    # Tính điểm
    scored = []
    for product in candidates:
        score = 0.0
        reasons = []

        if product.category_id in cart_category_ids:
            score += 0.6
            reasons.append("cùng danh mục với sản phẩm trong giỏ")
        if product.brand_id in cart_brand_ids:
            score += 0.4
            reasons.append("cùng thương hiệu với sản phẩm trong giỏ")

        if score > 0:
            if product.sale_price:
                score += 0.1
                reasons.append("đang giảm giá")
            scored.append((product, min(score, 1.0), " + ".join(reasons)))

    # Fallback nếu không có kết quả sau khi lọc
    if not scored:
        return _fallback_popular("cart", limit, session, cart_product_ids)

    scored.sort(key=lambda x: x[1], reverse=True)
    top = scored[:limit]

    results = [
        AIRecommendResult(product=_product_to_response(p), score=s, reason=r)
        for p, s, r in top
    ]

    return AIRecommendResponse(strategy="cart", results=results, total=len(scored))


def recommend_by_history(user_id: int, limit: int, session: Session) -> AIRecommendResponse:
    """Gợi ý dựa trên lịch sử mua hàng."""
    order_repo = OrderRepository(session)
    order_item_repo = OrderItemRepository(session)

    # Lấy tất cả đơn hàng của user
    orders, total_orders = order_repo.find_all_by_user_id(user_id, page=1, limit=1000)
    if total_orders == 0:
        return _fallback_popular("history", limit, session, set())

    # Lấy tất cả sản phẩm đã mua
    purchased_product_ids: set[int] = set()
    for order in orders:
        items = order_item_repo.find_by_order_id(order.id)
        for item in items:
            purchased_product_ids.add(item.product_id)

    if not purchased_product_ids:
        return _fallback_popular("history", limit, session, set())

    # Lấy thông tin sản phẩm đã mua
    purchased_products = _get_products_by_ids(session, list(purchased_product_ids))
    history_category_ids = {p.category_id for p in purchased_products}
    history_brand_ids = {p.brand_id for p in purchased_products}

    # Tìm sản phẩm liên quan (không trùng sản phẩm đã mua)
    conditions = [
        Product.status == "ACTIVE",
        Product.stock > 0,
        Product.id.not_in(purchased_product_ids),
        or_(
            Product.category_id.in_(history_category_ids),
            Product.brand_id.in_(history_brand_ids),
        ),
    ]

    statement = select(Product).where(*conditions).limit(limit * 3)
    candidates = list(session.exec(statement).all())

    # Tính điểm
    scored = []
    for product in candidates:
        score = 0.0
        reasons = []

        if product.category_id in history_category_ids:
            score += 0.6
            reasons.append("cùng danh mục với sản phẩm đã mua")
        if product.brand_id in history_brand_ids:
            score += 0.4
            reasons.append("cùng thương hiệu với sản phẩm đã mua")

        if score > 0:
            if product.sale_price:
                score += 0.1
                reasons.append("đang giảm giá")
            scored.append((product, min(score, 1.0), " + ".join(reasons)))

    # Fallback nếu không có kết quả sau khi lọc
    if not scored:
        return _fallback_popular("history", limit, session, purchased_product_ids)

    scored.sort(key=lambda x: x[1], reverse=True)
    top = scored[:limit]

    results = [
        AIRecommendResult(product=_product_to_response(p), score=s, reason=r)
        for p, s, r in top
    ]

    return AIRecommendResponse(strategy="history", results=results, total=len(scored))


def recommend_popular(limit: int, session: Session) -> AIRecommendResponse:
    """Gợi ý sản phẩm phổ biến nhất (public)."""
    # Ưu tiên 1: popular theo order_items
    top = _get_popular_products(session, set(), limit)

    if not top:
        # Ưu tiên 2: sản phẩm mới nhất nếu chưa có order data
        top = _get_latest_products(session, set(), limit)
        results = [
            AIRecommendResult(
                product=_product_to_response(p),
                score=s,
                reason="Sản phẩm mới (chưa có dữ liệu popular)",
            )
            for p, s, r in top
        ]
    else:
        results = [
            AIRecommendResult(product=_product_to_response(p), score=s, reason=r)
            for p, s, r in top
        ]

    return AIRecommendResponse(strategy="popular", results=results, total=len(results))


def _fallback_popular(strategy: str, limit: int, session: Session, exclude_ids: set[int]) -> AIRecommendResponse:
    """Fallback về popular khi cart/history rỗng hoặc không đủ dữ liệu.

    Ưu tiên 1: Sản phẩm phổ biến (dựa trên order_items).
    Ưu tiên 2: Sản phẩm mới nhất (nếu chưa có order data).
    """
    # Ưu tiên 1: popular theo order_items
    top = _get_popular_products(session, exclude_ids, limit)

    if top:
        results = [
            AIRecommendResult(
                product=_product_to_response(p),
                score=s,
                reason=f"Fallback popular vì không có đủ dữ liệu gợi ý ({r})",
            )
            for p, s, r in top
        ]
        return AIRecommendResponse(strategy=strategy, results=results, total=len(results))

    # Ưu tiên 2: sản phẩm mới nhất nếu chưa có order data
    top = _get_latest_products(session, exclude_ids, limit)

    results = [
        AIRecommendResult(
            product=_product_to_response(p),
            score=s,
            reason="Fallback sản phẩm mới vì chưa có dữ liệu popular",
        )
        for p, s, r in top
    ]

    return AIRecommendResponse(strategy=strategy, results=results, total=len(results))
