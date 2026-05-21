import json
import logging
import random
import re
from pathlib import Path
from typing import Optional

from app.models.menu_item import MenuItem
from app.models.offer import Offer
from app.models.restaurant import Restaurant
from app.services.location_service import haversine_distance
from app.services.opening_hours_service import is_restaurant_open

logger = logging.getLogger(__name__)

_DATA_DIR = Path(__file__).parent / "data"

_dish_to_menu_cache: Optional[dict] = None


def _get_dish_to_menu() -> dict:
    global _dish_to_menu_cache
    if _dish_to_menu_cache is None:
        try:
            with open(_DATA_DIR / "dish_to_menu.json", encoding="utf-8") as fh:
                _dish_to_menu_cache = {k: [s.lower() for s in v] for k, v in json.load(fh).items()}
        except Exception:
            _dish_to_menu_cache = {}
    return _dish_to_menu_cache


# ─── Intent headers ────────────────────────────────────────────────────────────

GREETINGS: dict[str, list[str]] = {
    "search_by_dish":    ["Нашёл, где это есть:", "Смотри, есть такие места:", "Вот рестораны с этим блюдом:", "Подходящие заведения:"],
    "search_by_cuisine": ["Нашёл подходящие рестораны:", "Заведения с такой кухней:", "Вот что нашёл:", "По вашему запросу:"],
    "search_by_mood":    ["Для такого настроения:", "Хорошие варианты:", "Подойдёт что-то из этого:", "Вот что рекомендую:"],
    "search_nearby":     ["Ближайшие к вам:", "Вот что рядом:", "Совсем рядом:", "В вашем районе:"],
    "search_by_price":   ["Подходящие варианты:", "Смотри что нашёл:", "В этом ценовом диапазоне:", "Вот что есть:"],
    "search_by_offer":   ["Сейчас действуют акции:", "Вот где есть скидки:", "Актуальные предложения:", "Сейчас со скидкой:"],
    "search_24_7":       ["Открыто прямо сейчас:", "Работают круглосуточно:", "В любое время:", "Ночные заведения:"],
    "fallback":          ["Возможно подойдёт:", "Попробуйте эти варианты:", "Может, что-то из этого:", "Смотри:"],
}

FAST_FOOD_GREETINGS: list[str] = [
    "Быстро перекусить — вот варианты:",
    "Где можно быстро поесть:",
    "Нашёл места для быстрого перекуса ⚡",
    "Быстро и вкусно:",
]

FALLBACK_REPLIES: list[str] = [
    "Я помогаю найти заведения в Астане. Спросите про кухню, блюдо или место рядом!",
    "Чем могу помочь? Например: 'хочу суши' или 'что рядом'",
]

NO_RESULTS_REPLY = "К сожалению, по вашему запросу ничего не нашлось. Попробуйте уточнить, что хотите."


# ─── Helpers ───────────────────────────────────────────────────────────────────

def _format_rating(rating: Optional[float]) -> str:
    if not rating or rating == 0.0:
        return "⭐ новый"
    return f"{rating:.1f}★"


def _format_distance(distance_km: Optional[float]) -> str:
    if distance_km is None:
        return "?"
    if distance_km < 1.0:
        meters = round(distance_km * 1000 / 10) * 10
        return f"{meters} м"
    return f"{distance_km:.1f} км"


def _distance_str(restaurant: Restaurant, user_lat: Optional[float], user_lng: Optional[float]) -> str:
    if (user_lat is not None and user_lng is not None
            and restaurant.lat is not None and restaurant.lng is not None):
        d_km = haversine_distance(user_lat, user_lng, restaurant.lat, restaurant.lng) / 1000.0
        return _format_distance(d_km)
    return restaurant.dist or "?"


def _category_label(restaurant: Restaurant) -> str:
    if restaurant.category:
        return restaurant.category.label
    return restaurant.tag or ""


def _parse_item_price(price_str: str) -> int:
    digits = re.sub(r'[^\d]', '', price_str.replace('\xa0', '').replace(' ', ''))
    return int(digits) if digits else 0


def _is_dump_description(text: str) -> bool:
    """Return True for BAO-style metadata dumps."""
    if not text:
        return False
    stripped = text.lstrip()
    if stripped.startswith("Ресторан /"):
        return True
    if text.count("•") >= 3:
        return True
    if re.search(r'Чек\s+\d', text):
        return True
    return False


def _clean_desc(text: Optional[str]) -> Optional[str]:
    """Return cleaned description, or None if it is a dump / too short."""
    if not text or _is_dump_description(text):
        return None
    cleaned = " ".join(text.split())
    return cleaned if len(cleaned) >= 15 else None


_SKIP_TAGS: set[str] = {"ресторан", "кафе", "ресторан / кафе", "ресторан/кафе", ""}


def _meaningful_tag(tag: Optional[str]) -> Optional[str]:
    """Return tag if informative; None for generic labels like 'Ресторан'."""
    if not tag:
        return None
    return None if tag.strip().lower() in _SKIP_TAGS else tag.strip()


def _restaurant_header(restaurant: Restaurant, user_lat: Optional[float], user_lng: Optional[float]) -> str:
    rating_str = _format_rating(restaurant.rating)
    dist_str = _distance_str(restaurant, user_lat, user_lng)
    category = _category_label(restaurant)
    tag = _meaningful_tag(restaurant.tag)
    name_part = f"{restaurant.name} {tag}" if tag else restaurant.name
    return f"{name_part} · {rating_str} · {dist_str} · {category}"


# ─── Dish selection helpers ────────────────────────────────────────────────────

def _matched_dishes(
    restaurant_id: int,
    dish_kws: list[str],
    menu_items_by_rid: dict[int, list[MenuItem]],
    limit: int = 2,
) -> list[MenuItem]:
    items = menu_items_by_rid.get(restaurant_id, [])
    if not items or not dish_kws:
        return []
    d2m = _get_dish_to_menu()
    matched: list[MenuItem] = []
    seen: set[int] = set()
    for kw in dish_kws:
        kw_l = kw.lower()
        syns = d2m.get(kw_l, [])
        for item in items:
            if item.id in seen:
                continue
            name_l = item.name.lower()
            if kw_l in name_l or any(s in name_l for s in syns):
                matched.append(item)
                seen.add(item.id)
        if len(matched) >= limit:
            break
    return matched[:limit]


def _popular_dishes(restaurant_id: int, menu_items_by_rid: dict[int, list[MenuItem]], limit: int = 2) -> list[MenuItem]:
    items = menu_items_by_rid.get(restaurant_id, [])
    popular = [i for i in items if i.popular]
    return (popular or items)[:limit]


def _within_budget_dishes(
    restaurant_id: int,
    price_limit: int,
    menu_items_by_rid: dict[int, list[MenuItem]],
    limit: int = 3,
) -> list[MenuItem]:
    items = menu_items_by_rid.get(restaurant_id, [])
    return [i for i in items if 0 < _parse_item_price(i.price) <= price_limit][:limit]


def _attribute_matched_dishes(
    restaurant_id: int,
    attribute: str,
    menu_items_by_rid: dict[int, list[MenuItem]],
    attribute_kws: dict,
    limit: int = 2,
) -> list[MenuItem]:
    items = menu_items_by_rid.get(restaurant_id, [])
    patterns = attribute_kws.get(attribute, [])
    return [i for i in items if any(p in i.name.lower() for p in patterns)][:limit]


def _format_dish_line(item: MenuItem, show_price: bool = False) -> str:
    emoji = item.emoji or "🍽"
    if show_price:
        return f"{emoji} {item.name} — {item.price}"
    return f"{emoji} {item.name}"


# ─── Restaurant block ──────────────────────────────────────────────────────────

def _features_line(restaurant: Restaurant, max_features: int = 3) -> Optional[str]:
    """Return up to max_features from the features array, or None if empty."""
    features = restaurant.features or []
    if not features:
        return None
    selected = features[:max_features]
    return " · ".join(selected)


def _restaurant_block(
    restaurant: Restaurant,
    user_lat: Optional[float],
    user_lng: Optional[float],
    dishes: list[MenuItem],
    show_desc: bool = False,
    show_price: bool = False,
    show_features: bool = True,
) -> str:
    header = _restaurant_header(restaurant, user_lat, user_lng)
    lines = [header]
    if show_desc:
        desc = _clean_desc(restaurant.description)
        if desc:
            lines.append(f"  {desc}")
    if show_features:
        feat_line = _features_line(restaurant)
        if feat_line:
            lines.append(f"   {feat_line}")
    if dishes:
        dish_str = " · ".join(_format_dish_line(d, show_price) for d in dishes)
        lines.append(f"   {dish_str}")
    return "\n".join(lines)


# ─── Detail-intent helpers ─────────────────────────────────────────────────────

def _is_detail_intent(intent: str) -> bool:
    """True for intents where dish names / prices belong in the text answer."""
    return intent in {"search_by_price", "search_by_dish"}


def _restaurant_block_detail(
    restaurant: Restaurant,
    dishes: list[MenuItem],
    show_price: bool = False,
) -> str:
    """Compact block for detail intents: name + dishes only (no rating/distance/category)."""
    lines = [restaurant.name]
    if dishes:
        dish_str = " · ".join(_format_dish_line(d, show_price) for d in dishes)
        lines.append(f"   {dish_str}")
    return "\n".join(lines)


# ─── Public builders ───────────────────────────────────────────────────────────

def build_response(
    intent: str,
    entities,
    ranked: list[tuple],
    user_lat: Optional[float],
    user_lng: Optional[float],
    menu_items_by_rid: Optional[dict[int, list[MenuItem]]] = None,
    offers_by_rid: Optional[dict[int, Offer]] = None,
    attribute_kws: Optional[dict] = None,
    top_n: int = 3,
) -> str:
    menu_items_by_rid = menu_items_by_rid or {}
    offers_by_rid = offers_by_rid or {}
    attribute_kws = attribute_kws or {}

    top = ranked[:top_n]
    if not top:
        return NO_RESULTS_REPLY

    # ── Offer search: compact format showing offer title/discount (not in cards) ──
    if intent == "search_by_offer":
        lines = [random.choice(GREETINGS["search_by_offer"]), ""]
        for restaurant, _score, _bd in top:
            offer = offers_by_rid.get(restaurant.id)
            if offer:
                lines.append(f"🏷 {restaurant.name} · {offer.title} {offer.discount}")
            else:
                lines.append(f"🏷 {restaurant.name}")
        return "\n".join(lines)

    # ── Non-detail intents: short header only — cards carry all details ──
    if not _is_detail_intent(intent):
        return random.choice(GREETINGS.get(intent, GREETINGS["fallback"]))

    # ── Detail intents (search_by_price, search_by_dish): name + dishes/prices ──
    # Special heading for rescued fast-food queries (Bug 13)
    if intent == "search_by_dish" and entities.attribute == "быстро":
        greeting = random.choice(FAST_FOOD_GREETINGS)
    else:
        greeting = random.choice(GREETINGS.get(intent, GREETINGS["fallback"]))

    lines = [greeting, ""]
    show_price = bool(entities.price_limit) or intent == "search_by_price"

    for i, (restaurant, _score, breakdown) in enumerate(top, 1):
        if entities.price_limit:
            dishes = _within_budget_dishes(restaurant.id, entities.price_limit, menu_items_by_rid)
        elif entities.attribute and breakdown.get("attribute", 0) > 0:
            dishes = _attribute_matched_dishes(restaurant.id, entities.attribute, menu_items_by_rid, attribute_kws)
            if not dishes:
                dishes = _popular_dishes(restaurant.id, menu_items_by_rid)
        elif entities.dish_keywords and breakdown.get("menu_match", 0) > 0:
            dishes = _matched_dishes(restaurant.id, entities.dish_keywords, menu_items_by_rid)
            if not dishes:
                dishes = _popular_dishes(restaurant.id, menu_items_by_rid)
        else:
            dishes = _popular_dishes(restaurant.id, menu_items_by_rid)

        block = _restaurant_block_detail(restaurant, dishes, show_price=show_price)
        lines.append(f"{i}. {block}")

    return "\n".join(lines)


def build_open_now_response(
    restaurants: list[Restaurant],
    user_lat: Optional[float],
    user_lng: Optional[float],
) -> str:
    if not restaurants:
        return "К сожалению, сейчас нет открытых заведений."
    lines = ["Сейчас открыты:\n"]
    for restaurant in restaurants:
        rating_str = _format_rating(restaurant.rating)
        dist_str = _distance_str(restaurant, user_lat, user_lng)
        category = _category_label(restaurant)
        lines.append(f"🟢 {restaurant.name} · {rating_str} · {dist_str} · {category}\n   Часы: {restaurant.hours}")
    return "\n\n".join(lines[:1] + ["\n".join(lines[1:])])


def build_info_response(restaurant: Restaurant) -> str:
    category = _category_label(restaurant)
    lines = [f"🍽 {restaurant.name}", ""]
    if category:
        lines.append(f"Категория: {category}")
    lines.append(f"Рейтинг: {_format_rating(restaurant.rating)}")
    lines.append(f"Адрес: {restaurant.address}")
    lines.append(f"Часы работы: {restaurant.hours}")
    desc = _clean_desc(restaurant.description)
    if desc:
        lines.append("")
        lines.append(desc)
    return "\n".join(lines)


def build_hours_response(restaurant: Restaurant) -> str:
    try:
        is_open = is_restaurant_open(restaurant)
    except Exception:
        is_open = bool(restaurant.open)
    status = "🟢 Сейчас открыт" if is_open else "🔴 Сейчас закрыт"
    return f"{restaurant.name}\n{status}\nЧасы работы: {restaurant.hours}"


def build_superlative_response(
    restaurant: Restaurant,
    user_lat: Optional[float] = None,
    user_lng: Optional[float] = None,
) -> str:
    # Keep superlative response concise — no features line
    line = _restaurant_header(restaurant, user_lat, user_lng)
    desc = _clean_desc(restaurant.description)
    if desc:
        line += f"\n  {desc}"
    return f"Лучший вариант для вас:\n\n{line}"


def build_restaurant_card(
    restaurant: Restaurant,
    user_lat: Optional[float] = None,
    user_lng: Optional[float] = None,
) -> dict:
    """Build a mobile-ready card dict for a restaurant."""
    tag = _meaningful_tag(restaurant.tag)

    if (user_lat is not None and user_lng is not None
            and restaurant.lat is not None and restaurant.lng is not None):
        d_km = haversine_distance(user_lat, user_lng, restaurant.lat, restaurant.lng) / 1000.0
        distance = _format_distance(d_km)
    else:
        distance = restaurant.dist or None

    try:
        is_open = is_restaurant_open(restaurant)
    except Exception:
        is_open = bool(restaurant.open)

    photos = restaurant.photos or []

    return {
        "id": restaurant.id,
        "name": restaurant.name,
        "tag": tag,
        "rating": restaurant.rating or 0.0,
        "category": restaurant.category.label if restaurant.category else None,
        "distance": distance,
        "photo": photos[0] if photos else None,
        "emoji": restaurant.emoji,
        "color": restaurant.color,
        "price": restaurant.price,
        "is_open": is_open,
    }


def build_fallback_response() -> str:
    return random.choice(FALLBACK_REPLIES)
