class AIService:
    """Service stub for NLP categorization and duplicate detection (Phase 4)."""

    @staticmethod
    def classify_complaint(text: str):
        """Will predict category, department, and priority with confidence score."""
        return {
            "category": "Wi-Fi & Internet",
            "department": "IT / Network",
            "priority": "MEDIUM",
            "confidence": 0.85
        }

    @staticmethod
    def detect_duplicates(title: str, description: str):
        """Will compute cosine similarity across active complaints."""
        return []
