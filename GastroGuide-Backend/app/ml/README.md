# app/ml — ML Chat Pipeline

Local ML system that replaces the Gemini assistant for GastroGuide.

## File responsibilities

| File | What it does |
|---|---|
| `intent_classifier.py` | Loads `models/intent_clf.joblib` (sklearn Pipeline) and exposes `IntentClassifier.predict(text) -> (intent, confidence)`. Falls back to `"fallback"` when confidence < 0.35. |
| `entity_extractor.py` | Reads the JSON dictionaries from `data/` and extracts structured `Entities` from raw text (cuisine, dish keywords, price, mood, time, nearby, night, offer, restaurant name via rapidfuzz). |
| `recommender.py` | `score_restaurants(...)` scores every candidate `Restaurant` with a weighted formula and returns them sorted descending. |
| `response_builder.py` | Pure text formatting: `build_response`, `build_info_response`, `build_hours_response`, `build_fallback_response`. All output strings are in Russian. |
| `pipeline.py` | `ChatPipeline.process(...)` orchestrates classifier → entity extractor → candidate filter → scorer → response builder. Exposes `get_pipeline()` singleton. |
| `data/*.json` | Keyword dictionaries (Russian). Can be extended without retraining. |
| `models/intent_clf.joblib` | Trained sklearn `Pipeline` (TfidfVectorizer + LinearSVC + CalibratedClassifierCV). |

## Extending dictionaries without retraining

All files under `data/` are plain JSON loaded at startup. You can add or edit keywords freely:

- **`cuisine_keywords.json`** — add a new cuisine key with a list of Russian keywords to make the entity extractor recognise it. The recommender will then match restaurants whose `name/type/tag/description` contain those keywords.
- **`dish_keywords.json`** — add dish names to improve `search_by_dish` entity extraction.
- **`mood_keywords.json`** — add trigger phrases for moods. Mood scoring in `recommender.py` is currently a stub (0.0) because the `Restaurant` model has no `mood_tags` column — add the column + migration and remove the stub to activate it.
- **`price_markers.json`**, **`time_markers.json`**, **`nearby_markers.json`**, **`offer_markers.json`** — same pattern.

Restart the server after editing any JSON file (they are loaded once at startup via module-level singletons).

## Replacing the model

Drop a new `intent_clf.joblib` into `app/ml/models/`. The file must be a serialised sklearn `Pipeline` with a `predict_proba` method (calibrated). The set of class labels it was trained on determines which intents the system can recognise; currently:

```
search_by_dish  search_by_cuisine  search_by_mood  search_by_price
search_by_offer  search_nearby  search_24_7  info_restaurant
working_hours  fallback
```

If you add or rename intents, update `GREETINGS` in `response_builder.py` and the pipeline logic in `pipeline.py` accordingly.

## Tuning recommender weights

Open `recommender.py` and edit the `WEIGHTS` dict:

```python
WEIGHTS = {
    "cuisine":  3.0,   # raise to strongly prefer cuisine matches
    "rating":   1.5,
    "distance": 2.0,   # raise to prefer nearby places
    "open":     1.0,
    "price":    1.5,
    "favorite": 0.5,
    "mood":     2.5,   # currently inactive (mood_tags column missing)
    "offer":    2.0,   # raise to always push promo restaurants up
    "night":    2.5,
}
```

No retraining or restart required — the weights are evaluated at query time.

## Confidence threshold

`CONFIDENCE_THRESHOLD = 0.35` in `intent_classifier.py`. Lower it to accept more uncertain predictions; raise it to force more fallbacks.
