import re
from typing import Dict, Any, List, Optional
from backend.ai.preprocessing.text_cleaner import ComplaintPreprocessor

class ComplaintContextExtractor:
    """
    Extracts structured operational facts and evidence from title and description:
    - facility / location type (classroom, tutorial, lecture hall, lab, hostel, library, mess, campus)
    - specific room / block identifiers
    - operational activity (lecture, examination, lab session, study, sleep, none)
    - safety hazards (sparking, shock, fire, falling debris, chemical)
    - population scope (individual, room, whole class, hostel floor, entire campus)
    - available workarounds / alternatives (yes, no, partial)
    - ambiguity / vagueness signals (missing location, conflicting signals, too short)
    """

    LOCATION_PATTERNS = [
        # Specific room & facility matches
        (r"\b(?:tutorial\s+room|tutorial)\s+([0-9a-z\-]+)\b", "Tutorial Room", "academic"),
        (r"\b(?:lecture\s+hall|lh)\s*([0-9a-z\-]+)\b", "Lecture Hall", "academic"),
        (r"\b(?:seminar\s+hall)\s*([0-9a-z\-]*)\b", "Seminar Hall", "academic"),
        (r"\b(?:classroom|class\s+room|room)\s+([0-9a-z\-]+)\b", "Classroom", "academic_or_hostel"),
        (r"\b(?:cse\s+lab|ece\s+lab|it\s+lab|physics\s+lab|chemistry\s+lab|computer\s+lab|hardware\s+lab|lab)\s*([0-9a-z\-]*)\b", "Laboratory", "lab"),
        (r"\b(?:hostel\s+block|block|hostel)\s+([a-z0-9]+)(?:\s+room\s+([0-9]+))?\b", "Hostel", "hostel"),
        (r"\b(?:hostel\s+bathroom|hostel\s+washroom|hostel\s+mess|hostel\s+corridor|hostel\s+room)\b", "Hostel", "hostel"),
        (r"\b(?:central\s+library|library|reading\s+room)\b", "Library", "academic"),
        (r"\b(?:cafeteria|mess|canteen|food\s+court)\b", "Dining / Mess", "campus"),
        (r"\b(?:auditorium|sports\s+complex|gym|ground)\b", "Campus Facility", "campus"),
    ]

    FACILITY_KEYWORDS = {
        "hostel": ["hostel", "dorm", "warden", "room 304", "block a", "block b", "block c", "roommate", "mess hall", "geyser"],
        "academic": ["classroom", "class room", "tutorial room", "lecture hall", "auditorium", "seminar hall", "academic block"],
        "lab": ["cse lab", "ece lab", "computer lab", "hardware lab", "programming lab", "workstation", "projector", "lab 2"],
    }

    ACADEMIC_ACTIVITIES = {
        "exam": ["exam", "examination", "midterm", "final exam", "online test", "test", "quiz", "submission deadline", "viva"],
        "lecture": ["lecture", "class", "ongoing lecture", "ongoing class", "professor", "faculty teaching", "presentation"],
        "lab_session": ["lab session", "practical exam", "coding contest", "experiment"],
    }

    SAFETY_HAZARDS = [
        "electric shock", "shock", "sparking", "spark", "short circuit", "open wire", "exposed wire",
        "fire", "smoke", "burning smell", "gas leak", "chemical spill", "ceiling collapse",
        "falling plaster", "broken glass injury", "loose railing hazard", "water flooding electrical"
    ]

    WORKAROUND_INDICATORS_POSITIVE = [
        "manual works", "manually works", "manual switch works", "switch works fine", "works fine",
        "alternative exists", "alternative available", "backup available",
        "workaround exists", "mobile hotspot works", "hotspot works", "moved to another bench",
        "using other desk", "can use phone", "temporary fix", "minor inconvenience"
    ]

    WORKAROUND_INDICATORS_NEGATIVE = [
        "no alternative", "cannot proceed", "unusable", "halted", "stuck",
        "impossible", "no backup", "completely down", "no other way", "blocked",
        "session stopped", "cannot continue", "students unable to sit"
    ]

    DURATION_PROLONGED = [
        "persisting for", "ongoing for", "for weeks", "for a week", "for days", "for 2 weeks",
        "for 3 days", "for several days", "for a month", "chronic", "unresolved for",
        "since days", "prolonged", "recurring daily"
    ]

    @classmethod
    def extract(cls, title: str, description: str) -> Dict[str, Any]:
        combined = f"{title or ''} {description or ''}".strip()
        combined_lower = combined.lower()

        evidence: List[str] = []
        clarification_questions: List[str] = []
        is_ambiguous = False
        human_review_required = False

        # 1. Location Entity Extraction
        detected_location = None
        facility_domain = "unknown"

        for pattern, label, domain in cls.LOCATION_PATTERNS:
            match = re.search(pattern, combined_lower, re.IGNORECASE)
            if match:
                matched_str = match.group(0).strip().title()
                detected_location = matched_str
                facility_domain = domain
                evidence.append(f"Location identified: '{matched_str}' ({label})")
                break

        # Disambiguate "Classroom / Room" domain:
        if facility_domain == "academic_or_hostel":
            if any(k in combined_lower for k in ["hostel", "dorm", "warden", "bed", "geyser", "shower", "roommate"]):
                facility_domain = "hostel"
            else:
                facility_domain = "academic"

        # Explicit location check
        if not detected_location:
            # Check broad facility hints
            if any(k in combined_lower for k in cls.FACILITY_KEYWORDS["hostel"]):
                facility_domain = "hostel"
                evidence.append("Hostel context detected from description")
            elif any(k in combined_lower for k in cls.FACILITY_KEYWORDS["academic"]):
                facility_domain = "academic"
                evidence.append("Academic / Classroom context detected")
            elif any(k in combined_lower for k in cls.FACILITY_KEYWORDS["lab"]):
                facility_domain = "lab"
                evidence.append("Laboratory environment detected")

        # 2. Operational Activity Extraction
        activity = "none"
        # Check negated mentions like "no class"
        is_negated_class = bool(re.search(r"\bno\s+(?:class|lecture|exam)\b", combined_lower))

        if any(re.search(rf"\b{re.escape(term)}\b", combined_lower) for term in cls.ACADEMIC_ACTIVITIES["exam"]):
            activity = "examination"
            evidence.append("Active or upcoming examination/deadline affected")
        elif not is_negated_class and any(re.search(rf"\b{re.escape(term)}\b", combined_lower) for term in cls.ACADEMIC_ACTIVITIES["lecture"]):
            activity = "lecture"
            evidence.append("Ongoing lecture or academic instructional session affected")
        elif any(re.search(rf"\b{re.escape(term)}\b", combined_lower) for term in cls.ACADEMIC_ACTIVITIES["lab_session"]):
            activity = "lab_session"
            evidence.append("Laboratory practical session affected")

        # 3. Safety Hazard Detection
        detected_hazard = None
        for hazard in cls.SAFETY_HAZARDS:
            if hazard in combined_lower:
                detected_hazard = hazard
                evidence.append(f"Immediate safety/health hazard detected: '{hazard}'")
                human_review_required = True
                break

        # 4. Workaround & Alternative Solution Detection
        has_workaround = any(ind in combined_lower for ind in cls.WORKAROUND_INDICATORS_POSITIVE)
        no_workaround = any(ind in combined_lower for ind in cls.WORKAROUND_INDICATORS_NEGATIVE)

        if has_workaround and not no_workaround:
            workaround_status = "available"
            evidence.append("Practical workaround or alternative solution exists")
        elif no_workaround:
            workaround_status = "none"
            evidence.append("Zero alternative solutions; activity or session disrupted")
        else:
            workaround_status = "unspecified"

        # 5. Affected Population Scope
        population_scope = "unspecified"
        if any(term in combined_lower for term in ["entire", "whole class", "all students", "campus-wide", "everyone", "entire floor", "entire block"]):
            population_scope = "extensive"
            evidence.append("Extensive population affected across multiple students or entire facility")
        elif any(term in combined_lower for term in ["multiple students", "several students", "group", "roommates", "few students"]):
            population_scope = "moderate"
            evidence.append("Moderate group impact reported")
        elif any(term in combined_lower for term in ["my desk", "my room", "isolated", "one chair", "personal"]):
            population_scope = "isolated"
            evidence.append("Isolated individual impact")

        # 5b. Prolonged duration check
        if any(term in combined_lower for term in cls.DURATION_PROLONGED):
            evidence.append("Prolonged duration: issue persisting unresolved over an extended period")

        # 6. Ambiguity, Vague Descriptions & Clarifications
        words = combined.strip().split()
        if len(words) < 6:
            is_ambiguous = True
            human_review_required = True
            evidence.append("Brief description with insufficient contextual detail")
            clarification_questions.append("Could you specify the exact campus building, room number, or facility where this occurred?")

        if not detected_location and facility_domain == "unknown":
            is_ambiguous = True
            human_review_required = True
            clarification_questions.append("Which building, department, or room is experiencing this issue?")

        # Check for conflicting or contradictory context (e.g. mentions exam in hostel bathroom or conflicting domains)
        has_hostel_terms = any(k in combined_lower for k in ["hostel", "dorm", "bathroom", "tap", "bed", "geyser"])
        has_academic_terms = any(k in combined_lower for k in ["lecture", "tutorial", "prof", "class", "exam", "syllabus"])
        if has_hostel_terms and has_academic_terms and "lecture" in combined_lower and "hostel" in combined_lower:
            is_ambiguous = True
            human_review_required = True
            evidence.append("Conflicting context detected across residential and academic domains")
            clarification_questions.append("Please clarify whether this issue occurred in your hostel accommodation or academic classroom.")

        return {
            "location": detected_location,
            "facility_domain": facility_domain,
            "activity": activity,
            "safety_hazard": detected_hazard,
            "workaround_status": workaround_status,
            "population_scope": population_scope,
            "evidence": evidence,
            "is_ambiguous": is_ambiguous,
            "clarification_questions": clarification_questions,
            "human_review_required": human_review_required,
        }
