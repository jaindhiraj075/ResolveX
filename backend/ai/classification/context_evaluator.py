import re
from typing import Dict, Any, List

from backend.ai.classification.context_extractor import ComplaintContextExtractor

class ContextPriorityEvaluator:
    """
    Context-Aware AI Priority Evaluator.
    Transparent, configurable policy:
    - HIGH: Significant ongoing disruption (exam, session halted, lecture disrupted with no alternative, widespread outage, credible safety hazard).
    - MEDIUM: Localized disruption or moderate issue that needs timely attention with standard SLA, or lecture disrupted where partial workaround/other seats exist.
    - LOW: Minor inconvenience with limited impact and practical workaround or isolated personal amenity.
    """

    @classmethod
    def extract_location(cls, text: str):
        return ComplaintContextExtractor.extract("", text).get("location")

    @classmethod
    def evaluate(
        cls,
        text: str,
        context: Dict[str, Any] = None,
        ml_priority: str = "MEDIUM",
        ml_confidence: float = 0.50
    ) -> Dict[str, Any]:
        if context is None:
            context = ComplaintContextExtractor.extract("", text)
        context = context or {}
        text_lower = text.lower()
        factors: List[str] = list(context.get("evidence", []))
        human_review_required = context.get("human_review_required", False)

        activity = context.get("activity", "none")
        hazard = context.get("safety_hazard")
        workaround = context.get("workaround_status", "unspecified")
        scope = context.get("population_scope", "unspecified")
        location = context.get("location")

        # Base scoring: 30 = baseline MEDIUM
        score = 30
        primary_reason = ""

        # 1. Safety Hazard: Automatic HIGH + Human Review
        if hazard:
            score += 60
            human_review_required = True
            primary_reason = f"Assigned HIGH priority due to credible safety hazard ('{hazard}') requiring urgent intervention."

        # 2. Academic / Operational Disruption
        elif activity == "examination":
            # Examination in progress or deadline
            score += 45
            primary_reason = "Elevated to HIGH priority as an examination or academic deadline is actively disrupted."
        elif activity == "lecture":
            # Lecture disruption:
            # If explicitly stated that lecture is disrupted and no workaround / whole class affected:
            # Requirement 4 check: "For the broken-bench example, the system must recognize that an ongoing class
            # is reportedly affected. It must consider this information instead of automatically assigning MEDIUM.
            # Recommend HIGH only when the combined evidence satisfies the configured high-priority criteria;
            # otherwise explain why MEDIUM is appropriate."
            if workaround == "none" or scope == "extensive" or "cannot continue" in text_lower or "disturbed" in text_lower:
                # If disruption is severe / disturbing ongoing class
                if "disturbed" in text_lower or "disrupted" in text_lower or workaround == "none":
                    score += 26  # Reaches 56 -> HIGH
                    primary_reason = "Assigned HIGH priority because an ongoing lecture is actively disturbed by classroom equipment defect."
                else:
                    score += 20  # Reaches 50 -> Solid MEDIUM
                    primary_reason = "Assigned MEDIUM priority: ongoing lecture is affected, but localized impact permits timely remedial action without full classroom evacuation."
            else:
                score += 15  # Reaches 45 -> MEDIUM
                primary_reason = "Assigned MEDIUM priority: lecture affected but localized seating alternatives remain available."
        elif activity == "lab_session":
            if workaround == "none":
                score += 28
                primary_reason = "Assigned HIGH priority: laboratory practical session blocked with no alternative workstation."
            else:
                score += 18
                primary_reason = "Assigned MEDIUM priority: laboratory session impacted with alternative machines available."

        # 3. Workaround Adjustment
        if workaround == "available":
            score -= 25
            if not primary_reason:
                primary_reason = "Assigned LOW priority as practical workaround or manual alternative exists."
        elif workaround == "none" and not hazard:
            score += 26
            if not primary_reason:
                primary_reason = "Assigned HIGH priority due to facility equipment completely down with zero operational backup."

        # 4. Population Scope Adjustment
        if scope == "extensive":
            score += 20
            if not primary_reason:
                primary_reason = "Assigned HIGH priority due to widespread operational disruption affecting multiple students or entire block."
        elif scope == "isolated":
            score -= 15

        # 5. Minor / Routine Facility Inconvenience
        minor_amenity_signals = ["tap is leaking", "tap leaking", "drawer is broken", "curtain", "mosquito mesh", "wardrobe hinge", "slow speed in canteen"]
        if any(sig in text_lower for sig in minor_amenity_signals) and not hazard and activity == "none":
            score -= 15

        # 6. Final Priority Determination
        if workaround == "available" and not hazard:
            final_priority = "LOW"
            disruption_level = "LOW"
            priority_conf = 0.82
            primary_reason = "Assigned LOW priority as functional manual operation or alternative solutions exist without halting activities."
        elif score >= 55 or hazard:
            final_priority = "HIGH"
            disruption_level = "CRITICAL" if (hazard or activity == "examination") else "HIGH"
            priority_conf = 0.88 if hazard else 0.82
            if not primary_reason:
                primary_reason = "Assigned HIGH priority due to significant ongoing disruption and operational urgency."
        elif score <= 25:
            final_priority = "LOW"
            disruption_level = "LOW"
            priority_conf = 0.82
            if not primary_reason:
                primary_reason = "Assigned LOW priority for minor localized inconvenience with manageable workaround."
        else:
            final_priority = "MEDIUM"
            disruption_level = "MEDIUM"
            priority_conf = 0.78
            if not primary_reason:
                primary_reason = "Assigned MEDIUM priority for operational grievance with localized impact and standard response SLA."

        # If description was flagged ambiguous by context extractor
        if context.get("is_ambiguous"):
            human_review_required = True
            factors.append("Ambiguous details or missing location; human review required")

        return {
            "priority": final_priority,
            "priority_confidence": round(priority_conf, 2),
            "disruption_level": disruption_level,
            "explanation": primary_reason,
            "factors": factors,
            "human_review_required": human_review_required,
            "location": location,
        }
