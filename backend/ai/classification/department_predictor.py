from backend.ai.config import CATEGORY_TO_DEPARTMENT

class DepartmentPredictor:
    """Predicts target operational department based on grievance classification."""

    @classmethod
    def predict(cls, category: str, category_confidence: float = 0.85):
        mapping = CATEGORY_TO_DEPARTMENT.get(category)
        if mapping:
            # Department confidence correlates strongly with category confidence
            dept_confidence = min(0.98, max(0.40, category_confidence * 0.95 + 0.05))
            return mapping["name"], mapping["id"], round(dept_confidence, 4)

        # Fallback to general maintenance
        return "Campus Maintenance", 3, 0.40
