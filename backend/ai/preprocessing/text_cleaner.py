import re
import string

class ComplaintPreprocessor:
    """Preprocesses raw complaint text for vectorization and ML classification."""

    # Words to preserve regardless of punctuation
    SPECIAL_TOKENS = {
        r"\bwi-fi\b": "wifi",
        r"\bwifi\b": "wifi",
        r"\be-mail\b": "email",
        r"\bair\s+condition(ing|er)?\b": "ac",
        r"\ba/c\b": "ac",
    }

    # Common English stopwords (excluding critical negations/severity indicators)
    STOPWORDS = {
        "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are",
        "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but",
        "by", "could", "did", "do", "does", "doing", "down", "during", "each", "few", "for",
        "from", "further", "had", "has", "have", "having", "he", "her", "here", "hers", "herself",
        "him", "himself", "his", "how", "i", "if", "in", "into", "is", "it", "its", "itself",
        "me", "more", "most", "my", "myself", "of", "off", "on", "once", "only", "or", "other",
        "ought", "our", "ours", "ourselves", "out", "over", "own", "same", "she", "should", "so",
        "some", "such", "than", "that", "the", "their", "theirs", "them", "themselves", "then",
        "there", "these", "they", "this", "those", "through", "to", "too", "under", "until", "up",
        "very", "was", "we", "were", "what", "when", "where", "which", "while", "who", "whom",
        "why", "with", "would", "you", "your", "yours", "yourself", "yourselves"
    }

    @classmethod
    def clean(cls, text: str, remove_stopwords: bool = False) -> str:
        if not text or not isinstance(text, str):
            return ""

        cleaned = text.lower()

        # Normalize special tokens
        for pattern, replacement in cls.SPECIAL_TOKENS.items():
            cleaned = re.sub(pattern, replacement, cleaned, flags=re.IGNORECASE)

        # Remove URLs and email addresses
        cleaned = re.sub(r"https?://\S+|www\.\S+", " ", cleaned)
        cleaned = re.sub(r"\S+@\S+", " ", cleaned)

        # Remove punctuation except hyphens in words
        cleaned = re.sub(r"[^\w\s-]", " ", cleaned)
        cleaned = re.sub(r"\s+", " ", cleaned).strip()

        if remove_stopwords:
            tokens = cleaned.split()
            filtered = [t for t in tokens if t not in cls.STOPWORDS or len(t) <= 2]
            cleaned = " ".join(filtered)

        return cleaned

    @classmethod
    def combine_and_clean(cls, title: str, description: str) -> str:
        combined = f"{title or ''} {description or ''}".strip()
        return cls.clean(combined)
