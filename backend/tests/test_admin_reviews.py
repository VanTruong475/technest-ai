from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.models.product import Product
from app.models.review import Review
from app.models.user import User


def _create_review(
    session: Session,
    user: User,
    product: Product,
    rating: int = 5,
    comment: str = "Good product",
) -> Review:
    review = Review(
        user_id=user.id,
        product_id=product.id,
        rating=rating,
        comment=comment,
    )
    session.add(review)
    session.commit()
    session.refresh(review)
    return review


# --- Authorization tests ---


def test_reviews_requires_auth(client: TestClient) -> None:
    response = client.get("/api/admin/reviews")
    assert response.status_code == 401


def test_reviews_requires_admin(client: TestClient, user_token: str) -> None:
    response = client.get("/api/admin/reviews", headers={"Authorization": f"Bearer {user_token}"})
    assert response.status_code == 403


def test_delete_review_requires_auth(client: TestClient) -> None:
    response = client.delete("/api/admin/reviews/1")
    assert response.status_code == 401


def test_delete_review_requires_admin(client: TestClient, user_token: str) -> None:
    response = client.delete("/api/admin/reviews/1", headers={"Authorization": f"Bearer {user_token}"})
    assert response.status_code == 403


# --- List reviews tests ---


def test_list_reviews_empty(client: TestClient, admin_token: str) -> None:
    response = client.get("/api/admin/reviews", headers={"Authorization": f"Bearer {admin_token}"})
    assert response.status_code == 200
    data = response.json()

    assert data["items"] == []
    assert data["total"] == 0
    assert data["page"] == 1
    assert data["limit"] == 20
    assert data["total_pages"] == 1


def test_list_reviews(
    client: TestClient,
    admin_token: str,
    session: Session,
    test_user: User,
    admin_user: User,
    product: Product,
) -> None:
    _create_review(session, test_user, product, rating=4, comment="Good")
    _create_review(session, admin_user, product, rating=5, comment="Excellent")

    response = client.get("/api/admin/reviews", headers={"Authorization": f"Bearer {admin_token}"})
    assert response.status_code == 200
    data = response.json()

    assert data["total"] == 2
    assert len(data["items"]) == 2
    # Newest first
    assert data["items"][0]["rating"] == 5
    assert data["items"][1]["rating"] == 4


def test_list_reviews_response_structure(
    client: TestClient,
    admin_token: str,
    session: Session,
    test_user: User,
    product: Product,
) -> None:
    _create_review(session, test_user, product, rating=3, comment="OK")

    response = client.get("/api/admin/reviews", headers={"Authorization": f"Bearer {admin_token}"})
    data = response.json()

    item = data["items"][0]
    assert "id" in item
    assert "user_id" in item
    assert "user_name" in item
    assert "product_id" in item
    assert "product_name" in item
    assert "rating" in item
    assert "comment" in item
    assert "created_at" in item
    assert "updated_at" in item

    assert item["user_name"] == test_user.full_name
    assert item["product_name"] == product.name


def test_list_reviews_pagination(
    client: TestClient,
    admin_token: str,
    session: Session,
    test_user: User,
    product: Product,
) -> None:
    from app.models.category import Category
    from app.models.brand import Brand

    category = session.exec(select(Category)).first()
    brand = session.exec(select(Brand)).first()

    for i in range(15):
        p = Product(
            name=f"Pagination Product {i}",
            slug=f"pagination-product-{i}",
            description="Test",
            price=1000000,
            stock=10,
            status="ACTIVE",
            category_id=category.id,
            brand_id=brand.id,
        )
        session.add(p)
        session.commit()
        session.refresh(p)
        _create_review(session, test_user, p, rating=3, comment=f"Review {i}")

    # Page 1
    response = client.get(
        "/api/admin/reviews",
        params={"page": 1, "limit": 10},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    data = response.json()
    assert len(data["items"]) == 10
    assert data["total"] == 15
    assert data["total_pages"] == 2

    # Page 2
    response = client.get(
        "/api/admin/reviews",
        params={"page": 2, "limit": 10},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    data = response.json()
    assert len(data["items"]) == 5


# --- Delete review tests ---


def test_delete_review(
    client: TestClient,
    admin_token: str,
    session: Session,
    test_user: User,
    product: Product,
) -> None:
    review = _create_review(session, test_user, product, rating=5)

    response = client.delete(
        f"/api/admin/reviews/{review.id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 204

    # Verify deleted
    response = client.get("/api/admin/reviews", headers={"Authorization": f"Bearer {admin_token}"})
    data = response.json()
    assert data["total"] == 0


def test_delete_review_not_found(client: TestClient, admin_token: str) -> None:
    response = client.delete(
        "/api/admin/reviews/999",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 404
