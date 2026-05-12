# Admin dashboard — агрегированная статистика для главной страницы панели.

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.admin.deps import get_current_admin
from app.core.database import get_db
from app.models.ai_chat_message import AIChatMessage
from app.models.ai_chat_session import AIChatSession
from app.models.category import Category
from app.models.menu_item import MenuItem
from app.models.offer import Offer
from app.models.restaurant import Restaurant
from app.models.review import Review
from app.models.user import USER_ROLE_ADMIN, User
from app.schemas.admin.dashboard import (
    DashboardOverviewResponse,
    DashboardRecentReview,
    DashboardRestaurantSnapshot,
    DashboardStatsResponse,
)
from app.services.opening_hours_service import is_restaurant_open


router = APIRouter(prefix="/api/v1/admin/dashboard", tags=["Admin · Dashboard"])


@router.get("", response_model=DashboardOverviewResponse)
def get_dashboard_overview(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    total_restaurants = db.query(func.count(Restaurant.id)).scalar() or 0
    hidden_restaurants = (
        db.query(func.count(Restaurant.id))
        .filter(Restaurant.is_hidden.is_(True))
        .scalar()
        or 0
    )
    visible_restaurants = total_restaurants - hidden_restaurants

    restaurants_for_open_check = (
        db.query(Restaurant).filter(Restaurant.is_hidden.is_(False)).all()
    )
    currently_open = sum(
        1 for r in restaurants_for_open_check if is_restaurant_open(r)
    )

    total_users = db.query(func.count(User.id)).scalar() or 0
    active_users = (
        db.query(func.count(User.id))
        .filter(User.is_active.is_(True))
        .scalar()
        or 0
    )
    admin_users = (
        db.query(func.count(User.id))
        .filter(User.role == USER_ROLE_ADMIN)
        .scalar()
        or 0
    )

    total_reviews = db.query(func.count(Review.id)).scalar() or 0
    avg_rating = db.query(func.avg(Review.rating)).scalar()
    if avg_rating is not None:
        avg_rating = round(float(avg_rating), 2)

    total_offers = db.query(func.count(Offer.id)).scalar() or 0
    active_offers = (
        db.query(func.count(Offer.id))
        .filter(Offer.active.is_(True))
        .scalar()
        or 0
    )

    total_ai_sessions = db.query(func.count(AIChatSession.id)).scalar() or 0
    total_ai_messages = db.query(func.count(AIChatMessage.id)).scalar() or 0

    empty_ai_sessions = (
        db.query(func.count(AIChatSession.id))
        .outerjoin(AIChatMessage, AIChatMessage.session_id == AIChatSession.id)
        .group_by(AIChatSession.id)
        .having(func.count(AIChatMessage.id) == 0)
        .count()
    )

    total_menu_items = db.query(func.count(MenuItem.id)).scalar() or 0
    total_categories = db.query(func.count(Category.id)).scalar() or 0

    stats = DashboardStatsResponse(
        total_restaurants=total_restaurants,
        visible_restaurants=visible_restaurants,
        hidden_restaurants=hidden_restaurants,
        currently_open_restaurants=currently_open,
        total_users=total_users,
        active_users=active_users,
        admin_users=admin_users,
        total_reviews=total_reviews,
        average_rating=avg_rating,
        active_offers=active_offers,
        total_offers=total_offers,
        total_ai_sessions=total_ai_sessions,
        total_ai_messages=total_ai_messages,
        empty_ai_sessions=empty_ai_sessions,
        total_menu_items=total_menu_items,
        total_categories=total_categories,
    )

    top_restaurants_rows = (
        db.query(Restaurant)
        .order_by(Restaurant.rating.desc(), Restaurant.reviews.desc())
        .limit(5)
        .all()
    )
    low_restaurants_rows = (
        db.query(Restaurant)
        .filter(Restaurant.reviews > 0)
        .order_by(Restaurant.rating.asc())
        .limit(5)
        .all()
    )

    top_restaurants = [
        DashboardRestaurantSnapshot(
            id=r.id,
            name=r.name,
            type=r.type,
            rating=r.rating,
            reviews=r.reviews,
        )
        for r in top_restaurants_rows
    ]
    low_rated_restaurants = [
        DashboardRestaurantSnapshot(
            id=r.id,
            name=r.name,
            type=r.type,
            rating=r.rating,
            reviews=r.reviews,
        )
        for r in low_restaurants_rows
    ]

    recent_reviews_rows = (
        db.query(Review, Restaurant.name)
        .outerjoin(Restaurant, Restaurant.id == Review.restaurant_id)
        .order_by(Review.created_at.desc())
        .limit(10)
        .all()
    )
    recent_reviews = [
        DashboardRecentReview(
            id=review.id,
            restaurant_id=review.restaurant_id,
            restaurant_name=restaurant_name,
            author_name=review.author_name,
            rating=review.rating,
            text=review.text,
            created_at=review.created_at.isoformat(),
        )
        for review, restaurant_name in recent_reviews_rows
    ]

    return DashboardOverviewResponse(
        stats=stats,
        top_restaurants=top_restaurants,
        low_rated_restaurants=low_rated_restaurants,
        recent_reviews=recent_reviews,
    )
