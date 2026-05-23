# SQLAlchemy-модель пользователя.
# Описывает таблицу users и связи пользователя
# с избранным, отзывами и AI-сессиями.

from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


USER_ROLE_USER = "user"
USER_ROLE_ADMIN = "admin"
USER_ROLE_MODERATOR = "moderator"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    city: Mapped[str] = mapped_column(String(100), nullable=False, default="Астана")

    role: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default=USER_ROLE_USER,
        server_default=USER_ROLE_USER,
        index=True,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default="true",
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    favorites = relationship("Favorite", back_populates="user", cascade="all, delete-orphan")
    reviews = relationship("Review", back_populates="user", cascade="all, delete-orphan")
    ai_chat_sessions = relationship("AIChatSession", back_populates="user", cascade="all, delete-orphan")

    moderator_assignments = relationship(
        "RestaurantModerator",
        foreign_keys="RestaurantModerator.user_id",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    moderated_restaurants = relationship(
        "Restaurant",
        secondary="restaurant_moderators",
        primaryjoin="User.id == RestaurantModerator.user_id",
        secondaryjoin="Restaurant.id == RestaurantModerator.restaurant_id",
        viewonly=True,
    )

    @property
    def is_admin(self) -> bool:
        return self.role == USER_ROLE_ADMIN

    @property
    def is_moderator(self) -> bool:
        return self.role == USER_ROLE_MODERATOR