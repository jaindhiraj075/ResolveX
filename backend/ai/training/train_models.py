import os
import sys
import json
import csv
import joblib
import numpy as np

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../..")))

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, precision_recall_fscore_support
from sklearn.model_selection import StratifiedKFold

from backend.ai.config import (
    DATASET_PATH,
    MODELS_DIR,
    VECTORIZER_PATH,
    CATEGORY_MODEL_PATH,
    PRIORITY_MODEL_PATH,
    METRICS_PATH,
)
from backend.ai.preprocessing.text_cleaner import ComplaintPreprocessor

def load_data(filepath):
    texts, categories, departments, priorities = [], [], [], []
    with open(filepath, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            raw_text = row["text"].strip()
            cleaned = ComplaintPreprocessor.clean(raw_text)
            if cleaned:
                texts.append(cleaned)
                categories.append(row["category"].strip())
                departments.append(row["department"].strip())
                priorities.append(row["priority"].strip().upper())
    return texts, categories, departments, priorities

def evaluate_classifier(clf, X, y, n_splits=5):
    skf = StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=42)
    accs, precs, recs, f1s = [], [], [], []

    for train_idx, test_idx in skf.split(X, y):
        X_train, X_test = X[train_idx], X[test_idx]
        y_train, y_test = [y[i] for i in train_idx], [y[i] for i in test_idx]

        clf.fit(X_train, y_train)
        preds = clf.predict(X_test)

        accs.append(accuracy_score(y_test, preds))
        p, r, f, _ = precision_recall_fscore_support(y_test, preds, average="weighted", zero_division=0)
        precs.append(p)
        recs.append(r)
        f1s.append(f)

    return {
        "accuracy": float(np.mean(accs)),
        "precision": float(np.mean(precs)),
        "recall": float(np.mean(recs)),
        "f1_score": float(np.mean(f1s)),
    }

def train_and_save():
    os.makedirs(MODELS_DIR, exist_ok=True)

    print(f"Loading training data from {DATASET_PATH}...")
    texts, categories, departments, priorities = load_data(DATASET_PATH)
    print(f"Total labeled examples loaded: {len(texts)}")

    # 1. Vectorizer
    vectorizer = TfidfVectorizer(
        ngram_range=(1, 2),
        sublinear_tf=True,
        min_df=1,
        max_df=0.95,
        strip_accents="unicode"
    )
    X = vectorizer.fit_transform(texts)

    # 2. Category Model
    category_clf = LogisticRegression(C=2.5, max_iter=1000, random_state=42)
    category_metrics = evaluate_classifier(category_clf, X, categories)
    # Fit on all data for production deployment
    category_clf.fit(X, categories)

    # 3. Priority Model
    priority_clf = LogisticRegression(C=2.0, max_iter=1000, random_state=42)
    priority_metrics = evaluate_classifier(priority_clf, X, priorities)
    # Fit on all data for production deployment
    priority_clf.fit(X, priorities)

    # 4. Save artifacts
    joblib.dump(vectorizer, VECTORIZER_PATH)
    joblib.dump(category_clf, CATEGORY_MODEL_PATH)
    joblib.dump(priority_clf, PRIORITY_MODEL_PATH)

    metrics = {
        "dataset_size": len(texts),
        "classes": {
            "categories": list(category_clf.classes_),
            "priorities": list(priority_clf.classes_),
        },
        "category_evaluation": category_metrics,
        "priority_evaluation": priority_metrics,
    }

    with open(METRICS_PATH, "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2)

    print("\n--- Training & Evaluation Summary ---")
    print("Category Classifier:")
    print(f"  Accuracy:  {category_metrics['accuracy']:.4f}")
    print(f"  Precision: {category_metrics['precision']:.4f}")
    print(f"  Recall:    {category_metrics['recall']:.4f}")
    print(f"  F1 Score:  {category_metrics['f1_score']:.4f}")

    print("\nPriority Classifier:")
    print(f"  Accuracy:  {priority_metrics['accuracy']:.4f}")
    print(f"  Precision: {priority_metrics['precision']:.4f}")
    print(f"  Recall:    {priority_metrics['recall']:.4f}")
    print(f"  F1 Score:  {priority_metrics['f1_score']:.4f}")

    print(f"\nArtifacts saved successfully to {MODELS_DIR}")
    return metrics

if __name__ == "__main__":
    train_and_save()
