from backend.ai.classification.context_extractor import ComplaintContextExtractor
from backend.ai.classification.taxonomy_classifier import TaxonomyClassifier
from backend.ai.classification.context_evaluator import ContextPriorityEvaluator
from backend.ai.summarization.summarizer import ComplaintSummarizer
from backend.ai.duplicate_detection.detector import DuplicateDetector
from backend.ai.recurring_issues.recurring_service import RecurringIssueIntelligence

class AIService:
    """
    Universal Context-Aware AI Intelligence Pipeline (Phase 4 & Phase 9).
    Orchestrates:
    1. Operational Context Extraction (locations, activities, hazards, workarounds, ambiguity).
    2. Dynamic Taxonomy Classification (against DB configured categories & departments).
    3. Independent Context-Aware Priority Assessment.
    4. Factual Summarization & Semantic Duplicate Screening.
    """

    @classmethod
    def is_ready(cls) -> bool:
        return True

    @classmethod
    def analyze(cls, title: str, description: str, existing_complaints: list = None, duplicate_threshold: float = None):
        combined_text = f"{title or ''} {description or ''}".strip()

        try:
            # 1. Structured Context Extraction
            context = ComplaintContextExtractor.extract(title, description)

            # 2. Dynamic Taxonomy Classification
            taxonomy_res = TaxonomyClassifier.predict(combined_text, context=context)

            # 3. Context-Aware Priority Evaluation
            priority_res = ContextPriorityEvaluator.evaluate(
                combined_text,
                context=context,
            )

            # 4. Factual Summary
            summary = ComplaintSummarizer.summarize(title, description, location=context.get("location"))

            # 5. Semantic Duplicate Detection
            dup_result = DuplicateDetector.check_duplicate(
                combined_text,
                existing_complaints or [],
                threshold=duplicate_threshold
            )

            # Merge review requirement flags
            human_review = bool(
                taxonomy_res.get("human_review_required") or
                priority_res.get("human_review_required") or
                context.get("human_review_required") or
                dup_result.get("is_potential_duplicate") or
                taxonomy_res.get("is_out_of_taxonomy")
            )

            # Collect factors & questions
            factors = list(context.get("evidence", []))
            if taxonomy_res.get("routing_reason"):
                factors.append(f"Routing rationale: {taxonomy_res['routing_reason']}")
            if priority_res.get("explanation"):
                factors.append(f"Priority factor: {priority_res['explanation']}")

            is_low_conf = (
                taxonomy_res.get("category_confidence", 0.0) < 0.50 or
                taxonomy_res.get("is_out_of_taxonomy", False)
            )

            return {
                "category": taxonomy_res["category"],
                "category_id": taxonomy_res.get("category_id"),
                "category_confidence": taxonomy_res["category_confidence"],
                "department": taxonomy_res["department"],
                "department_id": taxonomy_res.get("department_id"),
                "department_confidence": taxonomy_res["department_confidence"],
                "priority": priority_res["priority"],
                "priority_confidence": priority_res["priority_confidence"],
                "explanation": priority_res["explanation"],
                "routing_reason": taxonomy_res.get("routing_reason"),
                "factors": factors,
                "summary": summary,
                "location": context.get("location"),
                "disruption_level": priority_res.get("disruption_level", "MEDIUM"),
                "clarification_questions": context.get("clarification_questions", []),
                "human_review_required": human_review,
                "is_out_of_taxonomy": taxonomy_res.get("is_out_of_taxonomy", False),

                # Duplicate screening
                "is_duplicate": dup_result["is_duplicate"],
                "is_potential_duplicate": dup_result.get("is_potential_duplicate", False),
                "duplicate_similarity": dup_result["similarity_score"],
                "original_complaint_id": dup_result["original_complaint_id"],
                "original_complaint_readable_id": dup_result["original_complaint_readable_id"],
                "original_title": dup_result.get("original_title"),
                "duplicate_reason": dup_result.get("duplicate_reason"),

                "is_low_confidence": is_low_conf,
                "is_fallback": False,
            }

        except Exception as e:
            # Fallback safe payload
            return {
                "category": "Campus Infrastructure",
                "category_id": 3,
                "category_confidence": 0.40,
                "department": "Campus Maintenance",
                "department_id": 3,
                "department_confidence": 0.40,
                "priority": "MEDIUM",
                "priority_confidence": 0.50,
                "explanation": "Assigned standard baseline classification pending review due to inference service fallback.",
                "routing_reason": "Inference fallback active.",
                "factors": ["Service fallback active; manual review recommended"],
                "summary": (title or "")[:150],
                "location": None,
                "disruption_level": "MEDIUM",
                "clarification_questions": ["Please confirm department and location details."],
                "human_review_required": True,
                "is_out_of_taxonomy": False,
                "is_duplicate": False,
                "is_potential_duplicate": False,
                "duplicate_similarity": 0.0,
                "original_complaint_id": None,
                "original_complaint_readable_id": None,
                "original_title": None,
                "duplicate_reason": "No comparison available during fallback.",
                "is_low_confidence": True,
                "is_fallback": True,
                "error": str(e),
            }

    @classmethod
    def analyze_recurring_issues(cls, complaints: list):
        return RecurringIssueIntelligence.analyze_clusters(complaints)
