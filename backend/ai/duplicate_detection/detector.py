import os
import joblib
from sklearn.metrics.pairwise import cosine_similarity
from backend.ai.config import VECTORIZER_PATH, DUPLICATE_THRESHOLD
from backend.ai.preprocessing.text_cleaner import ComplaintPreprocessor

class DuplicateDetector:
    """
    Context-Aware Duplicate & Incident Clustering Detector (Phase 9).
    Identifies semantically similar complaints while preventing premature
    auto-closure of genuine separate incidents.
    """

    _vectorizer = None

    @classmethod
    def load_vectorizer(cls):
        if cls._vectorizer is None and os.path.exists(VECTORIZER_PATH):
            cls._vectorizer = joblib.load(VECTORIZER_PATH)
        return cls._vectorizer is not None

    @classmethod
    def check_duplicate(cls, new_text: str, candidate_complaints: list, threshold: float = None):
        """
        Compares `new_text` against candidate complaints:
        [{ "id": 1, "complaint_id": "RX-2026-000001", "title": "...", "description": "..." }]
        """
        auto_close_threshold = 0.85  # Only auto-close if virtually identical
        potential_threshold = threshold if threshold is not None else DUPLICATE_THRESHOLD  # 0.65

        if not candidate_complaints or not cls.load_vectorizer():
            return {
                "is_duplicate": False,
                "is_potential_duplicate": False,
                "similarity_score": 0.0,
                "original_complaint_id": None,
                "original_complaint_readable_id": None,
                "original_title": None,
                "duplicate_reason": "No previous complaints available for comparison.",
                "requires_human_verification": False,
            }

        cleaned_new = ComplaintPreprocessor.clean(new_text)
        if not cleaned_new:
            return {
                "is_duplicate": False,
                "is_potential_duplicate": False,
                "similarity_score": 0.0,
                "original_complaint_id": None,
                "original_complaint_readable_id": None,
                "original_title": None,
                "duplicate_reason": "Insufficient text for similarity analysis.",
                "requires_human_verification": False,
            }

        # Vectorize new text
        new_vec = cls._vectorizer.transform([cleaned_new])

        # Vectorize candidate texts
        candidate_texts = [
            ComplaintPreprocessor.clean(f"{c.get('title', '')} {c.get('description', '')}")
            for c in candidate_complaints
        ]
        candidate_vecs = cls._vectorizer.transform(candidate_texts)

        # Compute cosine similarities
        sim_matrix = cosine_similarity(new_vec, candidate_vecs)[0]

        max_idx = int(sim_matrix.argmax())
        max_score = float(sim_matrix[max_idx])

        matched_candidate = candidate_complaints[max_idx]

        is_confirmed_duplicate = max_score >= auto_close_threshold
        is_potential_duplicate = max_score >= potential_threshold and not is_confirmed_duplicate

        if is_confirmed_duplicate:
            reason = f"High textual and contextual identity ({max_score*100:.1f}%) with {matched_candidate.get('complaint_id')}."
        elif is_potential_duplicate:
            reason = f"Moderate semantic similarity ({max_score*100:.1f}%) with {matched_candidate.get('complaint_id')}; flagged for human verification to ensure separate incidents are not merged."
        else:
            reason = "Unique incident: no prior duplicate match exceeding similarity thresholds."

        return {
            "is_duplicate": is_confirmed_duplicate,
            "is_potential_duplicate": is_potential_duplicate,
            "similarity_score": round(max_score, 4),
            "original_complaint_id": matched_candidate["id"] if (is_confirmed_duplicate or is_potential_duplicate) else None,
            "original_complaint_readable_id": matched_candidate.get("complaint_id") if (is_confirmed_duplicate or is_potential_duplicate) else None,
            "original_title": matched_candidate.get("title") if (is_confirmed_duplicate or is_potential_duplicate) else None,
            "duplicate_reason": reason,
            "requires_human_verification": is_potential_duplicate,
        }
