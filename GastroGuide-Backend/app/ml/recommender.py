import json
import logging
from math import exp
from pathlib import Path
from typing import Optional

from sqlalchemy.orm import Session

from app.ml.entity_extractor import Entities
from app.models.offer import Offer
from app.models.restaurant import Restaurant
from app.services.location_service import haversine_distance
from app.services.opening_hours_service import is_restaurant_open

logger = logging.getLogger(__name__)

_DATA_DIR = Path(__file__).parent / "data"

WEIGHTS: dict[str, float] = {
    "cuisine": 3.0,
    "rating": 1.5,
    "distance": 2.0,
    "open": 1.0,
    "price": 1.5,
    "favorite": 0.5,
    "mood": 2.5,
    "offer": 2.0,
    "night": 2.5,
}

_cuisine_kw_cache: Optional[dict] = None


def _get_cuisine_keywords() -> dict:
    global _cuisine_kw_cache
    if _cuisine_kw_cache is None:
        try:
            with open(_DATA_DIR / "cuisine_keywords.json", encoding="utf-8") as fh:
                _cuisine_kw_cache = json.load(fh)
        except Exception as exc:
            logger.warning("Could not load cuisine_keywords.json: %s", exc)
            _cuisine_kw_cache = {}
    return _cuisine_kw_cache


def _cuisine_score(restaurant: Restaurant, entities: Entities) -> float:
    """Return 1.0 if the restaurant matches the requested cuisine, else 0.0."""
    if not entities.cuisine:
        return 0.0
    keywords = _get_cuisine_keywords().get(entities.cuisine, [])
    text = " ".join(
        filter(None, [restaurant.name, restaurant.type, restaurant.tag, restaurant.description])
    ).lower()
    return 1.0 if any(kw.lower() in text for kw in keywords) else 0.0


def _price_score(restaurant: Restaurant, entities: Entities) -> float:
    """Return 0.5 if the restaurant price tier matches the requested price level."""
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
) -> list[tuple[Restaurant, float, dict[str, float]]]:
    """Score and rank candidate restaurants.

    Returns a list of (restaurant, total_score, breakdown) sorted descending by score.
    """
    if user_favorites_ids is None:
        user_favorites_ids = []

    # Start from default weights and apply intent-specific overrides
    weights = dict(WEIGHTS)
    if intent == "search_nearby":
        weights["distance"] = 5.0
        weights["rating"] = 0.8
        weights["offer"] = 0.5   # proximity matters more than promos
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

    # Batch-load all active offer restaurant IDs in one query
    active_offer_rids: set[int] = set()
    try:
        rows = (
            db.query(Offer.restaurant_id)
            .filter(Offer.active == True)
            .all()
        )
        active_offer_rids = {row[0] for row in rows}
    except Exception as exc:
        logger.warning("Could not load active offers: %s", exc)

    results: list[tuple[Restaurant, float, dict[str, float]]] = []

    for restaurant in candidates:
        try:
            is_open = is_restaurant_open(restaurant)
        except Exception:
            is_open = bool(restaurant.open)

        # Distance score — exponential decay, neutral (0.5) when location unknown
        if (
            user_lat is not None
            and user_lng is not None
            and restaurant.lat is not None
            and restaurant.lng is not None
        ):
            d_km = haversine_distance(user_lat, user_lng, restaurant.lat, restaurant.lng) / 1000.0
            distance_score = exp(-d_km / 2)
        else:
            distance_score = 0.5

        # Mood score: Restaurant model has no mood_tags field — skip
        mood_score = 0.0

        breakdown: dict[str, float] = {
            "cuisine": _cuisine_score(restaurant, entities),
            "rating": (restaurant.rating or 0.0) / 5.0,
            "distance": distance_score,
            "open": 1.0 if is_open else 0.0,
            "price": _price_score(restaurant, entities),
            "favorite": 0.3 if restaurant.id in user_favorites_ids else 0.0,
            "mood": mood_score,
            "offer": 1.0 if restaurant.id in active_offer_rids else 0.0,
            "night": 1.0 if (entities.night and restaurant.is_24_7) else 0.0,
        }

        total = sum(weights[k] * v for k, v in breakdown.items())
        results.append((restaurant, total, breakdown))

    results.sort(key=lambda x: x[1], reverse=True)
    return results
