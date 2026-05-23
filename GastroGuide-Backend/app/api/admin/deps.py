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
from app.models.user import USER_ROLE_ADMIN, USER_ROLE_MODERATOR, User


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


def get_current_admin_or_moderator(
    token: Annotated[str, Depends(admin_oauth2_scheme)],
    db: Session = Depends(get_db),
) -> User:
    """Принимает и admin, и moderator. Используется в эндпойнтах,
    которые модератор имеет право видеть (свои заведения, меню,
    акции, отзывы)."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
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

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Учётная запись заблокирована",
        )

    if user.role not in (USER_ROLE_ADMIN, USER_ROLE_MODERATOR):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Требуются права администратора или модератора",
        )

    return user


def check_restaurant_access(user: User, restaurant_id: int) -> None:
    """Проверяет, что юзер имеет право работать с этим заведением.
    Админ — может всё. Модератор — только если restaurant_id в его
    moderated_restaurants. Иначе 403."""
    if user.is_admin:
        return
    if user.is_moderator:
        moderated_ids = [r.id for r in user.moderated_restaurants]
        if restaurant_id not in moderated_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Нет прав на это заведение",
            )
        return
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Недостаточно прав",
    )


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
