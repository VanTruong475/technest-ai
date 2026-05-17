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
        price=1199.0,
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
