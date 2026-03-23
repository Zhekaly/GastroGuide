# API endpoints для работы с отзывами.
# Файл отвечает за получение отзывов по ресторану,
# создание нового отзыва, обновление существующего и удаление отзыва пользователя.

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.restaurant import Restaurant
from app.models.review import Review
from app.models.user import User
from app.schemas.review import ReviewCreateRequest, ReviewUpdateRequest, ReviewResponse

router = APIRouter(prefix="/api/v1/reviews", tags=["Reviews"])


@router.get("/{restaurant_id}", response_model=list[ReviewResponse])
def get_reviews_by_restaurant(
    restaurant_id: int,
    db: Session = Depends(get_db),
):
    restaurant = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    if not restaurant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Restaurant not found",
        )

    reviews = (
        db.query(Review)
        .filter(Review.restaurant_id == restaurant_id)
        .order_by(Review.created_at.desc())
        .all()
    )

    return reviews


@router.post("/{restaurant_id}", response_model=ReviewResponse, status_code=status.HTTP_201_CREATED)
def create_review(
    restaurant_id: int,
    request: ReviewCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    restaurant = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    if not restaurant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Restaurant not found",
        )

    existing_review = db.query(Review).filter(
        Review.user_id == current_user.id,
        Review.restaurant_id == restaurant_id
    ).first()

    if existing_review:
        raise HTTPException(
            status_code=400,
            detail="Review already exists"
        )

    review = Review(
        restaurant_id=restaurant_id,
        user_id=current_user.id,
        author_name=current_user.name,
        rating=request.rating,
        text=request.text,
    )

    db.add(review)

    db.flush()

    restaurant_reviews = (
        db.query(Review)
        .filter(Review.restaurant_id == restaurant_id)
        .all()
    )

    restaurant.reviews = len(restaurant_reviews)

    if restaurant_reviews:
        restaurant.rating = round(
            sum(r.rating for r in restaurant_reviews) / len(restaurant_reviews),
            1,
        )

    db.commit()
    db.refresh(review)

    return review

@router.patch("/{restaurant_id}", response_model=ReviewResponse)
def update_review(
    restaurant_id: int,
    request: ReviewUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    restaurant = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    if not restaurant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Restaurant not found",
        )

    review = (
        db.query(Review)
        .filter(
            Review.restaurant_id == restaurant_id,
            Review.user_id == current_user.id,
        )
        .first()
    )

    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found",
        )

    review.rating = request.rating
    review.text = request.text

    db.add(review)
    db.flush()

    restaurant_reviews = (
        db.query(Review)
        .filter(Review.restaurant_id == restaurant_id)
        .all()
    )

    restaurant.reviews = len(restaurant_reviews)

    if restaurant_reviews:
        restaurant.rating = round(
            sum(r.rating for r in restaurant_reviews) / len(restaurant_reviews),
            1,
        )
    else:
        restaurant.rating = 0

    db.commit()
    db.refresh(review)

    return review