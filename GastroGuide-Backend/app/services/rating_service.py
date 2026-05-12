# Сервис пересчёта рейтинга и количества отзывов ресторана.
# Используется и admin-эндпоинтами (при удалении/редактировании отзывов),
# и публичными эндпоинтами создания/обновления отзывов.

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.restaurant import Restaurant
from app.models.review import Review


def recalculate_restaurant_rating(db: Session, restaurant_id: int) -> Restaurant | None:
    """
    Пересчитывает поля `rating` (AVG) и `reviews` (COUNT) у ресторана.
    Возвращает обновлённый объект ресторана.
    """
    restaurant = (
        db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    )

    if not restaurant:
        return None

    aggregates = (
        db.query(
            func.count(Review.id).label("count"),
            func.coalesce(func.avg(Review.rating), 0.0).label("avg_rating"),
        )
        .filter(Review.restaurant_id == restaurant_id)
        .one()
    )

    restaurant.reviews = int(aggregates.count or 0)
    restaurant.rating = round(float(aggregates.avg_rating or 0.0), 1)

    db.add(restaurant)

    return restaurant


def recalculate_all_restaurants(db: Session) -> int:
    """
    Пересчитывает рейтинг и количество отзывов для всех ресторанов.
    Возвращает количество обработанных ресторанов.
    """
    restaurant_ids = [row.id for row in db.query(Restaurant.id).all()]

    for restaurant_id in restaurant_ids:
        recalculate_restaurant_rating(db, restaurant_id)

    return len(restaurant_ids)
