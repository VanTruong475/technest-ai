import uuid

import cloudinary
import cloudinary.uploader
from fastapi import UploadFile

from app.core.config import settings
from app.core.exceptions import BadRequestError, AppException

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
MAX_SIZE_MB = 5
MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024


def _ensure_cloudinary_configured() -> None:
    if not all([
        settings.CLOUDINARY_CLOUD_NAME,
        settings.CLOUDINARY_API_KEY,
        settings.CLOUDINARY_API_SECRET,
    ]):
        raise AppException(
            detail="Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.",
            error_code="CLOUDINARY_NOT_CONFIGURED",
            status_code=503,
        )
    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
    )


def _validate_file(file: UploadFile) -> None:
    if file.content_type not in ALLOWED_TYPES:
        raise BadRequestError(
            detail=f"Invalid file type: {file.content_type}. Allowed: jpg, jpeg, png, webp, gif."
        )

    ext = ""
    if file.filename and "." in file.filename:
        ext = "." + file.filename.rsplit(".", 1)[-1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise BadRequestError(
            detail=f"Invalid file extension: {ext}. Allowed: jpg, jpeg, png, webp, gif."
        )


async def upload_image(file: UploadFile) -> str:
    _validate_file(file)
    _ensure_cloudinary_configured()

    contents = await file.read()
    if len(contents) > MAX_SIZE_BYTES:
        raise BadRequestError(
            detail=f"File too large. Max size: {MAX_SIZE_MB}MB."
        )

    public_id = f"techsphere/products/{uuid.uuid4().hex}"

    try:
        result = cloudinary.uploader.upload(
            contents,
            public_id=public_id,
            folder="techsphere/products",
            resource_type="image",
        )
    except Exception as e:
        raise AppException(
            detail=f"Upload failed: {str(e)}",
            error_code="UPLOAD_FAILED",
            status_code=502,
        )

    return result["secure_url"]
