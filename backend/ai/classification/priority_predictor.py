import os
import joblib
import re
from backend.ai.config import PRIORITY_MODEL_PATH, VECTORIZER_PATH
from backend.ai.preprocessing.text_cleaner import ComplaintPreprocessor

class PriorityPredictor:
    """Predicts complaint priority level (LOW, MEDIUM, HIGH) using ML and severity signals."""

    _vectorizer = None
    _model = None

    HIGH_SEVERITY_KEYWORDS = {
        "emergency", "sparking", "shock", "fire", "leakage", "flooding", "hazard", "injury",
        "burst", "blackout", "exam", "outage", "entire", "all", "smoke", "dangerous", "unusable"
    }

    LOW_SEVERITY_KEYWORDS = {
        "drawer", "paint", "chair", "blinds", "curtain", "scratch", "clock", "slow", "minor"
    }

    @classmethod
    def load_models(cls):
        if cls._vectorizer is None and os.path.exists(VECTORIZER_PATH):
            cls._vectorizer = joblib.load(VECTORIZER_PATH)
        if cls._model is None and os.path.exists(PRIORITY_MODEL_PATH):
            cls._model = joblib.load(PRIORITY_MODEL_PATH)
        return cls._vectorizer is not None and cls._model is not None

    @classmethod
    def predict(cls, text: str):
        if not cls.load_models():
            return "MEDIUM", 0.50

        cleaned = ComplaintPreprocessor.clean(text)
        if not cleaned:
            return "MEDIUM", 0.50

        X = cls._vectorizer.transform([cleaned])
        pred = str(cls._model.predict(X)[0])
        probs = cls._model.predict_proba(X)[0]
        class_idx = list(cls._model.classes_).index(pred)
        confidence = float(probs[class_idx])

        # Domain severity calibration: Check for overt emergency or minor indicators
        tokens = set(re.findall(r"\w+", cleaned.lower()))
        has_high_signal = bool(tokens & cls.HIGH_SEVERITY_KEYWORDS)
        has_low_signal = bool(tokens & cls.LOW_SEVERITY_KEYWORDS)

        if has_high_signal and pred != "HIGH":
            # If explicit high-severity terms appear, upgrade to HIGH with high confidence
            return "HIGH", max(round(confidence, 4), 0.85)

        if has_low_signal and not has_high_signal and pred == "HIGH":
            # Demote isolated minor items
            return "LOW", max(round(confidence, 4), 0.75)

        return pred, round(confidence, 4)
