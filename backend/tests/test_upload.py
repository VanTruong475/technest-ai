import io
from unittest.mock import patch, MagicMock

from fastapi.testclient import TestClient


CLOUDINARY_URL = "https://res.cloudinary.com/test/image/upload/v123/test.jpg"


def _make_image_file(filename: str = "test.jpg", content_type: str = "image/jpeg", size_kb: int = 100):
    content = b"\x89PNG\r\n\x1a\n" + b"\x00" * (size_kb * 1024)
    return ("file", (filename, io.BytesIO(content), content_type))


# --- Admin upload success ---

@patch("app.services.upload_service.cloudinary")
def test_upload_image_admin_success(mock_cloudinary, client: TestClient, admin_token: str):
    mock_cloudinary.uploader.upload.return_value = {"secure_url": CLOUDINARY_URL}

    with patch("app.services.upload_service.settings") as mock_settings:
        mock_settings.CLOUDINARY_CLOUD_NAME = "test"
        mock_settings.CLOUDINARY_API_KEY = "key"
        mock_settings.CLOUDINARY_API_SECRET = "secret"

        file_data = _make_image_file()
        response = client.post(
            "/api/uploads/image",
            files=[file_data],
            headers={"Authorization": f"Bearer {admin_token}"},
        )

    assert response.status_code == 200
    assert response.json()["url"] == CLOUDINARY_URL


# --- User cannot upload ---

def test_upload_image_user_forbidden(client: TestClient, user_token: str):
    file_data = _make_image_file()
    response = client.post(
        "/api/uploads/image",
        files=[file_data],
        headers={"Authorization": f"Bearer {user_token}"},
    )
    assert response.status_code == 403


# --- No auth ---

def test_upload_image_no_auth(client: TestClient):
    file_data = _make_image_file()
    response = client.post("/api/uploads/image", files=[file_data])
    assert response.status_code in (401, 403)


# --- Invalid file type ---

def test_upload_image_invalid_type(client: TestClient, admin_token: str):
    file_data = _make_image_file(filename="test.txt", content_type="text/plain")
    response = client.post(
        "/api/uploads/image",
        files=[file_data],
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 400
    assert "Invalid file type" in response.json()["detail"]


# --- Invalid file extension ---

def test_upload_image_invalid_extension(client: TestClient, admin_token: str):
    file_data = _make_image_file(filename="test.bmp", content_type="image/jpeg")
    response = client.post(
        "/api/uploads/image",
        files=[file_data],
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 400
    assert "Invalid file extension" in response.json()["detail"]


# --- File too large ---

@patch("app.services.upload_service.cloudinary")
def test_upload_image_too_large(mock_cloudinary, client: TestClient, admin_token: str):
    with patch("app.services.upload_service.settings") as mock_settings:
        mock_settings.CLOUDINARY_CLOUD_NAME = "test"
        mock_settings.CLOUDINARY_API_KEY = "key"
        mock_settings.CLOUDINARY_API_SECRET = "secret"

        file_data = _make_image_file(size_kb=6000)  # 6MB
        response = client.post(
            "/api/uploads/image",
            files=[file_data],
            headers={"Authorization": f"Bearer {admin_token}"},
        )

    assert response.status_code == 400
    assert "File too large" in response.json()["detail"]


# --- Cloudinary not configured ---

def test_upload_image_not_configured(client: TestClient, admin_token: str):
    with patch("app.services.upload_service.settings") as mock_settings:
        mock_settings.CLOUDINARY_CLOUD_NAME = ""
        mock_settings.CLOUDINARY_API_KEY = ""
        mock_settings.CLOUDINARY_API_SECRET = ""

        file_data = _make_image_file()
        response = client.post(
            "/api/uploads/image",
            files=[file_data],
            headers={"Authorization": f"Bearer {admin_token}"},
        )

    assert response.status_code == 503
    assert "not configured" in response.json()["detail"].lower()


# --- PNG upload ---

@patch("app.services.upload_service.cloudinary")
def test_upload_image_png(mock_cloudinary, client: TestClient, admin_token: str):
    mock_cloudinary.uploader.upload.return_value = {"secure_url": CLOUDINARY_URL}

    with patch("app.services.upload_service.settings") as mock_settings:
        mock_settings.CLOUDINARY_CLOUD_NAME = "test"
        mock_settings.CLOUDINARY_API_KEY = "key"
        mock_settings.CLOUDINARY_API_SECRET = "secret"

        file_data = _make_image_file(filename="photo.png", content_type="image/png")
        response = client.post(
            "/api/uploads/image",
            files=[file_data],
            headers={"Authorization": f"Bearer {admin_token}"},
        )

    assert response.status_code == 200


# --- WebP upload ---

@patch("app.services.upload_service.cloudinary")
def test_upload_image_webp(mock_cloudinary, client: TestClient, admin_token: str):
    mock_cloudinary.uploader.upload.return_value = {"secure_url": CLOUDINARY_URL}

    with patch("app.services.upload_service.settings") as mock_settings:
        mock_settings.CLOUDINARY_CLOUD_NAME = "test"
        mock_settings.CLOUDINARY_API_KEY = "key"
        mock_settings.CLOUDINARY_API_SECRET = "secret"

        file_data = _make_image_file(filename="photo.webp", content_type="image/webp")
        response = client.post(
            "/api/uploads/image",
            files=[file_data],
            headers={"Authorization": f"Bearer {admin_token}"},
        )

    assert response.status_code == 200
