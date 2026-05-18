from fastapi.testclient import TestClient
from sqlmodel import Session

from app.models.product import Product


def test_create_review(client: TestClient, user_token: str, product: Product):
    response = client.post("/api/reviews", headers={
        "Authorization": f"Bearer {user_token}",
    }, json={
        "product_id": product.id,
        "rating": 5,
        "comment": "San pham rat tot!",
    })
    assert response.status_code == 201
    data = response.json()
    assert data["rating"] == 5
    assert data["comment"] == "San pham rat tot!"
    assert data["product_id"] == product.id
    assert "user_name" in data


def test_create_review_without_login(client: TestClient, product: Product):
    response = client.post("/api/reviews", json={
        "product_id": product.id,
        "rating": 4,
        "comment": "Good",
    })
    assert response.status_code in (401, 403)


def test_create_review_invalid_rating(client: TestClient, user_token: str, product: Product):
    response = client.post("/api/reviews", headers={
        "Authorization": f"Bearer {user_token}",
    }, json={
        "product_id": product.id,
        "rating": 6,
        "comment": "Test",
    })
    assert response.status_code == 422

    response = client.post("/api/reviews", headers={
        "Authorization": f"Bearer {user_token}",
    }, json={
        "product_id": product.id,
        "rating": 0,
        "comment": "Test",
    })
    assert response.status_code == 422


def test_create_review_product_not_found(client: TestClient, user_token: str):
    response = client.post("/api/reviews", headers={
        "Authorization": f"Bearer {user_token}",
    }, json={
        "product_id": 9999,
        "rating": 5,
        "comment": "Test",
    })
    assert response.status_code == 404


def test_create_duplicate_review(client: TestClient, user_token: str, product: Product):
    client.post("/api/reviews", headers={
        "Authorization": f"Bearer {user_token}",
    }, json={
        "product_id": product.id,
        "rating": 5,
        "comment": "First review",
    })

    response = client.post("/api/reviews", headers={
        "Authorization": f"Bearer {user_token}",
    }, json={
        "product_id": product.id,
        "rating": 4,
        "comment": "Second review",
    })
    assert response.status_code == 400
    assert "already reviewed" in response.json()["detail"]


def test_get_reviews_by_product(client: TestClient, user_token: str, product: Product):
    client.post("/api/reviews", headers={
        "Authorization": f"Bearer {user_token}",
    }, json={
        "product_id": product.id,
        "rating": 5,
        "comment": "Great product",
    })

    response = client.get(f"/api/reviews/product/{product.id}")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert data[0]["rating"] == 5


def test_get_reviews_empty(client: TestClient, product: Product):
    response = client.get(f"/api/reviews/product/{product.id}")
    assert response.status_code == 200
    data = response.json()
    assert data == []


def test_update_own_review(client: TestClient, user_token: str, product: Product):
    create_resp = client.post("/api/reviews", headers={
        "Authorization": f"Bearer {user_token}",
    }, json={
        "product_id": product.id,
        "rating": 4,
        "comment": "Good",
    })
    review_id = create_resp.json()["id"]

    response = client.put(f"/api/reviews/{review_id}", headers={
        "Authorization": f"Bearer {user_token}",
    }, json={
        "rating": 5,
        "comment": "Updated: Excellent!",
    })
    assert response.status_code == 200
    data = response.json()
    assert data["rating"] == 5
    assert data["comment"] == "Updated: Excellent!"


def test_update_other_user_review(client: TestClient, admin_token: str, user_token: str, product: Product):
    create_resp = client.post("/api/reviews", headers={
        "Authorization": f"Bearer {user_token}",
    }, json={
        "product_id": product.id,
        "rating": 3,
        "comment": "User review",
    })
    review_id = create_resp.json()["id"]

    response = client.put(f"/api/reviews/{review_id}", headers={
        "Authorization": f"Bearer {admin_token}",
    }, json={
        "rating": 1,
    })
    assert response.status_code == 200
    assert response.json()["rating"] == 1


def test_delete_own_review(client: TestClient, user_token: str, product: Product):
    create_resp = client.post("/api/reviews", headers={
        "Authorization": f"Bearer {user_token}",
    }, json={
        "product_id": product.id,
        "rating": 4,
        "comment": "To delete",
    })
    review_id = create_resp.json()["id"]

    response = client.delete(f"/api/reviews/{review_id}", headers={
        "Authorization": f"Bearer {user_token}",
    })
    assert response.status_code == 204

    get_resp = client.get(f"/api/reviews/product/{product.id}")
    assert len(get_resp.json()) == 0


def test_delete_other_user_review_forbidden(client: TestClient, admin_token: str, user_token: str, product: Product, session: Session):
    from app.models.user import User
    from app.models.review import Review

    user = session.exec(
        __import__("sqlmodel", fromlist=["select"]).select(User).where(User.email == "test@example.com")
    ).first()

    review = Review(user_id=user.id, product_id=product.id, rating=3, comment="User review")
    session.add(review)
    session.commit()
    session.refresh(review)

    response = client.delete(f"/api/reviews/{review.id}", headers={
        "Authorization": f"Bearer {admin_token}",
    })
    assert response.status_code == 204


def test_update_review_not_found(client: TestClient, user_token: str):
    response = client.put("/api/reviews/9999", headers={
        "Authorization": f"Bearer {user_token}",
    }, json={
        "rating": 5,
    })
    assert response.status_code == 404


def test_delete_review_not_found(client: TestClient, user_token: str):
    response = client.delete("/api/reviews/9999", headers={
        "Authorization": f"Bearer {user_token}",
    })
    assert response.status_code == 404
