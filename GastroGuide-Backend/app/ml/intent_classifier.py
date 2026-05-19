import logging
from pathlib import Path

import joblib

logger = logging.getLogger(__name__)

MODEL_PATH = Path(__file__).parent / "models" / "intent_clf.joblib"
CONFIDENCE_THRESHOLD = 0.35

_classifier = None


def get_classifier():
    """Return the singleton sklearn pipeline, loading it on first call."""
    global _classifier
    if _classifier is None:
        if not MODEL_PATH.exists():
            raise FileNotFoundError(
                f"Intent classifier model not found at {MODEL_PATH}. "
                "Place intent_clf.joblib in app/ml/models/."
            )
        logger.info("Loading intent classifier from %s", MODEL_PATH)
        _classifier = joblib.load(MODEL_PATH)
        logger.info("Intent classifier loaded successfully")
    return _classifier


class IntentClassifier:
    """Thin wrapper around the calibrated sklearn pipeline."""

    def predict(self, text: str) -> tuple[str, float]:
        """Classify text and return (intent, confidence).

        Falls back to 'fallback' when confidence is below threshold.
        """
        clf = get_classifier()
        text = text.lower().strip()
        proba = clf.predict_proba([text])[0]
        max_idx = int(proba.argmax())
        confidence = float(proba[max_idx])
        intent: str = clf.classes_[max_idx]
        if confidence < CONFIDENCE_THRESHOLD:
            return "fallback", confidence
        return intent, confidence
