import logging
import random
from typing import Optional

from app.models.restaurant import Restaurant
from app.services.location_service import haversine_distance
from app.services.opening_hours_service import is_restaurant_open

logger = logging.getLogger(__name__)

GREETINGS: dict[str, list[str]] = {
    "search_by_dish":    ["Нашёл места где это есть:", "Вот что подходит:"],
    "search_by_cuisine": ["Заведения с такой кухней:", "Смотри что есть:"],
    "search_by_mood":    ["Для такого настроения:", "Хорошие варианты:"],
    "search_nearby":     ["Ближайшие к вам:", "Вот что рядом:"],
    "search_by_price":   ["Подходящие варианты:", "Смотри что нашёл:"],
    "search_by_offer":   ["Места с акциями:", "Вот где есть скидки:"],
    "search_24_7":       ["Ночные заведения:", "Открыто сейчас:"],
    "fallback":          ["Возможно подойдёт:", "Попробуйте эти варианты:"],
}

FALLBACK_REPLIES: list[str] = [
    "Я помогаю найти заведения в Астане. Спросите про кухню, блюдо или место рядом!",
    "Чем могу помочь? Например: 'хочу суши' или 'что рядом'",
]

NO_RESULTS_REPLY = (
    "К сожалению, по вашему запросу ничего не нашлось. "
    "Попробуйте уточнить, что хотите."
)


def _format_distance(distance_km: Optional[float]) -> Optional[str]:
    """Format distance: meters for <1 km, km otherwise."""
    if distance_km is None:
        return None
    if distance_km < 1.0:
        meters = round(distance_km * 1000 / 10) * 10  # round to nearest 10 m
        return f"{meters} м"
    return f"{distance_km:.1f} км"


def _clean_description(text: Optional[str], max_length: int = 80) -> Optional[str]:
    """Clean a restaurant description for inline display."""
    if not text:
        return None
    cleaned = " ".join(text.split())
    if cleaned.startswith(("•", "/", "-", "·", "|")):
        return None
    if cleaned.count("•") >= 2:
        return None
    if len(cleaned) < 15:
        return None
    if len(cleaned) <= max_length:
        return cleaned
    truncated = cleaned[:max_length]
    last_space = truncated.rfind(" ")
    if last_space > max_length // 2:
        truncated = truncated[:last_space]
    return truncated.rstrip(".,;:!?-") + "…"


def _distance_str(
    restaurant: Restaurant,
    user_lat: Optional[float],
    user_lng: Optional[float],
) -> str:
    if (
        user_lat is not None
        and user_lng is not None
        and restaurant.lat is not None
        and restaurant.lng is not None
    ):
        d_km = haversine_distance(user_lat, user_lng, restaurant.lat, restaurant.lng) / 1000.0
        return _format_distance(d_km) or "?"
    return restaurant.dist or "?"


def _category_label(restaurant: Restaurant) -> str:
    if restaurant.category:
        return restaurant.category.label
    return restaurant.tag or ""


def _format_restaurant_line(
    restaurant: Restaurant,
    user_lat: Optional[float],
    user_lng: Optional[float],
) -> str:
    """Format a single restaurant as a short summary line."""
    rating = f"{restaurant.rating:.1f}★"
    dist = _distance_str(restaurant, user_lat, user_lng)
    category = _category_label(restaurant)
    line = f"{restaurant.name} · {rating} · {dist} · {category}"
    desc = _clean_description(restaurant.description)
    if desc:
        line += f"\n  {desc}"
    return line


def build_response(
    intent: str,
    entities,
    ranked: list[tuple],
    user_lat: Optional[float],
    user_lng: Optional[float],
    top_n: int = 3,
) -> str:
    """Build a Russian recommendation response for the given intent and ranked restaurants."""
    top = ranked[:top_n]
    if not top:
        return NO_RESULTS_REPLY

    greeting = random.choice(GREETINGS.get(intent, GREETINGS["fallback"]))
    lines = [greeting, ""]
    for i, (restaurant, _score, _breakdown) in enumerate(top, 1):
        lines.append(f"{i}. {_format_restaurant_line(restaurant, user_lat, user_lng)}")

    return "\n".join(lines)


def build_info_response(restaurant: Restaurant) -> str:
    """Build a detailed info card for a specific restaurant (Russian labels)."""
    category = _category_label(restaurant)
    lines = [f"🍽 {restaurant.name}", ""]
    if category:
        lines.append(f"Категория: {category}")
    lines.append(f"Рейтинг: {restaurant.rating:.1f}★")
    lines.append(f"Адрес: {restaurant.address}")
    lines.append(f"Часы работы: {restaurant.hours}")
    desc = _clean_description(restaurant.description, max_length=200)
    if desc:
        lines.append("")
        lines.append(desc)
    return "\n".join(lines)


def build_hours_response(restaurant: Restaurant) -> str:
    """Build an opening-hours card for a specific restaurant (Russian labels)."""
    try:
        is_open = is_restaurant_open(restaurant)
    except Exception:
        is_open = bool(restaurant.open)
    status = "🟢 Сейчас открыт" if is_open else "🔴 Сейчас закрыт"
    return f"{restaurant.name}\n{status}\nЧасы работы: {restaurant.hours}"


def build_fallback_response() -> str:
    """Return a random Russian fallback reply."""
    return random.choice(FALLBACK_REPLIES)
