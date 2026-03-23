# API endpoint для получения списка категорий заведений.
# Используется frontend'ом для фильтрации ресторанов по категориям.

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.category import Category
from app.schemas.category import CategoryResponse

router = APIRouter(prefix="/api/v1/categories", tags=["Categories"])


@router.get("", response_model=list[CategoryResponse])
def get_categories(db: Session = Depends(get_db)):
    categories = (
        db.query(Category)
        .order_by(Category.sort_order.asc(), Category.id.asc())
        .all()
    )
    return categories