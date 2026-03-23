# SQLAlchemy-модель категории заведений.
# Используется для нормализованного хранения категорий
# и фильтрации ресторанов по category_id.

from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    label: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    restaurants = relationship("Restaurant", back_populates="category")