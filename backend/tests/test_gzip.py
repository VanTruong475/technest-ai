from fastapi.testclient import TestClient


def test_gzip_large_response(client: TestClient):
    response = client.get(
        "/api/products",
        headers={"Accept-Encoding": "gzip"},
    )
    assert response.status_code == 200


def test_gzip_response_body_readable(client: TestClient):
    response = client.get(
        "/api/products",
        headers={"Accept-Encoding": "gzip"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
