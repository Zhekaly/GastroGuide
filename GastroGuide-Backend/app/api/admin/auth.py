# Admin authentication endpoints.
# Логин админ-панели — отдельный от пользовательского, валидирует роль и активность.

from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.admin.deps import get_current_admin
from app.core.config import settings
from app.core.database import get_db
from app.core.security import (
    create_access_token,
    create_refresh_token,
    verify_password,
)
from app.models.user import USER_ROLE_ADMIN, User
from app.schemas.admin.auth import (
    AdminLoginRequest,
    AdminMeResponse,
    AdminTokenResponse,
)


router = APIRouter(prefix="/api/v1/admin/auth", tags=["Admin · Auth"])


@router.post("/login", response_model=AdminTokenResponse)
def admin_login(request: AdminLoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()

    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if user.role != USER_ROLE_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin role required",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin account is disabled",
        )

    access_token = create_access_token(
        subject=user.id,
        expires_delta=timedelta(minutes=settings.access_token_expire_minutes),
    )
    refresh_token = create_refresh_token(
        subject=user.id,
        expires_delta=timedelta(days=settings.refresh_token_expire_days),
    )

    return AdminTokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
    )


@router.get("/me", response_model=AdminMeResponse)
def admin_me(admin: User = Depends(get_current_admin)):
    return admin
