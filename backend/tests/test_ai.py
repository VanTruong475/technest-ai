from fastapi.testclient import TestClient
from sqlmodel import Session

from app.models.category import Category
from app.models.brand import Brand
from app.models.product import Product


def test_ai_search_empty(client: TestClient):
    response = client.post("/api/ai/search", json={
        "query": "iphone",
        "limit": 10,
    })
    assert response.status_code == 200
    data = response.json()
    assert "query" in data
    assert "results" in data
    assert "total" in data
    assert data["query"] == "iphone"
    assert data["results"] == []
    assert data["total"] == 0


def test_ai_search_with_results(client: TestClient, session: Session):
    category = Category(name="Phones", slug="phones", description="Smartphones")
    session.add(category)
    session.commit()
    session.refresh(category)

    brand = Brand(name="Apple", slug="apple")
    session.add(brand)
    session.commit()
    session.refresh(brand)

    product = Product(
        name="iPhone 15 Pro",
        slug="iphone-15-pro",
        description="Latest iPhone Pro",
        price=29990000,
        stock=10,
        status="ACTIVE",
        category_id=category.id,
        brand_id=brand.id,
    )
    session.add(product)
    session.commit()

    response = client.post("/api/ai/search", json={
        "query": "iphone pro",
        "limit": 10,
    })
    assert response.status_code == 200
    data = response.json()
    assert data["query"] == "iphone pro"
    assert data["total"] > 0
    assert len(data["results"]) > 0

    first_result = data["results"][0]
    assert "product" in first_result
    assert "score" in first_result
    assert "reason" in first_result
    assert first_result["product"]["name"] == "iPhone 15 Pro"


def test_ai_search_empty_query(client: TestClient):
    response = client.post("/api/ai/search", json={
        "query": "",
        "limit": 10,
    })
    assert response.status_code == 422


def test_ai_recommend_popular(client: TestClient, session: Session):
    response = client.get("/api/ai/recommend?strategy=popular&limit=5")
    assert response.status_code == 200
    data = response.json()
    assert "strategy" in data
    assert "results" in data
    assert "total" in data
    assert data["strategy"] == "popular"


def test_ai_response_includes_image_url(client: TestClient, session: Session):
    """Regression test: _product_to_response trước đây quên truyền image_url
    → FE hiển thị 📦 fallback ở Home "Phổ biến nhất", chat results, search,
    "Có thể bạn cũng thích". Phải đảm bảo mọi AI response trả product có
    field image_url khớp DB."""
    from app.models.category import Category
    from app.models.brand import Brand
    from app.models.product import Product

    category = Category(name="Laptop", slug="laptop-img", description="x")
    brand = Brand(name="Dell", slug="dell-img")
    session.add(category)
    session.add(brand)
    session.commit()
    session.refresh(category)
    session.refresh(brand)

    product = Product(
        name="Dell XPS Test",
        slug="dell-xps-img-test",
        description="Test laptop with image",
        price=20_000_000,
        stock=10,
        status="ACTIVE",
        category_id=category.id,
        brand_id=brand.id,
        image_url="https://example.com/dell-xps.jpg",
    )
    session.add(product)
    session.commit()

    # 1. Smart search response phải có image_url
    res = client.post("/api/ai/search", json={"query": "Dell XPS", "limit": 5})
    assert res.status_code == 200
    results = res.json()["results"]
    assert len(results) > 0
    assert results[0]["product"]["image_url"] == "https://example.com/dell-xps.jpg"

    # 2. Recommend popular cũng phải có image_url
    res = client.get("/api/ai/recommend?strategy=popular&limit=5")
    assert res.status_code == 200
    # Có thể empty nếu chưa có order_items — chỉ check shape khi có results
    for r in res.json()["results"]:
        assert "image_url" in r["product"]

    # 3. Chat response cũng phải có image_url
    res = client.post("/api/ai/chat", json={"message": "Dell XPS", "limit": 3})
    assert res.status_code == 200
    for r in res.json()["products"]:
        assert "image_url" in r["product"]
        # Sản phẩm vừa tạo phải xuất hiện và có URL chính xác
        if r["product"]["id"] == product.id:
            assert r["product"]["image_url"] == "https://example.com/dell-xps.jpg"


def test_ai_recommend_cart_requires_auth(client: TestClient):
    response = client.get("/api/ai/recommend?strategy=cart&limit=5")
    assert response.status_code == 401


def test_ai_recommend_invalid_strategy(client: TestClient):
    response = client.get("/api/ai/recommend?strategy=invalid&limit=5")
    assert response.status_code == 400


# ─────────────────────────────────────────────
# AI Chat Tests
# ─────────────────────────────────────────────

def _create_test_products(session: Session) -> None:
    """Helper: tạo test products cho chatbot tests."""
    category = Category(name="Laptop", slug="laptop", description="Máy tính xách tay")
    session.add(category)
    session.commit()
    session.refresh(category)

    brand = Brand(name="Dell", slug="dell")
    session.add(brand)
    session.commit()
    session.refresh(brand)

    product = Product(
        name="Dell XPS 15",
        slug="dell-xps-15",
        description="Laptop cao cấp màn hình InfinityEdge",
        price=15_000_000,
        sale_price=14_000_000,
        stock=10,
        status="ACTIVE",
        category_id=category.id,
        brand_id=brand.id,
    )
    session.add(product)
    session.commit()


def test_chat_empty_message(client: TestClient):
    response = client.post("/api/ai/chat", json={"message": "", "limit": 5})
    assert response.status_code == 422


def test_chat_basic(client: TestClient, session: Session):
    _create_test_products(session)

    response = client.post("/api/ai/chat", json={"message": "tư vấn laptop", "limit": 5})
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert "reply" in data
    assert "products" in data
    assert "total" in data
    assert "suggestions" in data
    assert data["message"] == "tư vấn laptop"


def test_chat_by_category(client: TestClient, session: Session):
    _create_test_products(session)

    response = client.post("/api/ai/chat", json={"message": "gợi ý laptop", "limit": 5})
    assert response.status_code == 200
    data = response.json()
    assert data["total"] > 0
    assert len(data["products"]) > 0
    assert "laptop" in data["reply"].lower() or "Laptop" in data["reply"]


def test_chat_by_brand(client: TestClient, session: Session):
    _create_test_products(session)

    response = client.post("/api/ai/chat", json={"message": "sản phẩm Dell", "limit": 5})
    assert response.status_code == 200
    data = response.json()
    assert data["total"] > 0
    assert data["products"][0]["product"]["name"] == "Dell XPS 15"


def test_chat_by_budget(client: TestClient, session: Session):
    _create_test_products(session)

    response = client.post("/api/ai/chat", json={"message": "laptop dưới 20 triệu", "limit": 5})
    assert response.status_code == 200
    data = response.json()
    assert data["total"] > 0
    # Product price 15M < 20M budget
    assert data["products"][0]["product"]["price"] <= 20_000_000


def test_chat_budget_too_low(client: TestClient, session: Session):
    _create_test_products(session)

    response = client.post("/api/ai/chat", json={"message": "laptop dưới 1 triệu", "limit": 5})
    assert response.status_code == 200
    data = response.json()
    # No products match, should fallback
    assert "products" in data
    assert len(data["products"]) > 0  # Fallback returns popular/latest


def test_chat_by_need(client: TestClient, session: Session):
    _create_test_products(session)

    response = client.post("/api/ai/chat", json={"message": "laptop cho học tập", "limit": 5})
    assert response.status_code == 200
    data = response.json()
    assert data["total"] > 0


def test_chat_combined(client: TestClient, session: Session):
    _create_test_products(session)

    response = client.post("/api/ai/chat", json={"message": "laptop Dell dưới 20 triệu cho công việc", "limit": 5})
    assert response.status_code == 200
    data = response.json()
    assert data["total"] > 0
    assert data["products"][0]["product"]["name"] == "Dell XPS 15"


def test_chat_no_match_fallback(client: TestClient, session: Session):
    # Create a Sony brand and Tai nghe category so the chatbot can filter properly
    # but no matching products exist → should fallback
    category = Category(name="Tai nghe", slug="tai-nghe", description="Tai nghe")
    session.add(category)
    session.commit()
    session.refresh(category)

    brand = Brand(name="Sony", slug="sony")
    session.add(brand)
    session.commit()
    session.refresh(brand)

    # No Sony headphones in DB, only Dell laptop exists
    _create_test_products(session)

    response = client.post("/api/ai/chat", json={"message": "tai nghe Sony chống ồn", "limit": 5})
    assert response.status_code == 200
    data = response.json()
    # No Sony headphones exist, should fallback
    assert "products" in data
    assert len(data["products"]) > 0
    assert "phổ biến" in data["reply"] or "mới nhất" in data["reply"]


def test_chat_response_structure(client: TestClient, session: Session):
    _create_test_products(session)

    response = client.post("/api/ai/chat", json={"message": "gợi ý sản phẩm", "limit": 3})
    assert response.status_code == 200
    data = response.json()

    assert isinstance(data["message"], str)
    assert isinstance(data["reply"], str)
    assert isinstance(data["products"], list)
    assert isinstance(data["total"], int)
    assert isinstance(data["suggestions"], list)

    if data["products"]:
        product = data["products"][0]
        assert "product" in product
        assert "score" in product
        assert "reason" in product
        assert isinstance(product["score"], float)


# ─────────────────────────────────────────────
# Co-occurrence Recommendation Tests
# ─────────────────────────────────────────────


def _make_product(session: Session, category_id: int, brand_id: int, name: str, stock: int = 10) -> Product:
    p = Product(
        name=name,
        slug=name.lower().replace(" ", "-"),
        description=name,
        price=10_000_000,
        stock=stock,
        status="ACTIVE",
        category_id=category_id,
        brand_id=brand_id,
    )
    session.add(p)
    session.commit()
    session.refresh(p)
    return p


def _create_order_with_items(session: Session, user_id: int, product_ids: list[int]) -> None:
    """Tạo 1 order COMPLETED chứa các product_ids — bypass cart/checkout flow
    để tests chạy nhanh và focus vào co-occurrence logic."""
    from app.models.order import Order, OrderItem

    order = Order(
        user_id=user_id,
        total_amount=0,
        status="COMPLETED",
        shipping_address="test",
        phone="0900000000",
    )
    session.add(order)
    session.flush()
    for pid in product_ids:
        session.add(OrderItem(
            order_id=order.id,
            product_id=pid,
            product_name="x",
            price=0,
            quantity=1,
            subtotal=0,
        ))
    session.commit()


def test_co_occurrence_returns_top_co_purchased_products(
    client: TestClient, session: Session, test_user
):
    """Anchor P1 + 3 đơn [P1,P2], [P1,P2], [P1,P3] → P2 (count=2) đầu, P3 (count=1) sau."""
    category = Category(name="C", slug="c", description="x")
    brand = Brand(name="B", slug="b")
    session.add(category)
    session.add(brand)
    session.commit()
    session.refresh(category)
    session.refresh(brand)

    p1 = _make_product(session, category.id, brand.id, "Anchor")
    p2 = _make_product(session, category.id, brand.id, "Co P2")
    p3 = _make_product(session, category.id, brand.id, "Co P3")

    _create_order_with_items(session, test_user.id, [p1.id, p2.id])
    _create_order_with_items(session, test_user.id, [p1.id, p2.id])
    _create_order_with_items(session, test_user.id, [p1.id, p3.id])

    response = client.get(f"/api/ai/recommend?strategy=co_occurrence&product_id={p1.id}&limit=5")

    assert response.status_code == 200
    data = response.json()
    assert data["strategy"] == "co_occurrence"
    assert len(data["results"]) == 2
    assert data["results"][0]["product"]["id"] == p2.id
    assert data["results"][1]["product"]["id"] == p3.id
    # Score normalized: P2 cao nhất (1.0), P3 thấp hơn
    assert data["results"][0]["score"] == 1.0
    assert data["results"][1]["score"] < 1.0
    # Reason hợp lý
    assert "mua sản phẩm này cũng mua" in data["results"][0]["reason"]


def test_co_occurrence_excludes_anchor_itself(
    client: TestClient, session: Session, test_user
):
    """Anchor không bao giờ tự gợi ý chính nó dù có trong đơn."""
    category = Category(name="C", slug="c", description="x")
    brand = Brand(name="B", slug="b")
    session.add(category)
    session.add(brand)
    session.commit()
    session.refresh(category)
    session.refresh(brand)

    p1 = _make_product(session, category.id, brand.id, "Anchor")
    p2 = _make_product(session, category.id, brand.id, "Co")

    _create_order_with_items(session, test_user.id, [p1.id, p2.id])

    response = client.get(f"/api/ai/recommend?strategy=co_occurrence&product_id={p1.id}&limit=5")

    assert response.status_code == 200
    product_ids = [r["product"]["id"] for r in response.json()["results"]]
    assert p1.id not in product_ids


def test_co_occurrence_skips_inactive_products(
    client: TestClient, session: Session, test_user
):
    """Co-product INACTIVE → không xuất hiện trong kết quả."""
    category = Category(name="C", slug="c", description="x")
    brand = Brand(name="B", slug="b")
    session.add(category)
    session.add(brand)
    session.commit()
    session.refresh(category)
    session.refresh(brand)

    p1 = _make_product(session, category.id, brand.id, "Anchor")
    p2 = _make_product(session, category.id, brand.id, "Inactive co")
    p3 = _make_product(session, category.id, brand.id, "Active co")

    _create_order_with_items(session, test_user.id, [p1.id, p2.id, p3.id])

    # Deactivate p2
    p2.status = "INACTIVE"
    session.add(p2)
    session.commit()

    response = client.get(f"/api/ai/recommend?strategy=co_occurrence&product_id={p1.id}&limit=5")

    product_ids = [r["product"]["id"] for r in response.json()["results"]]
    assert p3.id in product_ids
    assert p2.id not in product_ids


def test_co_occurrence_falls_back_to_category(
    client: TestClient, session: Session
):
    """Anchor chưa có đơn nào → fallback sản phẩm cùng category."""
    category = Category(name="C", slug="c", description="x")
    brand = Brand(name="B", slug="b")
    session.add(category)
    session.add(brand)
    session.commit()
    session.refresh(category)
    session.refresh(brand)

    p1 = _make_product(session, category.id, brand.id, "Anchor")
    p2 = _make_product(session, category.id, brand.id, "Same cat")
    # Không tạo order nào với p1

    response = client.get(f"/api/ai/recommend?strategy=co_occurrence&product_id={p1.id}&limit=5")

    assert response.status_code == 200
    data = response.json()
    product_ids = [r["product"]["id"] for r in data["results"]]
    assert p2.id in product_ids
    assert p1.id not in product_ids
    # Reason chỉ rõ đây là fallback category
    assert "danh mục" in data["results"][0]["reason"].lower() or "category" in data["results"][0]["reason"].lower()


def test_co_occurrence_falls_back_to_popular_when_no_category_match(
    client: TestClient, session: Session, test_user
):
    """Anchor cô đơn trong category + có sản phẩm khác có đơn → fallback popular."""
    cat1 = Category(name="C1", slug="c1", description="x")
    cat2 = Category(name="C2", slug="c2", description="x")
    brand = Brand(name="B", slug="b")
    session.add(cat1)
    session.add(cat2)
    session.add(brand)
    session.commit()
    session.refresh(cat1)
    session.refresh(cat2)
    session.refresh(brand)

    p_anchor = _make_product(session, cat1.id, brand.id, "Anchor alone")
    p_other = _make_product(session, cat2.id, brand.id, "Popular elsewhere")
    # Tạo đơn cho p_other (không có anchor)
    _create_order_with_items(session, test_user.id, [p_other.id])

    response = client.get(f"/api/ai/recommend?strategy=co_occurrence&product_id={p_anchor.id}&limit=5")

    assert response.status_code == 200
    data = response.json()
    product_ids = [r["product"]["id"] for r in data["results"]]
    assert p_other.id in product_ids
    assert p_anchor.id not in product_ids


def test_co_occurrence_requires_product_id(client: TestClient):
    """strategy=co_occurrence mà thiếu product_id → 400."""
    response = client.get("/api/ai/recommend?strategy=co_occurrence&limit=5")
    assert response.status_code == 400
    assert "product_id" in response.json()["detail"]


def test_co_occurrence_returns_404_when_product_not_found(client: TestClient):
    """product_id không tồn tại → 404."""
    response = client.get("/api/ai/recommend?strategy=co_occurrence&product_id=99999&limit=5")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_co_occurrence_is_public(client: TestClient, session: Session, product: Product):
    """Endpoint không yêu cầu JWT (giống strategy=popular)."""
    response = client.get(f"/api/ai/recommend?strategy=co_occurrence&product_id={product.id}&limit=5")
    # Có thể trả empty/fallback nhưng phải 200, không 401
    assert response.status_code == 200


def test_co_occurrence_respects_limit(
    client: TestClient, session: Session, test_user
):
    """limit=2 → trả tối đa 2 kết quả dù có nhiều co-occurrence."""
    category = Category(name="C", slug="c", description="x")
    brand = Brand(name="B", slug="b")
    session.add(category)
    session.add(brand)
    session.commit()
    session.refresh(category)
    session.refresh(brand)

    p_anchor = _make_product(session, category.id, brand.id, "Anchor")
    co_products = [
        _make_product(session, category.id, brand.id, f"Co {i}")
        for i in range(5)
    ]
    for co in co_products:
        _create_order_with_items(session, test_user.id, [p_anchor.id, co.id])

    response = client.get(f"/api/ai/recommend?strategy=co_occurrence&product_id={p_anchor.id}&limit=2")

    assert response.status_code == 200
    assert len(response.json()["results"]) == 2


def test_co_occurrence_invalid_strategy_listed_in_error(client: TestClient):
    """Strategy không hợp lệ → 400 và message liệt kê co_occurrence trong danh sách."""
    response = client.get("/api/ai/recommend?strategy=invalid&limit=5")
    assert response.status_code == 400
    assert "co_occurrence" in response.json()["detail"]


# ─────────────────────────────────────────────
# Synonym dictionary tests
# ─────────────────────────────────────────────

def test_expand_synonyms_basic():
    """Từ viết tắt được mở rộng đúng."""
    from app.services.ai_service import _expand_synonyms
    result = _expand_synonyms(["đt"])
    assert "đt" in result
    assert "điện thoại" in result


def test_expand_synonyms_no_match():
    """Từ không có synonym → giữ nguyên."""
    from app.services.ai_service import _expand_synonyms
    result = _expand_synonyms(["iphone"])
    assert result == ["iphone"]


def test_expand_synonyms_dedup():
    """Từ trùng lặp bị loại bỏ."""
    from app.services.ai_service import _expand_synonyms
    result = _expand_synonyms(["mac", "macbook"])
    # mac → macbook, macbook → mac + macbook → dedup
    assert len(result) == len(set(result))
    assert "mac" in result
    assert "macbook" in result


def test_expand_synonyms_brand():
    """Brand name mở rộng đúng."""
    from app.services.ai_service import _expand_synonyms
    result = _expand_synonyms(["apple"])
    assert "apple" in result
    assert "iphone" in result
    assert "macbook" in result


def test_expand_synonyms_sale_keyword():
    """Từ khóa sale mở rộng đúng."""
    from app.services.ai_service import _expand_synonyms
    result = _expand_synonyms(["rẻ"])
    assert "giảm giá" in result
    assert "sale" in result


def test_smart_search_synonym_integration(client: TestClient, session: Session):
    """Tìm 'mac' vẫn ra sản phẩm Macbook nhờ synonym expansion."""
    category = Category(name="Laptop", slug="laptop-synonym", description="Laptop computers")
    session.add(category)
    session.commit()
    session.refresh(category)

    brand = Brand(name="Apple", slug="apple-synonym")
    session.add(brand)
    session.commit()
    session.refresh(brand)

    product = Product(
        name="MacBook Pro 14 inch",
        slug="macbook-pro-14-synonym-test",
        description="Laptop Apple MacBook Pro",
        price=39990000,
        stock=5,
        status="ACTIVE",
        category_id=category.id,
        brand_id=brand.id,
    )
    session.add(product)
    session.commit()

    # Tìm bằng từ viết tắt "mac" — synonym sẽ mở rộng thành "macbook"
    response = client.post("/api/ai/search", json={
        "query": "mac",
        "limit": 10,
    })
    assert response.status_code == 200
    data = response.json()
    assert data["total"] > 0
    assert any("MacBook" in r["product"]["name"] for r in data["results"])
