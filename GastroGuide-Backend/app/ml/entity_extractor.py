import json
import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

from rapidfuzz import fuzz, process

logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).parent / "data"

_NIGHT_KEYWORDS = [
    "ночь", "ночи", "ночью", "круглосуточн", "24/7", "всю ночь", "поздно",
]


def _load_json(filename: str) -> dict:
    """Load a JSON file from the data directory."""
    path = DATA_DIR / filename
    try:
        with open(path, encoding="utf-8") as fh:
            return json.load(fh)
    except Exception as exc:
        logger.error("Failed to load %s: %s", path, exc)
        return {}


@dataclass
class Entities:
    cuisine: Optional[str] = None
    dish_keywords: list[str] = field(default_factory=list)
    price: Optional[str] = None        # "low" / "high"
    mood: Optional[str] = None         # "romantic" / "friends" / "family" / "business" / "alone"
    time: Optional[str] = None         # "now" / "evening" / "morning" / "lunch"
    nearby: bool = False
    night: bool = False
    has_offer: bool = False
    restaurant_name: Optional[str] = None


class EntityExtractor:
    """Extracts structured entities from raw user text using keyword dictionaries."""

    def __init__(self) -> None:
        self.cuisine_keywords: dict = _load_json("cuisine_keywords.json")
        self.dish_keywords_data: dict = _load_json("dish_keywords.json")
        self.price_markers: dict = _load_json("price_markers.json")
        self.mood_keywords: dict = _load_json("mood_keywords.json")
        self.time_markers: dict = _load_json("time_markers.json")
        self.nearby_markers: dict = _load_json("nearby_markers.json")
        self.offer_markers: dict = _load_json("offer_markers.json")

    def extract(
        self,
        text: str,
        restaurant_names: Optional[list[str]] = None,
    ) -> Entities:
        """Extract entities from text.

        restaurant_names: list of known restaurant names for fuzzy matching.
        """
        t = text.lower()
        entities = Entities()

        # Cuisine
        for cuisine, keywords in self.cuisine_keywords.items():
            if any(kw.lower() in t for kw in keywords):
                entities.cuisine = cuisine
                break

        # Dish keywords
        for dish in self.dish_keywords_data.get("dishes", []):
            if dish.lower() in t:
                entities.dish_keywords.append(dish)

        # Price
        for level, markers in self.price_markers.items():
            if any(m.lower() in t for m in markers):
                entities.price = level
                break

        # Mood
        for mood, markers in self.mood_keywords.items():
            if any(m.lower() in t for m in markers):
                entities.mood = mood
                break

        # Time
        for time_key, markers in self.time_markers.items():
            if any(m.lower() in t for m in markers):
                entities.time = time_key
                break

        # Nearby
        for markers in self.nearby_markers.values():
            if any(m.lower() in t for m in markers):
                entities.nearby = True
                break

        # Night / 24h
        if any(kw in t for kw in _NIGHT_KEYWORDS):
            entities.night = True

        # Offer
        for markers in self.offer_markers.values():
            if any(m.lower() in t for m in markers):
                entities.has_offer = True
                break

        # Fuzzy restaurant name match
        if restaurant_names:
            result = process.extractOne(
                text,
                restaurant_names,
                scorer=fuzz.partial_ratio,
                score_cutoff=80,
            )
            if result:
                entities.restaurant_name = result[0]

        return entities
