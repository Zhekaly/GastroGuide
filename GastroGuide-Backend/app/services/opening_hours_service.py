# Сервис динамического вычисления статуса заведения.
# Определяет, открыто ли заведение сейчас, на основе текущего времени
# и рабочих часов ресторана.

from datetime import datetime, time
from zoneinfo import ZoneInfo
import re

from app.models.restaurant import Restaurant


ASTANA_TIMEZONE = ZoneInfo("Asia/Almaty")


def get_current_local_time() -> time:
    """
    Возвращает текущее локальное время для Астаны.
    """
    return datetime.now(ASTANA_TIMEZONE).time()


def parse_hours_range(hours: str) -> tuple[time, time] | None:
    """
    Пытается извлечь время открытия и закрытия из строки hours.

    Примеры поддерживаемых строк:
    - "10:00 – 23:00"
    - "10:00 - 23:00"
    - "09:00–22:00"
    - "24/7"
    """
    if not hours:
        return None

    normalized = hours.strip().lower()

    if "24/7" in normalized or "круглосуточно" in normalized:
        return time(0, 0), time(23, 59)

    matches = re.findall(r"(\d{1,2}):(\d{2})", normalized)

    if len(matches) < 2:
        return None

    open_hour, open_minute = matches[0]
    close_hour, close_minute = matches[1]

    return (
        time(int(open_hour), int(open_minute)),
        time(int(close_hour), int(close_minute)),
    )


def is_time_within_range(
    current_time: time,
    opens_at: time,
    closes_at: time,
) -> bool:
    """
    Проверяет, попадает ли текущее время в диапазон работы.

    Поддерживает обычный режим:
    10:00 – 23:00

    И режим через полночь:
    18:00 – 02:00
    """
    if opens_at == closes_at:
        return True

    # Обычный случай: открылся утром, закрылся вечером
    if opens_at < closes_at:
        return opens_at <= current_time <= closes_at

    # Случай через полночь: например, 18:00 – 02:00
    return current_time >= opens_at or current_time <= closes_at


def is_restaurant_open(restaurant: Restaurant) -> bool:
    """
    Возвращает актуальный статус заведения.

    Приоритет:
    1. is_24_7
    2. opens_at / closes_at из новых полей
    3. попытка распарсить старое поле hours
    4. fallback на старое restaurant.open из БД
    """
    if restaurant.is_24_7:
        return True

    current_time = get_current_local_time()

    if restaurant.opens_at is not None and restaurant.closes_at is not None:
        return is_time_within_range(
            current_time=current_time,
            opens_at=restaurant.opens_at,
            closes_at=restaurant.closes_at,
        )

    parsed_hours = parse_hours_range(restaurant.hours)

    if parsed_hours is not None:
        opens_at, closes_at = parsed_hours
        return is_time_within_range(
            current_time=current_time,
            opens_at=opens_at,
            closes_at=closes_at,
        )

    return restaurant.open


def apply_dynamic_open_status(restaurant: Restaurant) -> None:
    """
    Подставляет динамический open-статус в объект Restaurant перед response.
    В БД значение не сохраняется.
    """
    restaurant.open = is_restaurant_open(restaurant)


def apply_dynamic_open_status_to_restaurants(restaurants: list[Restaurant]) -> None:
    """
    Подставляет динамический open-статус в список ресторанов.
    """
    for restaurant in restaurants:
        apply_dynamic_open_status(restaurant)