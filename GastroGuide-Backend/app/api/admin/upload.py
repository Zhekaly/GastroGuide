# Admin upload изображений в Cloudflare R2.

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.api.admin.deps import get_current_admin_or_moderator, log_admin_action
from app.core.database import get_db
from app.models.user import User
from app.services.r2_service import R2NotConfiguredError, upload_image


router = APIRouter(prefix="/api/v1/admin/upload", tags=["Admin · Upload"])


MAX_SIZE_BYTES = 8 * 1024 * 1024  # 8 MB


@router.post("/image")
async def upload_admin_image(
    file: UploadFile = File(...),
    folder: str = "restaurants",
    db: Session = Depends(get_db),
    actor: User = Depends(get_current_admin_or_moderator),
):
    content = await file.read()

    if len(content) > MAX_SIZE_BYTES:
        raise HTTPException(status_code=413, detail=f"File too large (>{MAX_SIZE_BYTES // (1024 * 1024)} MB)")

    if not content:
        raise HTTPException(status_code=400, detail="Empty file")

    try:
        uploaded = upload_image(
            file_bytes=content,
            filename=file.filename or "image.jpg",
            content_type=file.content_type,
            folder=folder,
        )
    except R2NotConfiguredError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    log_admin_action(
        db, actor,
        action="upload.image",
        entity_type="image",
        entity_id=uploaded.key,
        description=f"Загружено изображение в {folder}/",
        payload={"size": uploaded.size, "content_type": uploaded.content_type, "url": uploaded.url},
    )
    db.commit()

    return {
        "url": uploaded.url,
        "key": uploaded.key,
        "content_type": uploaded.content_type,
        "size": uploaded.size,
    }
