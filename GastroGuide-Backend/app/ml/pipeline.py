import logging
from dataclasses import asdict
from typing import Optional

from sqlalchemy.orm import Session

from app.ml.entity_extractor import EntityExtractor
from app.ml.intent_classifier import IntentClassifier
from app.ml.recommender import score_restaurants
from app.ml.response_builder import (
    build_fallback_response,
    build_hours_response,
    build_info_response,
    build_response,
)
from app.models.favorite import Favorite
from app.models.offer import Offer
from app.models.restaurant import Restaurant

logger = logging.getLogger(__name__)

_pipeline_instance: Optional["ChatPipeline"] = None


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
        """Process one chat message and return a structured result dict.

        Keys: answer, intent, intent_confidence, entities, recommended_ids.
        """
        # Step 1 — classify intent
        intent, confidence = self.classifier.predict(message)
        logger.info("Intent=%s confidence=%.2f message=%r", intent, confidence, message[:80])

        # Step 2 — load all visible restaurants
        all_restaurants: list[Restaurant] = (
            db.query(Restaurant)
            .filter(Restaurant.is_hidden == False)
            .all()
        )

        # Step 3 — extract entities (pass names for fuzzy restaurant matching)
        restaurant_names = [r.name for r in all_restaurants]
        entities = self.extractor.extract(message, restaurant_names)
        logger.info("Entities: %s", entities)

        def _find_restaurant(name: str) -> Optional[Restaurant]:
            return next((r for r in all_restaurants if r.name == name), None)

        # Step 4 — info / hours for a specific named restaurant
        if intent == "info_restaurant" and entities.restaurant_name:
            restaurant = _find_restaurant(entities.restaurant_name)
            if restaurant:
                return {
                    "answer": build_info_response(restaurant),
                    "intent": intent,
                    "intent_confidence": confidence,
                    "entities": asdict(entities),
                    "recommended_ids": [restaurant.id],
                }

        if intent == "working_hours" and entities.restaurant_name:
            restaurant = _find_restaurant(entities.restaurant_name)
            if restaurant:
                return {
                    "answer": build_hours_response(restaurant),
                    "intent": intent,
                    "intent_confidence": confidence,
                    "entities": asdict(entities),
                    "recommended_ids": [restaurant.id],
                }

        # Step 5 — pure fallback (low confidence or no meaningful entity)
        if intent == "fallback":
            return {
                "answer": build_fallback_response(),
                "intent": intent,
                "intent_confidence": confidence,
                "entities": asdict(entities),
                "recommended_ids": [],
            }

        # Step 6 — load user favorites
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

        if entities.cuisine:
            cuisine_kws = self.extractor.cuisine_keywords.get(entities.cuisine, [])
            filtered = [
                r for r in candidates
                if any(
                    kw.lower() in " ".join(
                        filter(None, [r.name, r.type, r.tag, r.description])
                    ).lower()
                    for kw in cuisine_kws
                )
            ]
            if len(filtered) >= 3:
                candidates = filtered

        if entities.has_offer:
            try:
                offer_rids = {
                    row[0]
                    for row in db.query(Offer.restaurant_id)
                    .filter(Offer.active == True)
                    .all()
                }
                filtered = [r for r in candidates if r.id in offer_rids]
                if len(filtered) >= 3:
                    candidates = filtered
            except Exception as exc:
                logger.warning("Offer filter skipped: %s", exc)

        if entities.night:
            filtered = [r for r in candidates if r.is_24_7]
            if len(filtered) >= 3:
                candidates = filtered

        # Step 8 — score and rank
        ranked = score_restaurants(db, candidates, entities, lat, lng, user_favorites_ids, intent=intent)

        # Step 9 — build natural-language response
        answer = build_response(intent, entities, ranked, lat, lng)

        return {
            "answer": answer,
            "intent": intent,
            "intent_confidence": confidence,
            "entities": asdict(entities),
            "recommended_ids": [r.id for r, _, _ in ranked[:3]],
        }


def get_pipeline() -> ChatPipeline:
    """Return the singleton ChatPipeline, creating it on first call."""
    global _pipeline_instance
    if _pipeline_instance is None:
        _pipeline_instance = ChatPipeline()
        logger.info("ChatPipeline singleton created")
    return _pipeline_instance
