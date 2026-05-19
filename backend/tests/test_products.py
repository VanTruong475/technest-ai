from fastapi.testclient import TestClient
from sqlmodel import Session

from app.models.category import Category
from app.models.brand import Brand
from app.models.product import Product


def test_list_products_empty(client: TestClient):
    response = client.get("/api/products")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert "page" in data
    assert "limit" in data
    assert "total_pages" in data
    assert data["items"] == []
    assert data["total"] == 0


def test_list_products_with_data(client: TestClient, session: Session):
    category = Category(name="Phones", slug="phones", description="Smartphones")
    session.add(category)
    session.commit()
    session.refresh(category)

    brand = Brand(name="Apple", slug="apple")
    session.add(brand)
    session.commit()
    session.refresh(brand)

    product = Product(
        name="iPhone 15",
        slug="iphone-15",
        description="Latest iPhone",
        price=19990000,
        stock=10,
        status="ACTIVE",
        category_id=category.id,
        brand_id=brand.id,
    )
    session.add(product)
    session.commit()

    response = client.get("/api/products")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert len(data["items"]) == 1
    assert data["items"][0]["name"] == "iPhone 15"


def test_list_products_pagination(client: TestClient, session: Session):
    category = Category(name="Phones", slug="phones", description="Smartphones")
    session.add(category)
    session.commit()
    session.refresh(category)

    brand = Brand(name="Apple", slug="apple")
    session.add(brand)
    session.commit()
    session.refresh(brand)

    for i in range(15):
        product = Product(
            name=f"Product {i}",
            slug=f"product-{i}",
            description=f"Product {i}",
            price=100.0 + i,
            stock=10,
            status="ACTIVE",
            category_id=category.id,
            brand_id=brand.id,
        )
        session.add(product)
    session.commit()

    response = client.get("/api/products?page=1&limit=10")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 15
    assert len(data["items"]) == 10
    assert data["page"] == 1
    assert data["total_pages"] == 2

    response = client.get("/api/products?page=2&limit=10")
    data = response.json()
    assert len(data["items"]) == 5


def test_sort_newest(client: TestClient, session: Session):
    from datetime import datetime, timezone, timedelta

    category = Category(name="Phones", slug="phones", description="Smartphones")
    session.add(category)
    session.commit()
    session.refresh(category)

    brand = Brand(name="Apple", slug="apple")
    session.add(brand)
    session.commit()
    session.refresh(brand)

    p1 = Product(name="Old", slug="old", price=10000, stock=10, status="ACTIVE",
                 category_id=category.id, brand_id=brand.id,
                 created_at=datetime.now(timezone.utc) - timedelta(hours=1))
    session.add(p1)
    session.commit()

    p2 = Product(name="New", slug="new", price=20000, stock=10, status="ACTIVE",
                 category_id=category.id, brand_id=brand.id)
    session.add(p2)
    session.commit()

    response = client.get("/api/products?sort=newest")
    assert response.status_code == 200
    data = response.json()
    assert data["items"][0]["name"] == "New"
    assert data["items"][1]["name"] == "Old"


def test_sort_price_asc(client: TestClient, session: Session):
    category = Category(name="Phones", slug="phones", description="Smartphones")
    session.add(category)
    session.commit()
    session.refresh(category)

    brand = Brand(name="Apple", slug="apple")
    session.add(brand)
    session.commit()
    session.refresh(brand)

    Product(name="Expensive", slug="expensive", price=30000000, stock=10, status="ACTIVE",
            category_id=category.id, brand_id=brand.id)
    session.add(Product(name="Cheap", slug="cheap", price=5000000, stock=10, status="ACTIVE",
                        category_id=category.id, brand_id=brand.id))
    session.add(Product(name="Mid", slug="mid", price=15000000, stock=10, status="ACTIVE",
                        category_id=category.id, brand_id=brand.id))
    session.commit()

    response = client.get("/api/products?sort=price_asc")
    assert response.status_code == 200
    data = response.json()
    prices = [item["price"] for item in data["items"]]
    assert prices == sorted(prices)


def test_sort_price_desc(client: TestClient, session: Session):
    category = Category(name="Phones", slug="phones", description="Smartphones")
    session.add(category)
    session.commit()
    session.refresh(category)

    brand = Brand(name="Apple", slug="apple")
    session.add(brand)
    session.commit()
    session.refresh(brand)

    session.add(Product(name="Cheap", slug="cheap2", price=5000000, stock=10, status="ACTIVE",
                        category_id=category.id, brand_id=brand.id))
    session.add(Product(name="Expensive", slug="expensive2", price=30000000, stock=10, status="ACTIVE",
                        category_id=category.id, brand_id=brand.id))
    session.commit()

    response = client.get("/api/products?sort=price_desc")
    assert response.status_code == 200
    data = response.json()
    prices = [item["price"] for item in data["items"]]
    assert prices == sorted(prices, reverse=True)


def test_sort_invalid(client: TestClient):
    response = client.get("/api/products?sort=invalid_sort")
    assert response.status_code == 400
    assert "Invalid sort" in response.json()["detail"]


def test_price_range_filter(client: TestClient, session: Session):
    category = Category(name="Phones", slug="phones", description="Smartphones")
    session.add(category)
    session.commit()
    session.refresh(category)

    brand = Brand(name="Apple", slug="apple")
    session.add(brand)
    session.commit()
    session.refresh(brand)

    session.add(Product(name="Cheap", slug="cheap3", price=3000000, stock=10, status="ACTIVE",
                        category_id=category.id, brand_id=brand.id))
    session.add(Product(name="Mid", slug="mid3", price=10000000, stock=10, status="ACTIVE",
                        category_id=category.id, brand_id=brand.id))
    session.add(Product(name="Expensive", slug="expensive3", price=30000000, stock=10, status="ACTIVE",
                        category_id=category.id, brand_id=brand.id))
    session.commit()

    # Under 5M
    r = client.get("/api/products?max_price=5000000")
    assert r.json()["total"] == 1
    assert r.json()["items"][0]["name"] == "Cheap"

    # 5M - 20M
    r = client.get("/api/products?min_price=5000000&max_price=20000000")
    assert r.json()["total"] == 1
    assert r.json()["items"][0]["name"] == "Mid"

    # Over 20M
    r = client.get("/api/products?min_price=20000000")
    assert r.json()["total"] == 1
    assert r.json()["items"][0]["name"] == "Expensive"
