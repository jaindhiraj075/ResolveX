import os
import re
from typing import Dict, Any, List, Optional, Tuple
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from backend.ai.classification.classifier import ComplaintClassifier
from backend.ai.preprocessing.text_cleaner import ComplaintPreprocessor

class TaxonomyClassifier:
    """
    Universal Category & Department Classifier.
    - Evaluates against ALL categories and departments currently configured in the database.
    - Distinguishes similar items using contextual signals (e.g. classroom bench vs hostel furniture).
    - Uses hybrid scoring: ML statistical confidence + taxonomy metadata similarity + contextual facility routing.
    - Gracefully handles newly added categories and missing/inactive taxonomies.
    - Flags uncertain or out-of-taxonomy complaints for human review rather than forcing incorrect labels.
    """

    # Domain keywords to tie specific facilities to suitable categories
    FACILITY_CATEGORY_HINTS = {
        "academic": {
            "preferred_categories": ["Campus Infrastructure", "Furniture & Maintenance", "Academic Facilities", "Lab & Equipment"],
            "disfavored_categories": ["Hostel & Living", "Hostel Facilities"],
        },
        "hostel": {
            "preferred_categories": ["Hostel & Living", "Hostel Facilities", "Hostel Maintenance"],
            "disfavored_categories": ["Lab & Equipment", "Academic Facilities"],
        },
        "lab": {
            "preferred_categories": ["Lab & Equipment", "CSE Lab", "Hardware & Software"],
            "disfavored_categories": ["Hostel & Living"],
        }
    }

    # Core keywords associated with fundamental services
    CATEGORY_THEME_KEYWORDS = {
        "wi-fi": ["wifi", "wi-fi", "internet", "network", "bandwidth", "router", "lan", "disconnect", "connectivity", "dns", "portal", "eduroam", "slow net"],
        "lab": ["workstation", "projector", "computer", "pc", "monitor", "software", "hardware", "cpu", "keyboard", "mouse", "boot", "crash", "blue screen", "lab"],
        "hostel": ["hostel", "room", "bed", "geyser", "mess", "washroom", "wardrobe", "warden", "corridor", "tap", "bathroom", "dorm", "fan", "shower"],
        "infrastructure": ["bench", "desk", "chair", "blackboard", "whiteboard", "ac", "air conditioner", "light", "switch", "switchboard", "sparking", "door", "window", "stairs", "elevator", "lift", "leakage", "ceiling", "plaster", "plumbing", "maintenance", "classroom", "tutorial room", "lecture hall"],
    }

    @classmethod
    def get_configured_taxonomy(cls) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """Loads all active categories and departments from the database."""
        try:
            from backend.app.models.category import Category
            from backend.app.models.department import Department
            departments = Department.query.filter_by(is_active=True).all()
            categories = Category.query.filter_by(is_active=True).all()
            dept_dicts = [d.to_dict() for d in departments]
            cat_dicts = [c.to_dict() for c in categories]
            return cat_dicts, dept_dicts
        except Exception:
            # Fallback if outside database context or during unit test without DB session
            return [], []

    @classmethod
    def predict(cls, text: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Dynamically classifies the complaint into configured categories and responsible departments.
        Returns:
        - category: str
        - category_id: int or None
        - category_confidence: float
        - department: str
        - department_id: int or None
        - department_confidence: float
        - routing_reason: str
        - is_out_of_taxonomy: bool
        - human_review_required: bool
        """
        cleaned = ComplaintPreprocessor.clean(text)
        text_lower = text.lower()
        context = context or {}
        facility_domain = context.get("facility_domain", "unknown")

        cat_list, dept_list = cls.get_configured_taxonomy()

        # If taxonomy is empty in DB (e.g. fresh DB or test), fallback to canonical
        if not cat_list or not dept_list:
            cat_list = [
                {"id": 1, "name": "Wi-Fi & Internet", "department_id": 1, "department_name": "IT / Network", "description": "Connectivity, slow speed, and router issues"},
                {"id": 2, "name": "Hostel & Living", "department_id": 2, "department_name": "Hostel Administration", "description": "Room allocation, water supply, and cleanliness"},
                {"id": 3, "name": "Campus Infrastructure", "department_id": 3, "department_name": "Campus Maintenance", "description": "Electrical points, AC, doors, and plumbing"},
                {"id": 4, "name": "Lab & Equipment", "department_id": 4, "department_name": "CSE Lab", "description": "Lab computers, projectors, and hardware"},
            ]
            dept_list = [
                {"id": 1, "name": "IT / Network", "is_active": True},
                {"id": 2, "name": "Hostel Administration", "is_active": True},
                {"id": 3, "name": "Campus Maintenance", "is_active": True},
                {"id": 4, "name": "CSE Lab", "is_active": True},
            ]

        # 1. Base ML model prediction (if loaded)
        ml_cat, ml_conf = ComplaintClassifier.predict(text)

        # 2. Score every configured category
        scored_categories = []
        for cat in cat_list:
            cat_name = cat["name"]
            cat_desc = (cat.get("description") or "").lower()
            cat_lower = cat_name.lower()
            score = 0.0
            reasons = []

            # Factor A: Contextual Facility Match / Penalty
            # Example: "The bench is broken in tutorial room 2" -> Academic environment MUST NOT route to Hostel
            if facility_domain == "academic":
                if any(k in cat_lower for k in ["hostel", "living", "dorm"]):
                    score -= 50.0
                    reasons.append("Penalized residential category due to academic facility context")
                elif any(k in cat_lower for k in ["infrastructure", "maintenance", "furniture", "campus"]):
                    score += 25.0
                    reasons.append("Aligned with campus / academic infrastructure")
            elif facility_domain == "hostel":
                if any(k in cat_lower for k in ["hostel", "living"]):
                    score += 25.0
                    reasons.append("Aligned with hostel facility context")
                elif any(k in cat_lower for k in ["lab", "equipment"]):
                    score -= 40.0
                    reasons.append("Penalized lab category in hostel setting")
            elif facility_domain == "lab":
                if any(k in cat_lower for k in ["lab", "equipment", "hardware"]):
                    score += 30.0
                    reasons.append("Aligned with laboratory facility context")

            # Factor B: Direct Topic Signal Matching
            tokens = set(cleaned.split())

            # Wi-Fi check
            has_wifi_signal = any(w in text_lower for w in cls.CATEGORY_THEME_KEYWORDS["wi-fi"])
            if has_wifi_signal:
                if any(k in cat_lower for k in ["wi-fi", "wifi", "internet", "network"]):
                    score += 45.0
                    reasons.append("Matched network/connectivity signals")

            # Lab hardware check
            has_lab_signal = any(w in text_lower for w in ["workstation", "projector", "lab pc", "blue screen", "desktop computer", "lab 2"])
            if has_lab_signal:
                if any(k in cat_lower for k in ["lab", "equipment"]):
                    score += 40.0
                    reasons.append("Matched lab hardware signals")

            # Furniture / Classroom infrastructure check
            has_furniture_signal = any(w in text_lower for w in ["bench", "desk", "chair", "board", "table", "door", "window", "ac", "air condition", "tube light", "switch", "sparking"])
            if has_furniture_signal:
                if facility_domain == "academic" or ("tutorial" in text_lower or "lecture" in text_lower or "classroom" in text_lower):
                    if any(k in cat_lower for k in ["infrastructure", "maintenance", "furniture", "campus"]):
                        score += 40.0
                        reasons.append("Matched classroom/facility infrastructure signals")
                elif facility_domain == "hostel" or "hostel" in text_lower:
                    if any(k in cat_lower for k in ["hostel", "living"]):
                        score += 30.0
                        reasons.append("Matched hostel furniture/amenity signals")

            # Plumbing / Tap check
            has_plumbing_signal = any(w in text_lower for w in ["tap", "leak", "leaking", "pipe", "drain", "water supply", "bathroom", "washroom", "flush"])
            if has_plumbing_signal:
                if "hostel" in text_lower or facility_domain == "hostel":
                    if any(k in cat_lower for k in ["hostel", "living", "plumbing"]):
                        score += 35.0
                        reasons.append("Matched hostel plumbing/water signals")
                else:
                    if any(k in cat_lower for k in ["infrastructure", "maintenance", "plumbing"]):
                        score += 35.0
                        reasons.append("Matched campus plumbing signals")

            # Factor C: Category Name / Description token overlap
            desc_tokens = set(re.findall(r"\w+", f"{cat_lower} {cat_desc}"))
            # Filter common stopwords from overlap count
            informative_tokens = {t for t in (tokens & desc_tokens) if len(t) > 2 and t not in {"and", "the", "for", "with", "from", "out", "are", "has", "have", "not"}}
            if informative_tokens:
                score += len(informative_tokens) * 12.0
                reasons.append(f"Matched category vocabulary: {', '.join(sorted(informative_tokens))}")

            # Factor D: ML Classifier boost only if confidence is substantial and text is not out-of-domain
            if ml_cat and cat_name.lower() == ml_cat.lower() and ml_conf >= 0.40:
                # If zero topic or facility evidence exists for this category, damp ML confidence
                has_any_positive_evidence = bool(reasons)
                if has_any_positive_evidence:
                    score += ml_conf * 25.0
                    reasons.append(f"Supported by statistical text model ({ml_conf*100:.1f}%)")
                else:
                    # Weak ungrounded ML prediction without domain/lexical support
                    score += ml_conf * 8.0

            scored_categories.append({
                "category": cat,
                "score": score,
                "reasons": reasons,
            })

        # Sort by total score
        scored_categories.sort(key=lambda x: x["score"], reverse=True)
        best_match = scored_categories[0] if scored_categories else None

        # Determine if we have a viable classification or if it's out-of-taxonomy / vague
        is_out_of_taxonomy = False
        human_review = False

        # If best match has very low score (< 12.0) or zero positive lexical/facility reasons, it is out of taxonomy or vague
        has_grounded_reasons = bool(best_match and any("Matched" in r or "Aligned" in r for r in best_match["reasons"]))
        if not best_match or best_match["score"] < 12.0 or not has_grounded_reasons:
            is_out_of_taxonomy = True
            human_review = True
            chosen_cat = cat_list[0] if cat_list else {"id": None, "name": "General Inquiries", "department_id": None}
            category_conf = 0.25
            routing_reason = "No matching category found in configured database taxonomy. Flagged for administrator review."
        else:
            chosen_cat = best_match["category"]
            second_score = scored_categories[1]["score"] if len(scored_categories) > 1 else 0.0
            margin = best_match["score"] - second_score
            category_conf = min(0.95, max(0.48, 0.50 + (margin / 50.0)))
            routing_reason = "; ".join(best_match["reasons"][:2]) or f"Classified based on contextual evidence for '{chosen_cat['name']}'."

        if category_conf < 0.50:
            human_review = True

        # 3. Department Resolution based on Category Relationship & DB verification
        dept_id = chosen_cat.get("department_id")
        dept_name = chosen_cat.get("department_name")

        # Verify department exists and is active in DB
        matching_dept = next((d for d in dept_list if d["id"] == dept_id or d["name"].lower() == (dept_name or "").lower()), None)

        if matching_dept and matching_dept.get("is_active", True):
            final_dept_id = matching_dept["id"]
            final_dept_name = matching_dept["name"]
            dept_conf = round(min(0.98, category_conf * 0.95 + 0.05), 2)
        else:
            # Inactive or missing department -> flag for safe review
            human_review = True
            final_dept_id = dept_list[0]["id"] if dept_list else None
            final_dept_name = dept_list[0]["name"] if dept_list else "Administration Review Queue"
            dept_conf = 0.30
            routing_reason += " Notice: Target department inactive or unmapped; routed to review queue."

        return {
            "category": chosen_cat["name"],
            "category_id": chosen_cat["id"],
            "category_confidence": round(category_conf, 2),
            "department": final_dept_name,
            "department_id": final_dept_id,
            "department_confidence": dept_conf,
            "routing_reason": routing_reason,
            "is_out_of_taxonomy": is_out_of_taxonomy,
            "human_review_required": human_review or context.get("human_review_required", False),
        }
