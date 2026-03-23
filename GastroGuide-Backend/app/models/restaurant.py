# SQLAlchemy-модель заведения.
# Описывает таблицу restaurants, её поля,
# а также связи с меню, категориями, отзывами и избранным.

from datetime import datetime, timezone

from sqlalchemy import String, Float, Integer, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Restaurant(Base):
    __tablename__ = "restaurants"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[str] = mapped_column(String(100), nullable=False)

    category_id: Mapped[int | None] = mapped_column(ForeignKey("categories.id"), nullable=True)

    category = relationship("Category", back_populates="restaurants")
    reviews_list = relationship("Review", back_populates="restaurant", cascade="all, delete-orphan")
    saved_by_users = relationship("Favorite", back_populates="restaurant", cascade="all, delete-orphan")

    emoji: Mapped[str] = mapped_column(String(20), nullable=False)
    color: Mapped[str] = mapped_column(String(20), nullable=False)
    tag: Mapped[str] = mapped_column(String(100), nullable=False)

    rating: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    reviews: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    dist: Mapped[str] = mapped_column(String(50), nullable=False)
    time: Mapped[str] = mapped_column(String(50), nullable=False)
    price: Mapped[str] = mapped_column(String(20), nullable=False)

    open: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    address: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    hours: Mapped[str] = mapped_column(String(100), nullable=False)

    lat: Mapped[float] = mapped_column(Float, nullable=False)
    lng: Mapped[float] = mapped_column(Float, nullable=False)

    features: Mapped[list[str]] = mapped_column(ARRAY(String), nullable=False)
    photos: Mapped[list[str]] = mapped_column(ARRAY(String), nullable=False)

    price_range: Mapped[int] = mapped_column("priceRange", Integer, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        "createdAt",
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    updated_at: Mapped[datetime] = mapped_column(
        "updatedAt",
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    menu = relationship("MenuItem", back_populates="restaurant", cascade="all, delete-orphan")