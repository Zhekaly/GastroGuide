# Admin CRUD категорий + reorder.

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.admin.deps import get_current_admin, log_admin_action
from app.core.database import get_db
from app.models.category import Category
from app.models.restaurant import Restaurant
from app.models.user import User
from app.schemas.admin.category import (
    AdminCategoryCreate,
    AdminCategoryReorderRequest,
    AdminCategoryResponse,
    AdminCategoryUpdate,
)
from app.schemas.admin.common import MessageResponse


router = APIRouter(prefix="/api/v1/admin/categories", tags=["Admin · Categories"])


def _serialize(category: Category, count: int) -> AdminCategoryResponse:
    return AdminCategoryResponse(
        id=category.id,
        label=category.label,
        sort_order=category.sort_order,
        restaurants_count=count,
    )


@router.get("", response_model=list[AdminCategoryResponse])
def list_categories(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    counts = dict(
        db.query(Restaurant.category_id, func.count(Restaurant.id))
        .group_by(Restaurant.category_id)
        .all()
    )

    categories = (
        db.query(Category).order_by(Category.sort_order.asc(), Category.id.asc()).all()
    )

    return [_serialize(c, counts.get(c.id, 0)) for c in categories]


@router.post("", response_model=AdminCategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(
    payload: AdminCategoryCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    existing = db.query(Category).filter(Category.label == payload.label).first()
    if existing:
        raise HTTPException(status_code=400, detail="Category with this label exists")

    category = Category(label=payload.label, sort_order=payload.sort_order)
    db.add(category)
    db.flush()
    log_admin_action(
        db, admin,
        action="category.create",
        entity_type="category",
        entity_id=category.id,
        description=f"Создана категория '{category.label}'",
    )
    db.commit()
    db.refresh(category)
    return _serialize(category, 0)


@router.patch("/{category_id}", response_model=AdminCategoryResponse)
def update_category(
    category_id: int,
    payload: AdminCategoryUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(category, field, value)

    db.add(category)
    db.flush()
    log_admin_action(
        db, admin,
        action="category.update",
        entity_type="category",
        entity_id=category.id,
        description=f"Обновлена категория '{category.label}'",
        payload={"changed": list(updates.keys())},
    )
    db.commit()
    db.refresh(category)

    count = (
        db.query(func.count(Restaurant.id))
        .filter(Restaurant.category_id == category.id)
        .scalar()
        or 0
    )
    return _serialize(category, count)


@router.delete("/{category_id}", response_model=MessageResponse)
def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    db.query(Restaurant).filter(Restaurant.category_id == category_id).update(
        {Restaurant.category_id: None}
    )

    label = category.label
    db.delete(category)
    db.flush()
    log_admin_action(
        db, admin,
        action="category.delete",
        entity_type="category",
        entity_id=category_id,
        description=f"Удалена категория '{label}'",
    )
    db.commit()
    return MessageResponse(message=f"Category '{label}' deleted")


@router.post("/reorder", response_model=list[AdminCategoryResponse])
def reorder_categories(
    payload: AdminCategoryReorderRequest,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    for index, category_id in enumerate(payload.ordered_ids):
        db.query(Category).filter(Category.id == category_id).update(
            {Category.sort_order: index}
        )

    log_admin_action(
        db, admin,
        action="category.reorder",
        entity_type="category",
        description="Изменён порядок категорий",
        payload={"ordered_ids": payload.ordered_ids},
    )
    db.commit()

    counts = dict(
        db.query(Restaurant.category_id, func.count(Restaurant.id))
        .group_by(Restaurant.category_id)
        .all()
    )
    categories = (
        db.query(Category).order_by(Category.sort_order.asc(), Category.id.asc()).all()
    )
    return [_serialize(c, counts.get(c.id, 0)) for c in categories]
