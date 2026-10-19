import re

class ComplaintSummarizer:
    """
    Generates concise factual executive summaries for staff and administrators (Phase 9).
    Strictly preserves the student's original grievance facts without introducing hallucinated details.
    """

    @classmethod
    def summarize(cls, title: str, description: str, location: str = None) -> str:
        clean_title = (title or "").strip()
        clean_desc = (description or "").strip()

        if not clean_desc:
            return clean_title

        # If description is already very brief (<= 18 words), clean and return
        words = clean_desc.split()
        if len(words) <= 18:
            if location and location.lower() not in clean_desc.lower():
                return f"[{location}] {clean_desc}"
            return clean_desc

        # Split into sentences
        sentences = [s.strip() for s in re.split(r"[.!?\n]+", clean_desc) if s.strip()]

        if not sentences:
            return clean_title

        # First sentence usually defines the core issue
        lead_sentence = sentences[0]

        # Look for operational impact sentences (e.g., mentions lecture, students, cannot proceed)
        impact_sentence = None
        for s in sentences[1:]:
            s_lower = s.lower()
            if any(term in s_lower for term in ["cannot", "not working", "fail", "lecture", "exam", "students", "class", "affect", "urgent", "no alternative"]):
                impact_sentence = s
                break

        if impact_sentence and impact_sentence != lead_sentence:
            summary = f"{lead_sentence}. {impact_sentence}."
        else:
            summary = f"{lead_sentence}."

        # Include location context if detected and not already in lead sentence
        if location and location.lower() not in summary.lower():
            summary = f"[{location}] {summary}"

        # Ensure no excessive length
        if len(summary) > 280:
            summary = summary[:277] + "..."

        return summary
