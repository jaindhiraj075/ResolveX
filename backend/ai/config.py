import os

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")
DATA_DIR = os.path.join(os.path.dirname(__file__), "training", "data")

CATEGORY_MODEL_PATH = os.path.join(MODELS_DIR, "category_model.pkl")
PRIORITY_MODEL_PATH = os.path.join(MODELS_DIR, "priority_model.pkl")
VECTORIZER_PATH = os.path.join(MODELS_DIR, "vectorizer.pkl")
METRICS_PATH = os.path.join(MODELS_DIR, "metrics.json")
DATASET_PATH = os.path.join(DATA_DIR, "complaints.csv")

# Configurable ML thresholds
DUPLICATE_THRESHOLD = 0.65
CATEGORY_CONFIDENCE_THRESHOLD = 0.50
PRIORITY_CONFIDENCE_THRESHOLD = 0.45

# Canonical Department Mappings
CATEGORY_TO_DEPARTMENT = {
    "Wi-Fi & Internet": {"name": "IT / Network", "id": 1},
    "Hostel & Living": {"name": "Hostel Administration", "id": 2},
    "Campus Infrastructure": {"name": "Campus Maintenance", "id": 3},
    "Lab & Equipment": {"name": "CSE Lab", "id": 4},
}
