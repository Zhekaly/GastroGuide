# Сервис загрузки изображений в Cloudflare R2 (S3-compatible).
# Используется admin-панелью для загрузки фотографий ресторанов.
#
# Требует следующие переменные окружения в .env:
#   R2_ACCOUNT_ID
#   R2_ACCESS_KEY_ID
#   R2_SECRET_ACCESS_KEY
#   R2_BUCKET
#   R2_PUBLIC_BASE_URL
#
# Если R2 не настроен, сервис вернёт понятную ошибку,
# а админка может использовать ручной ввод URL.

from __future__ import annotations

import mimetypes
import os
import uuid
from dataclasses import dataclass

from app.core.config import settings


ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
}


@dataclass
class UploadedImage:
    url: str
    key: str
    content_type: str
    size: int


class R2NotConfiguredError(RuntimeError):
    pass


def _is_configured() -> bool:
    return all(
        getattr(settings, attr, None)
        for attr in (
            "r2_account_id",
            "r2_access_key_id",
            "r2_secret_access_key",
            "r2_bucket",
            "r2_public_base_url",
        )
    )


def _build_client():
    try:
        import boto3
        from botocore.config import Config
    except ImportError as e:
        raise R2NotConfiguredError(
            "boto3 is not installed. Add 'boto3' to requirements.txt"
        ) from e

    if not _is_configured():
        raise R2NotConfiguredError(
            "Cloudflare R2 is not configured. "
            "Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, "
            "R2_BUCKET and R2_PUBLIC_BASE_URL in .env"
        )

    endpoint_url = f"https://{settings.r2_account_id}.r2.cloudflarestorage.com"

    return boto3.client(
        "s3",
        endpoint_url=endpoint_url,
        aws_access_key_id=settings.r2_access_key_id,
        aws_secret_access_key=settings.r2_secret_access_key,
        region_name="auto",
        config=Config(signature_version="s3v4"),
    )


def upload_image(
    file_bytes: bytes,
    filename: str,
    content_type: str | None,
    folder: str = "restaurants",
) -> UploadedImage:
    """
    Загружает изображение в R2 и возвращает публичный URL.
    """

    if content_type and content_type not in ALLOWED_CONTENT_TYPES:
        raise ValueError(
            f"Unsupported content_type '{content_type}'. "
            f"Allowed: {sorted(ALLOWED_CONTENT_TYPES)}"
        )

    if not content_type:
        guessed, _ = mimetypes.guess_type(filename)
        content_type = guessed or "application/octet-stream"

    ext = os.path.splitext(filename)[1].lower() or ".jpg"
    safe_ext = ext if ext in (".jpg", ".jpeg", ".png", ".webp", ".gif") else ".jpg"
    key = f"{folder}/{uuid.uuid4().hex}{safe_ext}"

    client = _build_client()

    client.put_object(
        Bucket=settings.r2_bucket,
        Key=key,
        Body=file_bytes,
        ContentType=content_type,
        CacheControl="public, max-age=31536000, immutable",
    )

    public_base = settings.r2_public_base_url.rstrip("/")
    url = f"{public_base}/{key}"

    return UploadedImage(
        url=url,
        key=key,
        content_type=content_type,
        size=len(file_bytes),
    )
