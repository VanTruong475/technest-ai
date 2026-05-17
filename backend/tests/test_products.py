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
        price=999.0,
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
