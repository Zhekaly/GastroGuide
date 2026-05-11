# Сервис форматирования расстояния и примерного времени пути.
# Используется для динамического отображения dist/time в карточках заведений.

from app.models.restaurant import Restaurant
from app.services.location_service import haversine_distance


WALKING_SPEED_KMH = 5


def format_distance(distance_m: float) -> str:
    """
    Форматирует расстояние:
    - 850 м
    - 1.2 км
    """
    if distance_m < 1000:
        return f"{round(distance_m)} м"

    return f"{distance_m / 1000:.1f} км"


def format_duration_from_minutes(minutes: int) -> str:
    """
    Форматирует время:
    - 45 мин
    - 1 ч
    - 1 ч 57 мин
    - 2 ч 6 мин
    """
    minutes = max(1, minutes)

    if minutes < 60:
        return f"{minutes} мин"

    hours = minutes // 60
    remaining_minutes = minutes % 60

    if remaining_minutes == 0:
        return f"{hours} ч"

    return f"{hours} ч {remaining_minutes} мин"


def estimate_walking_time(distance_m: float) -> str:
    """
    Считает примерное время пешком по средней скорости 5 км/ч.
    """
    time_minutes = round(distance_m / 1000 / WALKING_SPEED_KMH * 60)
    return format_duration_from_minutes(time_minutes)


def format_distance_and_time(distance_m: float) -> tuple[str, str]:
    """
    Возвращает готовые строки для карточки заведения:
    ("2.4 км", "29 мин")
    ("10.5 км", "2 ч 6 мин")
    """
    return format_distance(distance_m), estimate_walking_time(distance_m)


def apply_dynamic_distance_to_restaurant(
    restaurant: Restaurant,
    user_lat: float,
    user_lng: float,
) -> None:
    """
    Обновляет dist/time у объекта Restaurant перед отправкой во frontend.
    В БД эти значения не сохраняются — меняется только объект в текущем response.
    """
    if restaurant.lat is None or restaurant.lng is None:
        return

    distance_m = haversine_distance(
        user_lat,
        user_lng,
        restaurant.lat,
        restaurant.lng,
    )

    restaurant.dist, restaurant.time = format_distance_and_time(distance_m)