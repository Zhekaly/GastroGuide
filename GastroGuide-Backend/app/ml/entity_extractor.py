import json
import logging
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

from rapidfuzz import fuzz, process

logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).parent / "data"

_NIGHT_KEYWORDS = [
    "ночь", "ночи", "ночью", "круглосуточн", "24/7", "всю ночь", "поздно",
]

# Pre-compiled price-limit patterns (Task 9)
_PRICE_PATTERNS = [
    re.compile(r'(?:до|за|не более|в пределах|примерно)\s*([\d][\d\s]{1,6})\s*(?:тенге|тг|₸)', re.I),
    re.compile(r'([\d][\d\s]{1,6})\s*(?:тенге|тг|₸)', re.I),
]


def _load_json(filename: str) -> dict:
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
    price: Optional[str] = None          # "low" / "high"
    price_limit: Optional[int] = None    # numeric limit, e.g. 2000 (Task 9)
    mood: Optional[str] = None
    time: Optional[str] = None
    nearby: bool = False
    night: bool = False
    has_offer: bool = False
    restaurant_name: Optional[str] = None
    superlative: bool = False
    attribute: Optional[str] = None      # "острое", "веган", "сладкое", "здоровое" (Task 10)
    feature_query: Optional[str] = None  # "живая музыка", "терраса", "парковка", etc. (Task C)


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
        superlative_data = _load_json("superlative_markers.json")
        self.superlative_markers: list[str] = superlative_data.get("superlative", [])
        self.attribute_keywords: dict = _load_json("attribute_keywords.json")
        self.feature_keywords: dict = _load_json("feature_keywords.json")

    def extract(
        self,
        text: str,
        restaurant_names: Optional[list[str]] = None,
        intent: Optional[str] = None,
    ) -> Entities:
        t = text.lower()
        entities = Entities()

        # --- Cuisine (exact stem match, then fuzzy fallback) ---
        for cuisine, keywords in self.cuisine_keywords.items():
            if any(kw.lower() in t for kw in keywords):
                entities.cuisine = cuisine
                break

        # Task 2 — fuzzy typo tolerance
        if entities.cuisine is None:
            words = t.split()
            outer_break = False
            for cuisine, keywords in self.cuisine_keywords.items():
                for word in words:
                    if len(word) < 5:
                        continue
                    for kw in keywords:
                        if len(kw) < 5:
                            continue
                        if (fuzz.ratio(word, kw.lower()) >= 82 or
                                fuzz.partial_ratio(word, kw.lower()) >= 87):
                            entities.cuisine = cuisine
                            outer_break = True
                            break
                    if outer_break:
                        break
                if outer_break:
                    break

        # --- Dish keywords (stem substring match) ---
        for dish in self.dish_keywords_data.get("dishes", []):
            if dish.lower() in t:
                entities.dish_keywords.append(dish)

        # --- Price tier ---
        for level, markers in self.price_markers.items():
            if any(m.lower() in t for m in markers):
                entities.price = level
                break

        # --- Price limit (Task 9) ---
        for pat in _PRICE_PATTERNS:
            m = pat.search(t)
            if m:
                raw = re.sub(r'\s', '', m.group(1))
                if raw.isdigit():
                    entities.price_limit = int(raw)
                    break

        # --- Mood ---
        for mood, markers in self.mood_keywords.items():
            if any(m.lower() in t for m in markers):
                entities.mood = mood
                break

        # --- Time ---
        for time_key, markers in self.time_markers.items():
            if any(m.lower() in t for m in markers):
                entities.time = time_key
                break

        # --- Nearby ---
        for markers in self.nearby_markers.values():
            if any(m.lower() in t for m in markers):
                entities.nearby = True
                break

        # --- Night ---
        if any(kw in t for kw in _NIGHT_KEYWORDS):
            entities.night = True

        # --- Offer ---
        for markers in self.offer_markers.values():
            if any(m.lower() in t for m in markers):
                entities.has_offer = True
                break

        # --- Superlative ---
        entities.superlative = any(m in t for m in self.superlative_markers)

        # --- Attribute (Task 10) ---
        for attr, patterns in self.attribute_keywords.items():
            if any(p in t for p in patterns):
                entities.attribute = attr
                break

        # --- Feature query (Task C) ---
        for feature, patterns in self.feature_keywords.items():
            if any(p in t for p in patterns):
                entities.feature_query = feature
                break

        # --- Fuzzy restaurant name match (only for info/hours intents) ---
        if restaurant_names and intent in ("info_restaurant", "working_hours"):
            result = process.extractOne(
                text,
                restaurant_names,
                scorer=fuzz.WRatio,
                score_cutoff=87,
            )
            if result:
                entities.restaurant_name = result[0]

        return entities
