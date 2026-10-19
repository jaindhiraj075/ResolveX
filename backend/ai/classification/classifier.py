import os
import joblib
from backend.ai.config import CATEGORY_MODEL_PATH, VECTORIZER_PATH
from backend.ai.preprocessing.text_cleaner import ComplaintPreprocessor

class ComplaintClassifier:
    """Classifies complaints into categories using trained TF-IDF + Logistic Regression."""

    _vectorizer = None
    _model = None

    @classmethod
    def load_models(cls):
        if cls._vectorizer is None and os.path.exists(VECTORIZER_PATH):
            cls._vectorizer = joblib.load(VECTORIZER_PATH)
        if cls._model is None and os.path.exists(CATEGORY_MODEL_PATH):
            cls._model = joblib.load(CATEGORY_MODEL_PATH)
        return cls._vectorizer is not None and cls._model is not None

    @classmethod
    def predict(cls, text: str):
        if not cls.load_models():
            return "General", 0.0

        cleaned = ComplaintPreprocessor.clean(text)
        if not cleaned:
            return "General", 0.0

        X = cls._vectorizer.transform([cleaned])
        pred = str(cls._model.predict(X)[0])
        probs = cls._model.predict_proba(X)[0]
        class_idx = list(cls._model.classes_).index(pred)
        confidence = float(probs[class_idx])

        return pred, round(confidence, 4)

    @classmethod
    def get_classes(cls):
        if cls.load_models():
            return list(cls._model.classes_)
        return []
