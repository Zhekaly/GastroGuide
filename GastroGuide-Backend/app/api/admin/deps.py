# Зависимости admin API: получение текущего администратора по JWT.
# Используется во всех /api/v1/admin/* эндпоинтах.

from typing import Annotated, Any

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models.activity_log import ActivityLog
from app.models.user import USER_ROLE_ADMIN, User


admin_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/admin/auth/login")


def get_current_admin(
    token: Annotated[str, Depends(admin_oauth2_scheme)],
    db: Session = Depends(get_db),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate admin credentials",
    )

    try:
        payload = jwt.decode(
            token, settings.secret_key, algorithms=[settings.algorithm]
        )

        user_id: str | None = payload.get("sub")
        token_type: str | None = payload.get("type")

        if user_id is None or token_type != "access":
            raise credentials_exception

    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.id == int(user_id)).first()

    if user is None:
        raise credentials_exception

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

    return user


def log_admin_action(
    db: Session,
    admin: User,
    action: str,
    entity_type: str,
    entity_id: str | int | None = None,
    description: str | None = None,
    payload: dict[str, Any] | None = None,
) -> ActivityLog:
    log = ActivityLog(
        admin_id=admin.id if admin else None,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id) if entity_id is not None else None,
        description=description,
        payload=payload,
    )
    db.add(log)
    return log
