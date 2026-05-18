from fastapi import APIRouter, Depends, File, UploadFile, status

from app.models.user import User
from app.schemas.upload import UploadResponse
from app.services.upload_service import upload_image
from app.core.dependencies import require_admin

router = APIRouter(prefix="/api/uploads", tags=["Uploads"])


@router.post("/image", response_model=UploadResponse, status_code=status.HTTP_200_OK)
async def upload_product_image(
    file: UploadFile = File(...),
    current_user: User = Depends(require_admin),
):
    url = await upload_image(file)
    return UploadResponse(url=url)
