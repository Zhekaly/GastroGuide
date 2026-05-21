import json
import logging
from dataclasses import asdict
from pathlib import Path
from typing import Optional

from sqlalchemy.orm import Session

from app.ml.entity_extractor import EntityExtractor
from app.ml.intent_classifier import IntentClassifier
from app.ml.recommender import score_restaurants
from app.ml.response_builder import (
    build_fallback_response,
    build_hours_response,
    build_info_response,
    build_open_now_response,
    build_response,
    build_restaurant_card,
    build_superlative_response,
)
from app.models.favorite import Favorite
from app.models.menu_item import MenuItem
from app.models.offer import Offer
from app.models.restaurant import Restaurant
from app.services.location_service import haversine_distance
from app.services.opening_hours_service import is_restaurant_open

logger = logging.getLogger("gastroguide.ml")

_DATA_DIR = Path(__file__).parent / "data"
_pipeline_instance: Optional["ChatPipeline"] = None

_OPEN_NOW_WORDS = ["открыт", "сейчас", "работает", "работающ", "открыто"]


def _load_attribute_kws() -> dict:
    try:
        with open(_DATA_DIR / "attribute_keywords.json", encoding="utf-8") as fh:
            return json.load(fh)
    except Exception:
        return {}


def _is_open_safe(restaurant: Restaurant) -> bool:
    try:
        return is_restaurant_open(restaurant)
    except Exception:
        return bool(restaurant.open)


class ChatPipeline:
    """Main orchestrator: intent → entity extraction → scoring → response."""

    def __init__(self) -> None:
        self.classifier = IntentClassifier()
        self.extractor = EntityExtractor()

    def process(
        self,
        db: Session,
        message: str,
        user_id: Optional[int],
        lat: Optional[float],
        lng: Optional[float],
    ) -> dict:
        logger.info("=" * 50)
        logger.info("[ML] Запрос: \"%s\"", message)

        # Step 1 — classify intent
        intent, confidence = self.classifier.predict(message)
        logger.info("[ML] Intent: %s (уверенность: %.2f)", intent, confidence)

        # Step 2 — load all visible restaurants
        all_restaurants: list[Restaurant] = (
            db.query(Restaurant).filter(Restaurant.is_hidden == False).all()
        )
        all_restaurants_by_id: dict[int, Restaurant] = {r.id: r for r in all_restaurants}

        # Closure: build restaurant cards for a list of IDs (preserves order)
        def _cards(ids: list[int]) -> list[dict]:
            return [
                build_restaurant_card(all_restaurants_by_id[i], lat, lng)
                for i in ids
                if i in all_restaurants_by_id
            ]

        # Step 3 — extract entities
        restaurant_names = [r.name for r in all_restaurants]
        entities = self.extractor.extract(message, restaurant_names, intent=intent)
        active_ent = {k: v for k, v in asdict(entities).items() if v not in (None, False, [], "")}
        logger.info("[ML] Сущности: %s", active_ent)

        def _find_restaurant(name: str) -> Optional[Restaurant]:
            return next((r for r in all_restaurants if r.name == name), None)

        # Step 3b — pre-load menu items and offers once (no N+1)
        menu_items_by_rid: dict[int, list[MenuItem]] = {}
        try:
            for item in db.query(MenuItem).all():
                menu_items_by_rid.setdefault(item.restaurant_id, []).append(item)
        except Exception as exc:
            logger.warning("Could not load menu items: %s", exc)

        offers_by_rid: dict[int, Offer] = {}
        try:
            for offer in db.query(Offer).filter(Offer.active == True).all():
                offers_by_rid[offer.restaurant_id] = offer
        except Exception as exc:
            logger.warning("Could not load offers: %s", exc)

        attribute_kws = _load_attribute_kws()

        # Step 4 — info / hours for a specific named restaurant
        if intent == "info_restaurant":
            if entities.restaurant_name:
                restaurant = _find_restaurant(entities.restaurant_name)
                if restaurant:
                    logger.info("[ML] Ответ: info_restaurant → %s", restaurant.name)
                    logger.info("=" * 50)
                    ids = [restaurant.id]
                    return {
                        "answer": build_info_response(restaurant),
                        "intent": intent,
                        "intent_confidence": confidence,
                        "entities": asdict(entities),
                        "recommended_ids": ids,
                        "recommended_restaurants": _cards(ids),
                    }
            logger.info("[ML] Ответ: info_restaurant → не найдено")
            logger.info("=" * 50)
            return {
                "answer": "Не нашёл заведение с таким названием. Проверьте написание или посмотрите список заведений в каталоге.",
                "intent": intent,
                "intent_confidence": confidence,
                "entities": asdict(entities),
                "recommended_ids": [],
                "recommended_restaurants": [],
            }

        if intent == "working_hours":
            if entities.restaurant_name:
                restaurant = _find_restaurant(entities.restaurant_name)
                if restaurant:
                    logger.info("[ML] Ответ: working_hours → %s", restaurant.name)
                    logger.info("=" * 50)
                    ids = [restaurant.id]
                    return {
                        "answer": build_hours_response(restaurant),
                        "intent": intent,
                        "intent_confidence": confidence,
                        "entities": asdict(entities),
                        "recommended_ids": ids,
                        "recommended_restaurants": _cards(ids),
                    }
            # Task 7 — "Что открыто сейчас?" → show open restaurants
            is_open_now_query = (
                entities.time == "now"
                or any(w in message.lower() for w in _OPEN_NOW_WORDS)
            )
            if is_open_now_query:
                open_now = [r for r in all_restaurants if _is_open_safe(r)]
                if lat is not None and lng is not None:
                    open_now.sort(key=lambda r: (
                        haversine_distance(lat, lng, r.lat, r.lng)
                        if (r.lat and r.lng) else 999_999
                    ))
                top_open = open_now[:3]
                ids = [r.id for r in top_open]
                logger.info("[ML] Ответ: open_now → %d заведений", len(top_open))
                logger.info("=" * 50)
                return {
                    "answer": build_open_now_response(top_open, lat, lng),
                    "intent": intent,
                    "intent_confidence": confidence,
                    "entities": asdict(entities),
                    "recommended_ids": ids,
                    "recommended_restaurants": _cards(ids),
                }
            logger.info("[ML] Ответ: working_hours → не найдено")
            logger.info("=" * 50)
            return {
                "answer": "Не нашёл заведение с таким названием. Проверьте написание или посмотрите список заведений в каталоге.",
                "intent": intent,
                "intent_confidence": confidence,
                "entities": asdict(entities),
                "recommended_ids": [],
                "recommended_restaurants": [],
            }

        # Step 5 — pure fallback (with rescue for "быстро" attribute)
        if intent == "fallback":
            if entities.attribute == "быстро":
                # Bug 13: rescue fast-food queries that land in fallback
                intent = "search_by_dish"
                entities.dish_keywords = ["быстро"]
                logger.info("[ML] fallback rescued by attribute=быстро → routed as search_by_dish")
                # Fall through to scoring — do NOT return here
            else:
                logger.info("[ML] Ответ: fallback")
                logger.info("=" * 50)
                return {
                    "answer": build_fallback_response(),
                    "intent": intent,
                    "intent_confidence": confidence,
                    "entities": asdict(entities),
                    "recommended_ids": [],
                    "recommended_restaurants": [],
                }

        # Step 6 — user favorites
        user_favorites_ids: list[int] = []
        if user_id:
            try:
                rows = (
                    db.query(Favorite.restaurant_id)
                    .filter(Favorite.user_id == user_id)
                    .all()
                )
                user_favorites_ids = [row[0] for row in rows]
            except Exception as exc:
                logger.warning("Could not load favorites for user %d: %s", user_id, exc)

        # Step 7 — filter candidates by strong signals
        candidates: list[Restaurant] = list(all_restaurants)

        # Task 3 — cuisine filter via category label only; bypass when dish_keywords present
        if entities.cuisine and not entities.dish_keywords:
            cuisine_stem = entities.cuisine.lower()[:7]
            filtered = [
                r for r in candidates
                if r.category and cuisine_stem in r.category.label.lower()
            ]
            if len(filtered) == 0:
                logger.info("[ML] Ответ: кухня '%s' — не найдена в каталоге", entities.cuisine)
                logger.info("=" * 50)
                return {
                    "answer": (
                        f"К сожалению, заведений с такой кухней ({entities.cuisine}) пока нет в каталоге. "
                        "Попробуйте другую кухню или посмотрите все заведения рядом."
                    ),
                    "intent": intent,
                    "intent_confidence": confidence,
                    "entities": asdict(entities),
                    "recommended_ids": [],
                    "recommended_restaurants": [],
                }
            candidates = filtered

        if entities.has_offer:
            offer_rids = set(offers_by_rid.keys())
            filtered = [r for r in candidates if r.id in offer_rids]
            if len(filtered) >= 1:
                candidates = filtered

        if entities.night:
            filtered = [r for r in candidates if r.is_24_7]
            if len(filtered) >= 1:
                candidates = filtered

        logger.info("[ML] Кандидатов после фильтрации: %d", len(candidates))

        # Step 8 — score and rank
        ranked = score_restaurants(
            db, candidates, entities, lat, lng, user_favorites_ids,
            intent=intent,
            menu_items_by_rid=menu_items_by_rid,
        )

        if not ranked:
            logger.info("[ML] Ответ: нет результатов")
            logger.info("=" * 50)
            return {
                "answer": "К сожалению, по вашему запросу ничего не нашлось. Попробуйте уточнить, что хотите.",
                "intent": intent,
                "intent_confidence": confidence,
                "entities": asdict(entities),
                "recommended_ids": [],
                "recommended_restaurants": [],
            }

        # Log top-3 breakdown
        logger.info("[ML] Топ результаты:")
        for r, score, bd in ranked[:3]:
            active_sigs = {k: round(v, 2) for k, v in bd.items() if v != 0}
            logger.info("[ML]   %s: score=%.2f | %s", r.name, score, active_sigs)

        # Task 5 — remove irrelevant restaurants (cuisine=0 AND menu_match=0)
        if entities.cuisine or entities.dish_keywords:
            relevant = [
                (r, s, b) for r, s, b in ranked
                if b.get("cuisine", 0) > 0 or b.get("menu_match", 0) > 0
            ]
            if relevant:
                ranked = relevant

        # Task C — feature search: keep only restaurants that have the feature
        if entities.feature_query:
            feature_matches = [(r, s, b) for r, s, b in ranked if b.get("feature", 0) > 0]
            if not feature_matches:
                logger.info("[ML] Ответ: feature '%s' не найдено", entities.feature_query)
                logger.info("=" * 50)
                return {
                    "answer": "Не нашёл заведений с такой особенностью. Попробуйте другой запрос или посмотрите все заведения.",
                    "intent": intent,
                    "intent_confidence": confidence,
                    "entities": asdict(entities),
                    "recommended_ids": [],
                    "recommended_restaurants": [],
                }
            ranked = feature_matches

        # Step 8b — strict dish filter: no padding with non-matching restaurants
        if intent == "search_by_dish" and entities.dish_keywords:
            dish_matches = [(r, s, b) for r, s, b in ranked if b.get("menu_match", 0) > 0]
            if not dish_matches:
                logger.info("[ML] Ответ: блюдо не найдено в меню")
                logger.info("=" * 50)
                return {
                    "answer": "Не нашёл это блюдо в меню заведений. Попробуйте другое блюдо или посмотрите кухни в каталоге.",
                    "intent": intent,
                    "intent_confidence": confidence,
                    "entities": asdict(entities),
                    "recommended_ids": [],
                    "recommended_restaurants": [],
                }
            ranked = dish_matches

        # Price-limit: honest not-found if nothing affordable
        if entities.price_limit:
            affordable = [(r, s, b) for r, s, b in ranked if b.get("price_limit", 0) > 0]
            if not affordable:
                logger.info("[ML] Ответ: нет блюд до %d тг", entities.price_limit)
                logger.info("=" * 50)
                return {
                    "answer": f"Не нашёл блюд до {entities.price_limit:,} ₸. Попробуйте другую сумму или спросите про конкретные заведения.".replace(",", " "),
                    "intent": intent,
                    "intent_confidence": confidence,
                    "entities": asdict(entities),
                    "recommended_ids": [],
                    "recommended_restaurants": [],
                }
            ranked = affordable

        # Step 9 — superlative: highest-rated in pool
        if entities.superlative:
            pool = ranked
            if entities.dish_keywords:
                dish_pool = [(r, s, b) for r, s, b in ranked if b.get("menu_match", 0) > 0]
                if dish_pool:
                    pool = dish_pool
            if not pool:
                logger.info("[ML] Ответ: суперлатив — нет подходящих")
                logger.info("=" * 50)
                return {
                    "answer": "Не нашёл подходящих заведений по запросу.",
                    "intent": intent,
                    "intent_confidence": confidence,
                    "entities": asdict(entities),
                    "recommended_ids": [],
                    "recommended_restaurants": [],
                }
            best_r, _s, _b = max(pool, key=lambda x: (x[0].rating or 0))
            logger.info("[ML] Ответ: суперлатив → %s (%.1f★)", best_r.name, best_r.rating or 0)
            logger.info("=" * 50)
            ids = [best_r.id]
            return {
                "answer": build_superlative_response(best_r, lat, lng),
                "intent": intent,
                "intent_confidence": confidence,
                "entities": asdict(entities),
                "recommended_ids": ids,
                "recommended_restaurants": _cards(ids),
            }

        # Step 10 — build rich response
        answer = build_response(
            intent, entities, ranked, lat, lng,
            menu_items_by_rid=menu_items_by_rid,
            offers_by_rid=offers_by_rid,
            attribute_kws=attribute_kws,
        )
        recommended_ids = [r.id for r, _, _ in ranked[:3]]

        logger.info("[ML] Ответ: intent=%s, рекомендовано=%s", intent, recommended_ids)
        logger.info("=" * 50)

        return {
            "answer": answer,
            "intent": intent,
            "intent_confidence": confidence,
            "entities": asdict(entities),
            "recommended_ids": recommended_ids,
            "recommended_restaurants": _cards(recommended_ids),
        }


def get_pipeline() -> "ChatPipeline":
    global _pipeline_instance
    if _pipeline_instance is None:
        _pipeline_instance = ChatPipeline()
        logger.info("ChatPipeline singleton created")
    return _pipeline_instance
