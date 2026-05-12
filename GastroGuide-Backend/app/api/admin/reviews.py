# Admin модерация отзывов.

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.api.admin.deps import get_current_admin, log_admin_action
from app.core.database import get_db
from app.models.restaurant import Restaurant
from app.models.review import Review
from app.models.user import User
from app.schemas.admin.common import MessageResponse, PaginatedResponse
from app.schemas.admin.review import AdminReviewItem
from app.services.rating_service import recalculate_restaurant_rating


router = APIRouter(prefix="/api/v1/admin/reviews", tags=["Admin · Reviews"])


@router.get("", response_model=PaginatedResponse[AdminReviewItem])
def list_reviews(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
    q: str | None = Query(default=None),
    rating: int | None = Query(default=None, ge=1, le=5),
    rating_lte: int | None = Query(default=None, ge=1, le=5),
    restaurant_id: int | None = Query(default=None),
    user_id: int | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=200),
):
    query = (
        db.query(Review, Restaurant.name)
        .outerjoin(Restaurant, Restaurant.id == Review.restaurant_id)
    )

    if q:
        like = f"%{q}%"
        query = query.filter(or_(Review.text.ilike(like), Review.author_name.ilike(like)))

    if rating is not None:
        query = query.filter(Review.rating == rating)

    if rating_lte is not None:
        query = query.filter(Review.rating <= rating_lte)

    if restaurant_id is not None:
        query = query.filter(Review.restaurant_id == restaurant_id)

    if user_id is not None:
        query = query.filter(Review.user_id == user_id)

    total = query.count()

    rows = (
        query.order_by(Review.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    items = [
        AdminReviewItem(
            id=r.id,
            restaurant_id=r.restaurant_id,
            restaurant_name=name,
            user_id=r.user_id,
            author_name=r.author_name,
            rating=r.rating,
            text=r.text,
            created_at=r.created_at,
        )
        for r, name in rows
    ]

    return PaginatedResponse[AdminReviewItem].build(items=items, total=total, page=page, page_size=page_size)


@router.delete("/{review_id}", response_model=MessageResponse)
def delete_review(
    review_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    review = db.query(Review).filter(Review.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    restaurant_id = review.restaurant_id
    review_text_preview = (review.text or "")[:80]

    db.delete(review)
    db.flush()

    recalculate_restaurant_rating(db, restaurant_id)

    log_admin_action(
        db, admin,
        action="review.delete",
        entity_type="review",
        entity_id=review_id,
        description=f"Удалён отзыв (rating={review.rating}): {review_text_preview}",
        payload={"restaurant_id": restaurant_id},
    )

    db.commit()
    return MessageResponse(message="Review deleted")
