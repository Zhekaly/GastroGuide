# SQLAlchemy-модель пункта меню.
# Описывает таблицу menu_items и связь конкретного блюда с рестораном.

from sqlalchemy import String, Integer, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class MenuItem(Base):
    __tablename__ = "menu_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    restaurant_id: Mapped[int] = mapped_column(
        "restaurantId",
        ForeignKey("restaurants.id", ondelete="CASCADE"),
        nullable=False
    )

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    price: Mapped[str] = mapped_column(String(50), nullable=False)
    emoji: Mapped[str] = mapped_column(String(20), nullable=False)
    popular: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    restaurant = relationship("Restaurant", back_populates="menu")