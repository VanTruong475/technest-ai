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
