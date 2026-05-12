# Pydantic-схемы для admin dashboard статистики.

from pydantic import BaseModel


class DashboardStatsResponse(BaseModel):
    total_restaurants: int
    visible_restaurants: int
    hidden_restaurants: int
    currently_open_restaurants: int

    total_users: int
    active_users: int
    admin_users: int

    total_reviews: int
    average_rating: float | None

    active_offers: int
    total_offers: int

    total_ai_sessions: int
    total_ai_messages: int
    empty_ai_sessions: int

    total_menu_items: int
    total_categories: int


class DashboardRestaurantSnapshot(BaseModel):
    id: int
    name: str
    type: str
    rating: float
    reviews: int


class DashboardRecentReview(BaseModel):
    id: int
    restaurant_id: int
    restaurant_name: str | None
    author_name: str | None
    rating: int
    text: str
    created_at: str


class DashboardOverviewResponse(BaseModel):
    stats: DashboardStatsResponse
    top_restaurants: list[DashboardRestaurantSnapshot]
    low_rated_restaurants: list[DashboardRestaurantSnapshot]
    recent_reviews: list[DashboardRecentReview]
