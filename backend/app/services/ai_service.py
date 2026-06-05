import logging
import re
from typing import Optional, Iterator

from sqlmodel import Session, select, func, or_, col

from app.models.brand import Brand
from app.models.cart import Cart, CartItem
from app.models.category import Category
from app.models.order import Order, OrderItem
from app.models.product import Product
from app.repositories.cart_repository import CartRepository, CartItemRepository
from app.repositories.order_repository import OrderRepository, OrderItemRepository
from app.schemas.ai import (
    AISearchRequest, AISearchResponse, AISearchResult,
    AIRecommendResponse, AIRecommendResult,
    ChatRequest, ChatResponse, ChatProductResult,
)
from app.schemas.product import ProductResponse

logger = logging.getLogger("techsphere")

# Từ điển đồng nghĩa cho AI search — mở rộng query của user trước khi match DB
SYNONYM_DICT: dict[str, list[str]] = {
    "đt": ["điện thoại", "phone"],
    "dienthoai": ["điện thoại"],
    "phone": ["điện thoại"],
    "mac": ["macbook"],
    "macbook": ["mac", "macbook"],
    "ipad": ["ipad", "tablet"],
    "tablet": ["tablet", "ipad"],
    "lap": ["laptop"],
    "laptop": ["laptop"],
    "tai nghe": ["tai nghe", "headphone", "earphone"],
    "headphone": ["tai nghe", "headphone"],
    "earphone": ["tai nghe", "earphone"],
    "tivi": ["tivi", "tv"],
    "tv": ["tivi", "tv"],
    "đồng hồ": ["đồng hồ", "watch", "smartwatch"],
    "watch": ["đồng hồ", "watch"],
    "smartwatch": ["đồng hồ", "smartwatch"],
    "loa": ["loa", "speaker"],
    "speaker": ["loa", "speaker"],
    "sạc": ["sạc", "charger", "cáp sạc"],
    "charger": ["sạc", "charger"],
    "ốp": ["ốp", "case", "ốp lưng"],
    "case": ["ốp", "case"],
    "rẻ": ["giảm giá", "sale", "khuyến mãi"],
    "sale": ["giảm giá", "sale", "khuyến mãi"],
    "giảm giá": ["giảm giá", "sale", "khuyến mãi"],
    "khuyến mãi": ["giảm giá", "sale", "khuyến mãi"],
    "apple": ["apple", "iphone", "ipad", "macbook", "airpods"],
    "samsung": ["samsung", "galaxy"],
    "galaxy": ["samsung", "galaxy"],
    "oppo": ["oppo"],
    "xiaomi": ["xiaomi", "redmi"],
    "redmi": ["xiaomi", "redmi"],
    "vivo": ["vivo"],
    "huawei": ["huawei"],
    "realme": ["realme"],
    "asus": ["asus", "rog"],
    "rog": ["asus", "rog"],
    "dell": ["dell"],
    "hp": ["hp"],
    "lenovo": ["lenovo", "thinkpad"],
    "thinkpad": ["lenovo", "thinkpad"],
    "sony": ["sony"],
    "jbl": ["jbl"],
    "airpods": ["airpods", "tai nghe"],
}


def _expand_synonyms(keywords: list[str]) -> list[str]:
    """Mở rộng keywords bằng từ điển đồng nghĩa.

    Mỗi keyword được tra trong SYNONYM_DICT. Nếu khớp, các synonym được thêm
    vào kết quả. Từ trùng lặp được loại bỏ (giữ thứ tự xuất hiện).
    """
    expanded: list[str] = []
    seen: set[str] = set()
    for kw in keywords:
        kw_lower = kw.lower()
        if kw_lower not in seen:
            expanded.append(kw_lower)
            seen.add(kw_lower)
        synonyms = SYNONYM_DICT.get(kw_lower, [])
        for syn in synonyms:
            syn_lower = syn.lower()
            if syn_lower not in seen:
                expanded.append(syn_lower)
                seen.add(syn_lower)
    return expanded


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
    """Convert Product model sang ProductResponse.

    Dùng model_validate (from_attributes=True đã enabled trong schema) thay
    vì list từng field — tránh bug bỏ sót field như đã từng xảy ra với
    image_url (làm mọi AI feature mất ảnh trên FE).
    """
    return ProductResponse.model_validate(product)


def smart_search(
    request: AISearchRequest,
    session: Session,
) -> AISearchResponse:
    """Tìm kiếm thông minh rule-based.

    SQL pre-filter chuyển ILIKE %keyword% xuống DB (any keyword khớp name hoặc
    description), cap 200 candidates trước khi scoring Python. Tránh load toàn
    bộ catalog vào memory khi danh sách sản phẩm lớn.
    """
    # Tách query thành keywords và mở rộng bằng từ điển đồng nghĩa
    query_lower = request.query.lower()
    keywords = _expand_synonyms(query_lower.split())

    if not keywords:
        return AISearchResponse(
            query=request.query,
            results=[],
            total=0,
        )

    # Đẩy filter xuống SQL: bất kỳ keyword nào khớp name HOẶC description
    keyword_clauses = [
        or_(
            Product.name.ilike(f"%{kw}%"),
            Product.description.ilike(f"%{kw}%"),
        )
        for kw in keywords
    ]
    statement = (
        select(Product)
        .where(Product.status == "ACTIVE")
        .where(or_(*keyword_clauses))
        .order_by(Product.created_at.desc())
        .limit(200)
    )
    candidates = list(session.exec(statement).all())

    # Tính score cho mỗi candidate
    scored_products = []
    for product in candidates:
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

    # Lấy tất cả sản phẩm đã mua (bulk query thay vì N+1)
    order_ids = [o.id for o in orders]
    all_items = order_item_repo.find_by_order_ids(order_ids)
    purchased_product_ids = {item.product_id for item in all_items}

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


def recommend_co_occurrence(product_id: int, limit: int, session: Session) -> AIRecommendResponse:
    """Gợi ý kiểu "khách mua sản phẩm này cũng mua...".

    SQL self-join trên order_items: với mỗi đơn chứa product_id (anchor), đếm
    các sản phẩm khác xuất hiện cùng → top N. Score chuẩn hóa theo max_count
    để 1.0 = co-occurrence cao nhất trong tập trả về.

    Fallback chain (nếu anchor chưa đủ dữ liệu mua chung):
      1. Co-occurrence (chính)
      2. Cùng category với anchor (chỉ ACTIVE + còn stock)
      3. Popular (toàn shop)
    """
    from sqlalchemy.orm import aliased

    # Self-join trên order_items: oi_anchor = đơn chứa product_id, oi_co =
    # các product khác trong cùng đơn. Filter loại anchor + INACTIVE + hết stock.
    oi_anchor = aliased(OrderItem)
    oi_co = aliased(OrderItem)

    statement = (
        select(Product, func.count(oi_co.id).label("co_count"))
        .join(oi_co, oi_co.product_id == Product.id)
        .join(oi_anchor, oi_anchor.order_id == oi_co.order_id)
        .where(oi_anchor.product_id == product_id)
        .where(oi_co.product_id != product_id)
        .where(Product.status == "ACTIVE", Product.stock > 0)
        .group_by(Product.id)
        .order_by(func.count(oi_co.id).desc())
        .limit(limit)
    )
    rows = list(session.exec(statement).all())

    if rows:
        max_count = rows[0][1]
        results = []
        for product, count in rows:
            score = round(min(count / max_count, 1.0), 2) if max_count > 0 else 0.5
            reason = (
                f"Khách mua sản phẩm này cũng mua (xuất hiện cùng {count} lần)"
                if count > 1
                else "Khách mua sản phẩm này cũng mua"
            )
            results.append(
                AIRecommendResult(product=_product_to_response(product), score=score, reason=reason)
            )
        return AIRecommendResponse(strategy="co_occurrence", results=results, total=len(results))

    # Fallback 1: cùng category với anchor (nếu anchor tồn tại + có category).
    anchor = session.get(Product, product_id)
    if anchor and anchor.category_id is not None:
        cat_statement = (
            select(Product)
            .where(Product.status == "ACTIVE", Product.stock > 0)
            .where(Product.category_id == anchor.category_id)
            .where(Product.id != product_id)
            .order_by(Product.id.desc())
            .limit(limit)
        )
        cat_products = list(session.exec(cat_statement).all())
        if cat_products:
            results = [
                AIRecommendResult(
                    product=_product_to_response(p),
                    score=0.5,
                    reason="Cùng danh mục (chưa có dữ liệu mua chung)",
                )
                for p in cat_products
            ]
            return AIRecommendResponse(strategy="co_occurrence", results=results, total=len(results))

    # Fallback 2: popular toàn shop, loại anchor để không tự gợi ý chính nó.
    popular = _get_popular_products(session, {product_id}, limit)
    if popular:
        results = [
            AIRecommendResult(
                product=_product_to_response(p),
                score=s,
                reason=f"Sản phẩm phổ biến (fallback vì sản phẩm này chưa có dữ liệu mua chung)",
            )
            for p, s, r in popular
        ]
        return AIRecommendResponse(strategy="co_occurrence", results=results, total=len(results))

    # Fallback 3: latest products (DB chưa có đơn nào).
    latest = _get_latest_products(session, {product_id}, limit)
    results = [
        AIRecommendResult(
            product=_product_to_response(p),
            score=s,
            reason="Sản phẩm mới (chưa có dữ liệu mua chung)",
        )
        for p, s, r in latest
    ]
    return AIRecommendResponse(strategy="co_occurrence", results=results, total=len(results))


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


# ─────────────────────────────────────────────
# AI Chatbot
# ─────────────────────────────────────────────

# Category keywords mapping
_CATEGORY_KEYWORDS: dict[str, list[str]] = {
    "dien-thoai": ["điện thoại", "dienthoai", "phone", "đt", "di động", "smartphone", "mobile", "đtdđ"],
    "laptop": ["laptop", "macbook", "notebook", "máy tính xách tay", "máy tính", "laptop gaming"],
    "tablet": ["tablet", "ipad", "máy tính bảng", "tab"],
    "tai-nghe": ["tai nghe", "tai nghe", "headphone", "earphone", "airpods", "earbuds", "headset", "tai nghe bluetooth"],
    "phu-kien": ["phụ kiện", "phu kien", "accessory", "sạc", "charger", "cáp", "case", "ốp", "chuột", "bàn phím", "webcam", "loa", "speaker", "pin dự phòng", "powerbank", "hub", "dock", "ổ cứng", "ssd"],
}

# Brand keywords mapping
_BRAND_KEYWORDS: dict[str, list[str]] = {
    "apple": ["apple", "iphone", "ipad", "macbook", "airpods", "apple watch"],
    "samsung": ["samsung", "galaxy"],
    "sony": ["sony", "wh-1000xm", "wf-1000xm", "linkbuds", "inzone"],
    "dell": ["dell", "xps", "inspiron", "latitude", "ultrasharp"],
    "xiaomi": ["xiaomi", "redmi", "poco", "mi band"],
    "asus": ["asus", "rog", "zenbook", "vivobook", "tuf"],
    "lenovo": ["lenovo", "thinkpad", "yoga", "ideapad", "legion"],
    "hp": ["hp ", "spectre", "envy", "pavilion", "elitebook", "omen"],
    "logitech": ["logitech", "mx master", "mx keys", "g pro", "g502"],
}

# Need keywords mapping
_NEED_KEYWORDS: dict[str, list[str]] = {
    "hoc-tap": ["học tập", "học", "sinh viên", "student", "study", "đại học", "học online"],
    "cong-viec": ["công việc", "làm việc", "văn phòng", "office", "work", "doanh nghiệp", "lập trình", "code", "programming"],
    "gaming": ["gaming", "chơi game", "game", "gamer", "esport", "fps", "pubg", "lol", "valorant"],
    "chup-anh": ["chụp ảnh", "camera", "photo", "selfie", "nhiếp ảnh", "quay video", "vlog"],
    "nghe-nhạc": ["nghe nhạc", "music", "âm thanh", "audio", "nhạc", "spotify"],
    "chong-on": ["chống ồn", "noise cancelling", "anc", "ồn", "ồn ào"],
    "mong-nhe": ["mỏng nhẹ", "nhẹ", "mỏng", "di động", "di chuyển nhiều", "mang đi"],
    "pin-trau": ["pin trâu", "pin lâu", "dùng cả ngày", "battery", "pin khỏe", "sạc nhanh"],
    "man-hinh-dep": ["màn hình đẹp", "màn hình oled", "màn hình 4k", "màn hình retina", "màn hình chất lượng"],
    "hieu-nang": ["hiệu năng cao", "mạnh", "nhanh", "chip mạnh", "ram nhiều", "cấu hình mạnh"],
}

# Budget patterns
_BUDGET_PATTERNS = [
    (r"dưới\s+(\d+)\s+triệu", lambda m: float(m.group(1)) * 1_000_000),
    (r"từ\s+\d+\s*-\s*(\d+)\s+triệu", lambda m: float(m.group(1)) * 1_000_000),
    (r"dưới\s+(\d+)\s+usd", lambda m: float(m.group(1)) * 25_000),
    (r"dưới\s+(\d+)\s*\$", lambda m: float(m.group(1)) * 25_000),
    (r"under\s+(\d+)\s+million", lambda m: float(m.group(1)) * 1_000_000),
    (r"under\s+(\d+)\s+usd", lambda m: float(m.group(1)) * 25_000),
    (r"(\d+)\s+triệu\s*đổ\s*xuống", lambda m: float(m.group(1)) * 1_000_000),
    (r"khoảng\s+(\d+)\s+triệu", lambda m: float(m.group(1)) * 1_000_000),
    (r"tầm\s+(\d+)\s+triệu", lambda m: float(m.group(1)) * 1_000_000),
    (r"(\d+)\s*-\s*(\d+)\s*triệu", lambda m: float(m.group(2)) * 1_000_000),
    (r"(\d+)tr", lambda m: float(m.group(1)) * 1_000_000),
    (r"(\d+)\s+triệu", lambda m: float(m.group(1)) * 1_000_000),
]

# Price level keywords
_PRICE_LEVELS: dict[str, tuple[Optional[float], Optional[float]]] = {
    "giá rẻ": (None, 5_000_000),
    "rẻ": (None, 5_000_000),
    "budget": (None, 5_000_000),
    "sinh viên": (None, 10_000_000),
    "trung bình": (5_000_000, 15_000_000),
    "tầm trung": (5_000_000, 15_000_000),
    "mid-range": (5_000_000, 15_000_000),
    "cao cấp": (15_000_000, None),
    "flagship": (15_000_000, None),
    "premium": (15_000_000, None),
    "high-end": (15_000_000, None),
}


def _extract_category(message_lower: str) -> Optional[str]:
    """Extract category slug from message."""
    for slug, keywords in _CATEGORY_KEYWORDS.items():
        for kw in keywords:
            if kw in message_lower:
                return slug
    return None


def _extract_brand(message_lower: str) -> Optional[str]:
    """Extract brand slug from message."""
    for slug, keywords in _BRAND_KEYWORDS.items():
        for kw in keywords:
            if kw in message_lower:
                return slug
    return None


def _extract_budget(message_lower: str) -> tuple[Optional[float], Optional[float]]:
    """Extract min_price and max_price from message."""
    for pattern, converter in _BUDGET_PATTERNS:
        match = re.search(pattern, message_lower)
        if match:
            max_price = converter(match)
            return None, max_price

    for keyword, (min_p, max_p) in _PRICE_LEVELS.items():
        if keyword in message_lower:
            return min_p, max_p

    return None, None


def _extract_needs(message_lower: str) -> list[str]:
    """Extract user needs from message."""
    needs = []
    for slug, keywords in _NEED_KEYWORDS.items():
        for kw in keywords:
            if kw in message_lower:
                needs.append(slug)
                break
    return needs


def _get_category_name(session: Session, category_id: int) -> str:
    """Get category name by id."""
    category = session.get(Category, category_id)
    return category.name if category else "Sản phẩm"


def _get_brand_name(session: Session, brand_id: int) -> str:
    """Get brand name by id."""
    brand = session.get(Brand, brand_id)
    return brand.name if brand else ""


def _build_product_reason(product: Product, session: Session, max_price: Optional[float]) -> str:
    """Build reason string for a product."""
    parts = []
    cat_name = _get_category_name(session, product.category_id)
    brand_name = _get_brand_name(session, product.brand_id)

    if brand_name:
        parts.append(f"{brand_name} {cat_name}")
    else:
        parts.append(cat_name)

    if product.sale_price:
        parts.append(f"giá {product.sale_price:,.0f}đ (giảm từ {product.price:,.0f}đ)")
    else:
        parts.append(f"giá {product.price:,.0f}đ")

    if max_price and product.price <= max_price:
        parts.append("trong ngân sách")

    return ", ".join(parts)


def _generate_suggestions(
    category_slug: Optional[str],
    brand_slug: Optional[str],
    session: Session,
) -> list[str]:
    """Generate follow-up suggestions based on context."""
    suggestions = []

    if category_slug:
        cat = session.exec(select(Category).where(Category.slug == category_slug)).first()
        if cat:
            brands = session.exec(
                select(Brand).where(Brand.is_active == True)
            ).all()
            other_brands = [b.name for b in brands[:3]]
            if other_brands:
                suggestions.append(f"Bạn có muốn xem thêm {cat.name.lower()} của {', '.join(other_brands)} không?")
    elif brand_slug:
        brand = session.exec(select(Brand).where(Brand.slug == brand_slug)).first()
        if brand:
            cats = session.exec(
                select(Category).where(Category.is_active == True)
            ).all()
            other_cats = [c.name.lower() for c in cats[:3]]
            if other_cats:
                suggestions.append(f"Bạn có muốn xem thêm {brand.name} {', '.join(other_cats)} không?")

    if not suggestions:
        suggestions.append("Bạn muốn tìm sản phẩm theo danh mục hay thương hiệu nào?")
        suggestions.append("Mình có thể giúp bạn so sánh giá hoặc tìm sản phẩm phù hợp ngân sách.")

    return suggestions[:3]


def chat_with_ai(request: ChatRequest, session: Session) -> ChatResponse:
    """Chatbot tư vấn sản phẩm.

    Flow: luôn chạy rule-based trước để lấy danh sách sản phẩm THẬT từ DB,
    sau đó (nếu LLM enabled) gọi provider để rephrase reply tự nhiên hơn.
    Products/giá/tồn kho luôn từ DB — LLM chỉ chạm vào text reply. Bất kỳ
    lỗi LLM nào (timeout, API error, parse) → fallback rule_response nguyên xi.
    """
    rule_response = _chat_rule_based(request, session)

    # Nếu rule-based trả fallback (không match) mà có history → extract sản phẩm
    # đã discuss từ history để LLM có context đúng, thay vì show sản phẩm random.
    _is_fallback = rule_response.reply.startswith("Không tìm thấy")
    if _is_fallback and request.history:
        prev_products = _extract_products_from_history(request.history, session)
        if prev_products:
            rule_response = ChatResponse(
                message=rule_response.message,
                reply=rule_response.reply,
                products=prev_products,
                total=len(prev_products),
                suggestions=rule_response.suggestions,
            )

    from app.services.llm import get_llm_provider, LLMError
    from app.services.llm.metrics import llm_metrics

    provider = get_llm_provider()
    if provider is None:
        llm_metrics.record_no_provider()
        return rule_response

    try:
        llm_reply = _generate_llm_reply(provider, request, rule_response, session)
    except LLMError as e:
        logger.warning("LLM provider failed, using rule-based: %s", e)
        llm_metrics.record_chain_failure()
        return rule_response
    except Exception as e:
        # Defensive: bất kỳ lỗi unexpected nào cũng không được crash chatbot.
        logger.exception("Unexpected LLM error, using rule-based: %s", e)
        return rule_response

    return ChatResponse(
        message=rule_response.message,
        reply=llm_reply,
        products=rule_response.products,
        total=rule_response.total,
        suggestions=rule_response.suggestions,
    )


def stream_chat(request: ChatRequest, session: Session) -> Iterator[dict]:
    """Streaming version của chat_with_ai cho SSE.

    Yield các dict event:
    - {"type": "token", "text": "..."} cho mỗi mảnh reply từ LLM.
    - {"type": "done", "products": [...], "suggestions": [...], "total": N}
      ở cuối, kèm products/suggestions THẬT từ rule-based (DB).

    Mọi lỗi LLM → fallback: yield nguyên reply rule-based 1 lần rồi done.
    Products/giá/tồn kho luôn từ DB, không bao giờ do LLM bịa.
    """
    rule_response = _chat_rule_based(request, session)

    _is_fallback = rule_response.reply.startswith("Không tìm thấy")
    if _is_fallback and request.history:
        prev_products = _extract_products_from_history(request.history, session)
        if prev_products:
            rule_response = ChatResponse(
                message=rule_response.message,
                reply=rule_response.reply,
                products=prev_products,
                total=len(prev_products),
                suggestions=rule_response.suggestions,
            )

    def _done_event() -> dict:
        return {
            "type": "done",
            "products": [p.model_dump(mode="json") for p in rule_response.products],
            "suggestions": rule_response.suggestions,
            "total": rule_response.total,
        }

    from app.core.config import settings
    from app.services.llm import get_llm_provider, LLMError
    from app.services.llm.metrics import llm_metrics

    provider = get_llm_provider()
    if provider is None:
        llm_metrics.record_no_provider()
        yield {"type": "token", "text": rule_response.reply}
        yield _done_event()
        return

    try:
        system_prompt, user_prompt = _build_chat_prompts(request, rule_response, session)
        produced = False
        for chunk in provider.stream_generate(
            system_prompt, user_prompt, timeout=settings.AI_LLM_TIMEOUT_SECONDS
        ):
            if chunk:
                produced = True
                yield {"type": "token", "text": chunk}
        if not produced:
            # LLM không sinh token nào → fallback rule-based reply.
            yield {"type": "token", "text": rule_response.reply}
    except LLMError as e:
        logger.warning("LLM stream failed, using rule-based: %s", e)
        llm_metrics.record_chain_failure()
        yield {"type": "token", "text": rule_response.reply}
    except Exception as e:
        logger.exception("Unexpected LLM stream error, using rule-based: %s", e)
        yield {"type": "token", "text": rule_response.reply}

    yield _done_event()


def _extract_products_from_history(
    history: list, session: Session
) -> list[ChatProductResult]:
    """Extract sản phẩm từ assistant messages trong history.

    Parse product name từ reply text và query DB để lấy Product objects.
    Trả về tối đa 5 sản phẩm gần nhất được nhắc đến.
    """
    # Load chỉ name + id (lightweight) thay vì full product objects
    product_names = list(
        session.exec(
            select(Product.name).where(Product.status == "ACTIVE")
        ).all()
    )
    if not product_names:
        return []

    mentioned_names: list[str] = []
    for item in reversed(history):
        if item.role != "assistant":
            continue
        text = item.content.lower()
        for name in product_names:
            if name.lower() in text and name not in mentioned_names:
                mentioned_names.append(name)
        if len(mentioned_names) >= 5:
            break

    if not mentioned_names:
        return []

    # Query full products cho matched names (single query với IN clause)
    products = list(
        session.exec(
            select(Product).where(
                col(Product.name).in_(mentioned_names[:5]),
                Product.status == "ACTIVE",
            )
        ).all()
    )
    product_map = {p.name: p for p in products}

    results: list[ChatProductResult] = []
    for name in mentioned_names[:5]:
        product = product_map.get(name)
        if product:
            results.append(
                ChatProductResult(
                    product=_product_to_response(product),
                    score=0.8,
                    reason="Sản phẩm từ cuộc trò chuyện trước",
                )
            )
    return results


def _generate_llm_reply(
    provider,
    request: ChatRequest,
    rule_response: ChatResponse,
    session: Session,
) -> str:
    """Build prompt và gọi LLM (non-stream). Raise LLMError khi lỗi."""
    from app.core.config import settings

    system_prompt, user_prompt = _build_chat_prompts(request, rule_response, session)
    return provider.generate(
        system_prompt,
        user_prompt,
        timeout=settings.AI_LLM_TIMEOUT_SECONDS,
    )


def _build_chat_prompts(
    request: ChatRequest,
    rule_response: ChatResponse,
    session: Session,
) -> tuple[str, str]:
    """Build (system_prompt, user_prompt) từ rule-based products.

    Prompt được thiết kế để Gemini trả lời tự nhiên như nhân viên tư vấn:
    - Tránh sáo ngữ marketing (siêu phẩm, giá sốc, đó ạ).
    - Format 3-câu (mở/giá+lý do/follow-up).
    - Follow-up có điều kiện: chỉ hỏi về hãng khi context có ≥2 hãng (tránh
      câu "muốn xem hãng khác không" vô nghĩa khi cửa hàng chỉ có 1 hãng).
    - Brand list được pass tường minh để Gemini không lặp/bịa thương hiệu.
    """
    from app.models.brand import Brand

    if rule_response.products:
        lines = []
        for idx, pr in enumerate(rule_response.products[:5], 1):
            p = pr.product
            if p.sale_price:
                price_str = f"{p.sale_price:,.0f}đ (giá gốc {p.price:,.0f}đ)"
            else:
                price_str = f"{p.price:,.0f}đ"
            lines.append(
                f"{idx}. {p.name} — {price_str} — tồn {p.stock}"
            )
        product_block = "Sản phẩm có sẵn trong cửa hàng:\n" + "\n".join(lines)

        # Resolve brand names từ DB để prompt nói rõ "Hãng trong danh sách",
        # tránh Gemini gợi ý hãng không tồn tại trong context.
        brand_ids = list({pr.product.brand_id for pr in rule_response.products[:5]})
        brand_names: list[str] = []
        if brand_ids:
            brands = list(session.exec(select(Brand).where(Brand.id.in_(brand_ids))).all())
            brand_names = sorted({b.name for b in brands if b and b.name})
        brand_count = len(brand_names)
        if brand_count == 0:
            brand_hint = ""
        elif brand_count == 1:
            brand_hint = (
                f"\n\nHãng duy nhất trong danh sách trên: {brand_names[0]}. "
                f"KHÔNG hỏi khách 'có muốn xem hãng khác không' vì cửa hàng "
                f"chỉ có hãng này trong kết quả."
            )
        else:
            brand_hint = (
                f"\n\nCác hãng trong danh sách trên: {', '.join(brand_names)}. "
                f"Có thể hỏi khách ưu tiên hãng nào nếu phù hợp ngữ cảnh."
            )
    else:
        product_block = "Cửa hàng KHÔNG có sản phẩm nào khớp với yêu cầu."
        brand_hint = ""

    system_prompt = (
        "Bạn là nhân viên tư vấn tại TechSphere AI, cửa hàng thiết bị công nghệ. "
        "Nói chuyện như người thật đang nhắn tin với bạn bè — thoải mái, ngắn gọn, tự nhiên.\n\n"
        "PHONG CÁCH:\n"
        "- Viết như đang chat Zalo/messenger, không phải viết email hay bài văn.\n"
        "- Ngắn gọn, 2-4 câu là đủ. Nhiều khi 1-2 câu cũng được nếu câu hỏi đơn giản.\n"
        "- Xưng \"mình\" hoặc \"bên mình\", gọi khách bằng \"bạn\".\n"
        "- Tự nhiên: có thể dùng \"ồ\", \"à\", \"hmm\", \"okie\", \"nè\", \"nhé\" tuỳ ngữ cảnh.\n"
        "- KHÔNG dùng: \"siêu phẩm\", \"giá cực sốc\", \"đó ạ\", \"nhé ạ\", "
        "\"hàng chính hãng giá tốt\", \"ưu đãi cực hot\".\n"
        "- KHÔNG mở đầu bằng \"Mình tìm thấy\" — nghe như robot. "
        "Thay vào đó nói thẳng vào vấn đề, vd: \"Bên mình có Dell Inspiron nè, giá 15tr — "
        "máy này chạy học tập ok lắm\".\n"
        "- KHÔNG liệt kê hết sản phẩm như catalogue. Chọn 1-2 cái phù hợp nhất, nói như đang gợi ý.\n\n"
        "QUY TẮC:\n"
        "1. CHỈ nhắc sản phẩm, giá, tồn kho có trong CONTEXT. Không bịa.\n"
        "2. Mỗi thương hiệu chỉ nhắc 1 lần, tên ngắn gọn (Apple, Samsung...).\n"
        "3. Không gợi ý hãng không có trong danh sách.\n"
        "Không markdown, không bullet list, không in đậm. Viết như tin nhắn thường.\n"
        "4. Hỏi follow-up 1 câu thôi, tự nhiên — "
        "vd: \"bạn thích hãng nào hơn?\", \"budget tầm bao nhiêu vậy?\", "
        "\"cần gaming hay làm việc chủ yếu?\".\n"
        "5. Nếu không có sản phẩm phù hợp: nói thẳng, gợi ý thử từ khoá khác.\n\n"
        "VÍ DỤ trả lời tự nhiên:\n"
        "\"À laptop học tập budget 15tr thì Dell Inspiron nè, giá ~15tr4, "
        "mỏng nhẹ pin trâu, chạy Word Excel mượt. Bạn cần thêm SSD lớn hay RAM nhiều không?\"\n\n"
        "\"Bên mình có AirPods Pro với Sony WF-1000XM5 đều chống ồn tốt. "
        "AirPods hợp bạn nào dùng iPhone, Sony thì pin trâu hơn. Bạn đang dùng điện thoại gì?\""
    )

    # Build conversation history context (10 tin nhắn gần nhất)
    history_block = ""
    if request.history:
        recent = request.history[-10:]
        lines = []
        for item in recent:
            role_label = "Khách" if item.role == "user" else "Tư vấn viên"
            lines.append(f"{role_label}: {item.content}")
        history_block = "Lịch sử trò chuyện:\n" + "\n".join(lines) + "\n\n"

    user_prompt = (
        f"{history_block}"
        f"Khách hỏi: {request.message}\n\n"
        f"{product_block}"
        f"{brand_hint}\n\n"
        "Hãy tư vấn theo đúng phong cách và cấu trúc đã quy định. "
        "Nếu lịch sử trò chuyện có context trước đó, hãy trả lời liền mạch "
        "với cuộc trò chuyện — không giới thiệu lại từ đầu."
    )

    return system_prompt, user_prompt


def _chat_rule_based(request: ChatRequest, session: Session) -> ChatResponse:
    """Chatbot tư vấn sản phẩm rule-based (legacy logic — dùng làm fallback)."""
    message_lower = request.message.lower()

    # Extract entities
    category_slug = _extract_category(message_lower)
    brand_slug = _extract_brand(message_lower)
    min_price, max_price = _extract_budget(message_lower)
    needs = _extract_needs(message_lower)

    # Build query conditions
    conditions = [Product.status == "ACTIVE", Product.stock > 0]

    if category_slug:
        category = session.exec(
            select(Category).where(Category.slug == category_slug)
        ).first()
        if category:
            conditions.append(Product.category_id == category.id)

    if brand_slug:
        brand = session.exec(
            select(Brand).where(Brand.slug == brand_slug)
        ).first()
        if brand:
            conditions.append(Product.brand_id == brand.id)

    if min_price is not None:
        conditions.append(Product.price >= min_price)
    if max_price is not None:
        conditions.append(Product.price <= max_price)

    # Query products
    statement = select(Product).where(*conditions).limit(request.limit * 2)
    candidates = list(session.exec(statement).all())

    # Resolve brand/category once before scoring loop
    brand_obj = session.exec(select(Brand).where(Brand.slug == brand_slug)).first() if brand_slug else None
    category_obj = session.exec(select(Category).where(Category.slug == category_slug)).first() if category_slug else None

    # Score and rank
    scored: list[tuple[Product, float, str]] = []
    for product in candidates:
        score = 0.5
        reasons = []

        if brand_obj and product.brand_id == brand_obj.id:
            score += 0.3
            reasons.append(f"thương hiệu {brand_obj.name}")

        if category_obj and product.category_id == category_obj.id:
            score += 0.2
            reasons.append(f"danh mục {category_obj.name}")

        if max_price and product.price <= max_price:
            score += 0.2
            reasons.append("trong ngân sách")

        if product.sale_price:
            score += 0.1
            reasons.append("đang giảm giá")

        if needs:
            cat_name = _get_category_name(session, product.category_id).lower()
            desc = (product.description or "").lower()
            name = product.name.lower()

            for need in needs:
                if need == "hoc-tap" and ("laptop" in cat_name or "tablet" in cat_name):
                    score += 0.15
                    reasons.append("phù hợp học tập")
                elif need == "cong-viec" and ("laptop" in cat_name or "tablet" in cat_name):
                    score += 0.15
                    reasons.append("phù hợp công việc")
                elif need == "gaming" and ("laptop" in cat_name or "gaming" in name or "rog" in name or "tuf" in name or "legion" in name or "omen" in name):
                    score += 0.15
                    reasons.append("phù hợp gaming")
                elif need == "chup-anh" and ("điện thoại" in cat_name or "camera" in desc):
                    score += 0.15
                    reasons.append("chụp ảnh tốt")
                elif need == "nghe-nhạc" and ("tai nghe" in cat_name or "loa" in cat_name):
                    score += 0.15
                    reasons.append("phù hợp nghe nhạc")
                elif need == "chong-on" and ("tai nghe" in cat_name or "chống ồn" in desc or "anc" in desc):
                    score += 0.15
                    reasons.append("chống ồn")
                elif need == "mong-nhe" and ("mỏng" in desc or "nhẹ" in desc or "ultrabook" in desc or product.price >= 15_000_000):
                    score += 0.1
                    reasons.append("mỏng nhẹ")
                elif need == "pin-trau" and ("pin" in desc):
                    score += 0.1
                    reasons.append("pin trâu")
                elif need == "man-hinh-dep" and ("oled" in desc or "retina" in desc or "amoled" in desc or "4k" in desc):
                    score += 0.1
                    reasons.append("màn hình đẹp")
                elif need == "hieu-nang" and (product.price >= 20_000_000 or "mạnh" in desc or "high" in desc):
                    score += 0.1
                    reasons.append("hiệu năng cao")

        reason = _build_product_reason(product, session, max_price)
        if reasons:
            reason = " + ".join(reasons) + " → " + reason

        scored.append((product, min(score, 1.0), reason))

    scored.sort(key=lambda x: x[1], reverse=True)
    top = scored[:request.limit]

    # Fallback if no results
    if not top:
        return _chat_fallback(request, session, category_slug, brand_slug)

    # Build response
    products = [
        ChatProductResult(
            product=_product_to_response(p),
            score=round(s, 2),
            reason=r,
        )
        for p, s, r in top
    ]

    reply = _generate_reply(request.message, category_slug, brand_slug, max_price, len(top), session)
    suggestions = _generate_suggestions(category_slug, brand_slug, session)

    return ChatResponse(
        message=request.message,
        reply=reply,
        products=products,
        total=len(scored),
        suggestions=suggestions,
    )


def _chat_fallback(
    request: ChatRequest,
    session: Session,
    category_slug: Optional[str],
    brand_slug: Optional[str],
) -> ChatResponse:
    """Fallback to popular/latest products when no match found."""
    popular = _get_popular_products(session, set(), request.limit)

    if popular:
        products = [
            ChatProductResult(
                product=_product_to_response(p),
                score=round(s, 2),
                reason=f"Sản phẩm phổ biến ({r})",
            )
            for p, s, r in popular
        ]
        reply = "Không tìm thấy sản phẩm phù hợp yêu cầu của bạn. Đây là những sản phẩm phổ biến nhất:"
    else:
        latest = _get_latest_products(session, set(), request.limit)
        products = [
            ChatProductResult(
                product=_product_to_response(p),
                score=round(s, 2),
                reason="Sản phẩm mới",
            )
            for p, s, r in latest
        ]
        reply = "Không tìm thấy sản phẩm phù hợp. Đây là những sản phẩm mới nhất:"

    suggestions = [
        "Bạn có thể thử tìm theo danh mục: điện thoại, laptop, tablet, tai nghe, phụ kiện",
        "Hoặc theo thương hiệu: Apple, Samsung, Sony, Dell, Xiaomi",
    ]

    return ChatResponse(
        message=request.message,
        reply=reply,
        products=products,
        total=len(products),
        suggestions=suggestions,
    )


def _generate_reply(
    message: str,
    category_slug: Optional[str],
    brand_slug: Optional[str],
    max_price: Optional[float],
    count: int,
    session: Session,
) -> str:
    """Generate natural language reply."""
    parts = ["Mình tìm thấy"]

    if count == 1:
        parts.append("1 sản phẩm phù hợp:")
    else:
        parts.append(f"{count} sản phẩm phù hợp:")

    details = []
    if category_slug:
        cat = session.exec(select(Category).where(Category.slug == category_slug)).first()
        if cat:
            details.append(f"danh mục {cat.name.lower()}")
    if brand_slug:
        brand = session.exec(select(Brand).where(Brand.slug == brand_slug)).first()
        if brand:
            details.append(f"thương hiệu {brand.name}")
    if max_price:
        if max_price >= 1_000_000:
            details.append(f"giá dưới {max_price/1_000_000:.0f} triệu")
        else:
            details.append(f"giá dưới {max_price:,.0f}đ")

    if details:
        parts.append("(" + ", ".join(details) + ")")

    return " ".join(parts)
