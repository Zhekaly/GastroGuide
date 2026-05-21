import json
import logging
import re as _re
from math import exp
from pathlib import Path
from typing import Optional

from sqlalchemy.orm import Session

from app.ml.entity_extractor import Entities
from app.models.menu_item import MenuItem
from app.models.offer import Offer
from app.models.restaurant import Restaurant
from app.services.location_service import haversine_distance
from app.services.opening_hours_service import is_restaurant_open

logger = logging.getLogger(__name__)

_DATA_DIR = Path(__file__).parent / "data"

WEIGHTS: dict[str, float] = {
    "cuisine":      3.0,
    "rating":       1.5,
    "distance":     2.0,
    "open":         1.0,
    "price":        1.5,
    "favorite":     0.5,
    "mood":         2.5,
    "offer":        2.0,
    "night":        2.5,
    "menu_match":   5.0,
    "menu_popular": 1.0,
    "price_limit":  4.0,
    "attribute":    3.0,
    "feature":      3.0,
}

_dish_to_menu_cache: Optional[dict] = None
_attribute_kw_cache: Optional[dict] = None
_feature_kw_cache: Optional[dict] = None


def _get_dish_to_menu() -> dict:
    global _dish_to_menu_cache
    if _dish_to_menu_cache is None:
        try:
            with open(_DATA_DIR / "dish_to_menu.json", encoding="utf-8") as fh:
                _dish_to_menu_cache = {k: [s.lower() for s in v] for k, v in json.load(fh).items()}
        except Exception as exc:
            logger.warning("Could not load dish_to_menu.json: %s", exc)
            _dish_to_menu_cache = {}
    return _dish_to_menu_cache


def _get_attribute_keywords() -> dict:
    global _attribute_kw_cache
    if _attribute_kw_cache is None:
        try:
            with open(_DATA_DIR / "attribute_keywords.json", encoding="utf-8") as fh:
                _attribute_kw_cache = json.load(fh)
        except Exception as exc:
            logger.warning("Could not load attribute_keywords.json: %s", exc)
            _attribute_kw_cache = {}
    return _attribute_kw_cache


def _get_feature_keywords() -> dict:
    global _feature_kw_cache
    if _feature_kw_cache is None:
        try:
            with open(_DATA_DIR / "feature_keywords.json", encoding="utf-8") as fh:
                _feature_kw_cache = json.load(fh)
        except Exception as exc:
            logger.warning("Could not load feature_keywords.json: %s", exc)
            _feature_kw_cache = {}
    return _feature_kw_cache


def _parse_item_price(price_str: str) -> int:
    """Parse '1 800 ₸' → 1800."""
    digits = _re.sub(r'[^\d]', '', price_str.replace('\xa0', '').replace(' ', ''))
    return int(digits) if digits else 0


def _cuisine_score(restaurant: Restaurant, entities: Entities) -> float:
    """Task 3: match cuisine via category label only, never description."""
    if not entities.cuisine:
        return 0.0
    cuisine_stem = entities.cuisine.lower()[:7]
    cat_label = (restaurant.category.label if restaurant.category else "").lower()
    return 1.0 if cuisine_stem in cat_label else 0.0


def _mood_score(restaurant: Restaurant, entities: Entities) -> float:
    """Task 8d: use mood_tags if set, else heuristic."""
    if not entities.mood:
        return 0.0
    mood_tags = getattr(restaurant, "mood_tags", None) or []
    if mood_tags:
        return 1.0 if entities.mood in mood_tags else 0.0
    # Heuristic fallback when no restaurant has mood_tags populated yet
    cat_label = (restaurant.category.label if restaurant.category else "").lower()
    rating = restaurant.rating or 0.0
    mood = entities.mood
    if mood == "romantic":
        score = 0.0
        if rating >= 4.5:
            score += 0.5
        if any(c in cat_label for c in ["итальян", "азиатск"]):
            score += 0.3
        return min(score, 1.0)
    if mood == "family":
        return 0.8 if any(c in cat_label for c in ["семейн", "казахск", "вегетари"]) else 0.2
    if mood == "business":
        return 0.7 if rating >= 4.0 else 0.3
    if mood == "friends":
        return 0.7 if any(c in cat_label for c in ["гриль", "японск"]) else 0.3
    if mood == "alone":
        return 0.5
    return 0.0


def _price_score(restaurant: Restaurant, entities: Entities) -> float:
    if not entities.price:
        return 0.0
    pr = getattr(restaurant, "price_range", None)
    if pr is None:
        return 0.0
    if entities.price == "low" and pr <= 2:
        return 0.5
    if entities.price == "high" and pr >= 3:
        return 0.5
    return 0.0


def score_restaurants(
    db: Session,
    candidates: list[Restaurant],
    entities: Entities,
    user_lat: Optional[float],
    user_lng: Optional[float],
    user_favorites_ids: Optional[list[int]],
    intent: Optional[str] = None,
    menu_items_by_rid: Optional[dict[int, list[MenuItem]]] = None,
) -> list[tuple[Restaurant, float, dict[str, float]]]:
    """Score and rank candidate restaurants.

    Returns (restaurant, total_score, breakdown) sorted descending by score.
    menu_items_by_rid: pre-loaded from pipeline to avoid a second DB query.
    """
    if user_favorites_ids is None:
        user_favorites_ids = []

    weights = dict(WEIGHTS)
    if intent == "search_nearby":
        weights["distance"] = 5.0
        weights["rating"] = 0.8
        weights["offer"] = 0.5
    elif intent == "search_by_offer":
        weights["offer"] = 4.0
        weights["rating"] = 0.8
    elif intent == "search_24_7":
        weights["night"] = 5.0
        weights["distance"] = 2.5
    elif intent == "search_by_mood":
        weights["mood"] = 4.0
        weights["rating"] = 2.0
    elif intent == "search_by_price":
        weights["price"] = 3.0
        if entities.price_limit:
            weights["price_limit"] = 5.0
    elif intent == "search_by_dish":
        weights["menu_match"] = 6.0
        weights["cuisine"] = 2.0
        if entities.attribute:
            weights["attribute"] = 5.0

    # Load active offer IDs in one query
    active_offer_rids: set[int] = set()
    try:
        rows = db.query(Offer.restaurant_id).filter(Offer.active == True).all()
        active_offer_rids = {row[0] for row in rows}
    except Exception as exc:
        logger.warning("Could not load active offers: %s", exc)

    # Use pre-loaded menu items if provided; otherwise load from DB (single query)
    _menu_by_rid: dict[int, list[MenuItem]] = {}
    if menu_items_by_rid is not None:
        _menu_by_rid = menu_items_by_rid
    else:
        try:
            for item in db.query(MenuItem).all():
                _menu_by_rid.setdefault(item.restaurant_id, []).append(item)
        except Exception as exc:
            logger.warning("Could not load menu items: %s", exc)

    dish_to_menu = _get_dish_to_menu()
    attribute_kws = _get_attribute_keywords()
    feature_kws = _get_feature_keywords()

    results: list[tuple[Restaurant, float, dict[str, float]]] = []

    for restaurant in candidates:
        try:
            is_open = is_restaurant_open(restaurant)
        except Exception:
            is_open = bool(restaurant.open)

        # Distance
        if (user_lat is not None and user_lng is not None
                and restaurant.lat is not None and restaurant.lng is not None):
            d_km = haversine_distance(user_lat, user_lng, restaurant.lat, restaurant.lng) / 1000.0
            distance_score = exp(-d_km / 2)
        else:
            distance_score = 0.5

        # Task 4 — rating 0 → neutral 0.6 (new restaurant, not unrated)
        raw_rating = restaurant.rating or 0.0
        rating_score = 0.6 if raw_rating == 0.0 else raw_rating / 5.0

        menu_items_here = _menu_by_rid.get(restaurant.id, [])
        menu_text = " ".join(item.name.lower() for item in menu_items_here)
        popular_text = " ".join(item.name.lower() for item in menu_items_here if item.popular)

        # Menu match (dish search)
        menu_match_score = 0.0
        menu_popular_score = 0.0
        if entities.dish_keywords:
            total = 0.0
            for kw in entities.dish_keywords:
                kw_l = kw.lower()
                if kw_l in menu_text:
                    total += 1.0
                    if kw_l in popular_text:
                        menu_popular_score = min(menu_popular_score + 0.25, 1.0)
                else:
                    synonyms = dish_to_menu.get(kw_l, [])
                    hit = next((s for s in synonyms if s in menu_text), None)
                    if hit:
                        total += 0.9
                        if hit in popular_text:
                            menu_popular_score = min(menu_popular_score + 0.25, 1.0)
            if total > 0:
                menu_match_score = min(total / len(entities.dish_keywords), 1.0)

        # Price limit (Task 9)
        price_limit_score = 0.0
        if entities.price_limit and menu_items_here:
            within = sum(
                1 for item in menu_items_here
                if 0 < _parse_item_price(item.price) <= entities.price_limit
            )
            if within > 0:
                price_limit_score = min(within / 3.0, 1.0)

        # Attribute (Task 10)
        attribute_score = 0.0
        if entities.attribute:
            patterns = attribute_kws.get(entities.attribute, [])
            for item in menu_items_here:
                if any(p in item.name.lower() for p in patterns):
                    attribute_score = 1.0
                    break
            if attribute_score == 0.0:
                desc = (restaurant.description or "").lower()
                if any(p in desc for p in patterns):
                    attribute_score = 0.5

        # Feature search (Task C)
        feature_score = 0.0
        if entities.feature_query:
            patterns = feature_kws.get(entities.feature_query, [])
            features_text = " ".join(f.lower() for f in (restaurant.features or []))
            if any(p in features_text for p in patterns):
                feature_score = 1.0

        breakdown: dict[str, float] = {
            "cuisine":      _cuisine_score(restaurant, entities),
            "rating":       rating_score,
            "distance":     distance_score,
            "open":         1.0 if is_open else 0.0,
            "price":        _price_score(restaurant, entities),
            "favorite":     0.3 if restaurant.id in user_favorites_ids else 0.0,
            "mood":         _mood_score(restaurant, entities),
            "offer":        1.0 if restaurant.id in active_offer_rids else 0.0,
            "night":        1.0 if (entities.night and restaurant.is_24_7) else 0.0,
            "menu_match":   menu_match_score,
            "menu_popular": menu_popular_score,
            "price_limit":  price_limit_score,
            "attribute":    attribute_score,
            "feature":      feature_score,
        }

        total_score = sum(weights[k] * v for k, v in breakdown.items())
        results.append((restaurant, total_score, breakdown))

    results.sort(key=lambda x: x[1], reverse=True)
    return results
