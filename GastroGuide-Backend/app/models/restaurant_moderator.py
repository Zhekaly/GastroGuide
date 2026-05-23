# SQLAlchemy-модель связи модератор ↔ заведение.
# Реализует many-to-many между users и restaurants
# с аудитными полями: кто и когда назначил модератора.

from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class RestaurantModerator(Base):
    __tablename__ = "restaurant_moderators"

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
        index=True,
    )
    restaurant_id: Mapped[int] = mapped_column(
        ForeignKey("restaurants.id", ondelete="CASCADE"),
        primary_key=True,
        index=True,
    )

    assigned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    assigned_by: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    user = relationship(
        "User",
        foreign_keys=[user_id],
        back_populates="moderator_assignments",
    )
    restaurant = relationship(
        "Restaurant",
        foreign_keys=[restaurant_id],
        back_populates="moderator_assignments",
    )
    assigned_by_user = relationship(
        "User",
        foreign_keys=[assigned_by],
    )
