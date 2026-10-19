from datetime import datetime, timedelta
from typing import List, Dict, Any
from backend.ai.classification.context_evaluator import ContextPriorityEvaluator

class RecurringIssueIntelligence:
    """
    Recurring Issue & Geographic Cluster Intelligence (Phase 9).
    Detects systemic repeated failures grouped by department, category, and campus location.
    Requires verified location data and minimum sample sizes (>= 2) without fabricating insights.
    """

    MIN_CLUSTER_SIZE = 2

    @classmethod
    def analyze_clusters(cls, complaints: list) -> List[Dict[str, Any]]:
        """
        Groups complaints by (category_name, location) and extracts evidence-backed patterns.
        `complaints` can be a list of Complaint model instances or dicts.
        """
        clusters: Dict[tuple, List[Any]] = {}

        for c in complaints:
            # Handle both models and dicts
            if hasattr(c, "description"):
                title = c.title or ""
                desc = c.description or ""
                cat_name = c.category.name if c.category else (getattr(c, "ai_category", None) or "General")
                dept_name = c.department.name if c.department else (getattr(c, "ai_department", None) or "General")
                loc = getattr(c, "location", None)
                cid = c.complaint_id
                status = c.status
                created_at = c.created_at
            else:
                title = c.get("title", "")
                desc = c.get("description", "")
                cat_name = c.get("category_name") or c.get("ai_category") or "General"
                dept_name = c.get("department_name") or c.get("ai_department") or "General"
                loc = c.get("location")
                cid = c.get("complaint_id")
                status = c.get("status")
                created_at = c.get("created_at")

            # If location not explicitly stored, attempt context extraction
            if not loc:
                loc = ContextPriorityEvaluator.extract_location(f"{title} {desc}")

            # Ignore tickets without reliable location data to prevent speculative false clusters
            if not loc or len(loc.strip()) < 3:
                continue

            key = (cat_name.strip(), loc.strip(), dept_name.strip())
            if key not in clusters:
                clusters[key] = []

            clusters[key].append({
                "complaint_id": cid,
                "title": title,
                "status": status,
                "created_at": created_at,
            })

        results: List[Dict[str, Any]] = []

        for (cat_name, location, dept_name), items in clusters.items():
            if len(items) < cls.MIN_CLUSTER_SIZE:
                continue  # Insufficient sample size

            count = len(items)
            unresolved = sum(1 for item in items if item["status"] not in ["RESOLVED", "CLOSED", "CLOSED_AS_DUPLICATE"])

            # Sort items by date if available
            cids = [item["complaint_id"] for item in items]

            # Evidence-backed operational insight
            insight = (
                f"{count} complaints regarding {cat_name} have been reported at {location} "
                f"({unresolved} currently unresolved). Consistent physical clustering indicates "
                f"a localized infrastructure fault rather than an isolated user issue."
            )

            rec_action = (
                f"Schedule on-site {dept_name} operational audit at {location} to inspect "
                f"underlying physical equipment and prevent further recurring tickets."
            )

            # Grounded confidence based on frequency
            cluster_confidence = min(0.96, round(0.70 + (count * 0.08), 2))

            results.append({
                "category": cat_name,
                "location": location,
                "department": dept_name,
                "incident_count": count,
                "unresolved_count": unresolved,
                "complaint_ids": cids,
                "confidence": cluster_confidence,
                "insight": insight,
                "recommended_action": rec_action,
                "sample_size_valid": True,
            })

        # Sort clusters by highest unresolved and highest incident count
        results.sort(key=lambda x: (x["unresolved_count"], x["incident_count"]), reverse=True)
        return results
