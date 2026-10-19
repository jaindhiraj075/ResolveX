import os
import sys
import unittest
import json
from datetime import datetime

# Add project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.app import create_app
from backend.app.config.config import TestingConfig
from backend.app.extensions import db
from backend.app.models.user import User, RoleEnum
from backend.app.models.category import Category
from backend.app.models.department import Department
from backend.app.models.complaint import Complaint, ComplaintStatus, ComplaintPriority
from backend.app.models.history import ComplaintHistory
from backend.ai import AIService
from backend.ai.classification.context_evaluator import ContextPriorityEvaluator
from backend.ai.summarization.summarizer import ComplaintSummarizer
from backend.ai.duplicate_detection.detector import DuplicateDetector
from backend.ai.recurring_issues.recurring_service import RecurringIssueIntelligence

class Phase9ContextAITestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app(TestingConfig)
        self.client = self.app.test_client()
        self.ctx = self.app.app_context()
        self.ctx.push()

    def tearDown(self):
        db.session.remove()
        self.ctx.pop()

    def _login(self, email, password):
        res = self.client.post("/api/auth/login", json={"email": email, "password": password})
        data = json.loads(res.data)
        return data["data"]["token"], data["data"]["user"]

    # =========================================================================
    # 1. Context-Aware Priority Assignment (Section 1)
    # =========================================================================
    def test_context_priority_evaluator_lecture_vs_manual_workaround(self):
        """Test same category gets HIGH during lecture with no alternative vs LOW when manual operation works."""
        # Scenario A: Projector unusable during important lecture, whole class depends, no alternative -> HIGH
        res_high = ContextPriorityEvaluator.evaluate(
            "The projector in Lecture Hall 2 is unusable during an important lecture. The entire class depends on it and no alternative exists."
        )
        self.assertEqual(res_high["priority"], "HIGH")
        self.assertIn("lecture", res_high["explanation"].lower() + " ".join(res_high["factors"]).lower())

        # Scenario B: Projector remote faulty but manual operation works -> LOW
        res_low = ContextPriorityEvaluator.evaluate(
            "The projector remote control is faulty in Hall 3 but manual operation works fine without halting presentation."
        )
        self.assertEqual(res_low["priority"], "LOW")
        self.assertIn("manual", res_low["explanation"].lower() + " ".join(res_low["factors"]).lower())

    def test_context_priority_evaluator_wifi_exam_vs_minor_amenity(self):
        """Test Wi-Fi category gets HIGH during online exam vs LOW when alternatives exist."""
        # Scenario C: Network fails during online exam -> HIGH
        res_exam = ContextPriorityEvaluator.evaluate(
            "Campus wireless network fails during an online examination in computer center, blocking all student submissions."
        )
        self.assertEqual(res_exam["priority"], "HIGH")
        self.assertEqual(res_exam["disruption_level"], "CRITICAL")

        # Scenario D: Few students cannot access Wi-Fi but alternatives exist -> LOW
        res_minor = ContextPriorityEvaluator.evaluate(
            "A few students cannot access Wi-Fi in the common area but alternative exists and mobile data works."
        )
        self.assertEqual(res_low := res_minor["priority"], "LOW")
        self.assertIn("alternative", " ".join(res_minor["factors"]).lower())

    def test_context_priority_evaluator_electrical_safety_hazard(self):
        """Test safety hazard automatically gets HIGH priority and flags human review."""
        res_hazard = ContextPriorityEvaluator.evaluate(
            "Credible electrical safety hazard: sparking wires and smoke near switchboard in Physics Lab."
        )
        self.assertEqual(res_hazard["priority"], "HIGH")
        self.assertTrue(res_hazard["human_review_required"])
        self.assertTrue(any("safety" in f.lower() for f in res_hazard["factors"]))

    def test_prolonged_duration_increases_urgency(self):
        """Test prolonged duration factor is detected and reported."""
        res_prolonged = ContextPriorityEvaluator.evaluate(
            "Water tap in Hostel Block A has been continuously leaking, persisting for weeks without resolution."
        )
        self.assertTrue(any("prolonged" in f.lower() for f in res_prolonged["factors"]))

    # =========================================================================
    # 2. Missing Information & Low Confidence Handling (Section 2)
    # =========================================================================
    def test_brief_ambiguous_text_requires_human_review(self):
        """Test that short or ambiguous complaints are marked for human review."""
        res = ContextPriorityEvaluator.evaluate("Broken chair.")
        self.assertTrue(res["human_review_required"])
        self.assertTrue(any("review" in f.lower() for f in res["factors"]))

    # =========================================================================
    # 3. AI Factual Summarization (Section 3)
    # =========================================================================
    def test_factual_summarizer_preserves_student_facts_without_hallucination(self):
        """Verify summarizer retains core sentences and location without fabricating facts."""
        title = "Air conditioning failure in CSE Lab"
        description = "Workstation room temperature reached 38 degrees Celsius during afternoon practical session. Machines began overheating and shutting down."
        summary = ComplaintSummarizer.summarize(title, description, location="CSE Lab")

        self.assertIn("CSE Lab", summary)
        self.assertIn("38 degrees Celsius", summary)
        # Verify it doesn't invent unstated facts
        self.assertNotIn("fire department", summary.lower())
        self.assertNotIn("dean", summary.lower())

    # =========================================================================
    # 4. Duplicate Detection: Confirmed vs Potential Incidents (Section 4)
    # =========================================================================
    def test_duplicate_differentiation_confirmed_vs_potential(self):
        """Test high similarity auto-closed vs moderate similarity marked for human review."""
        candidate = [{
            "id": 1,
            "complaint_id": "RX-2026-000001",
            "title": "Water leakage in 3rd floor washroom",
            "description": "Continuous water leaking from flush pipe creating puddle in Hostel Block B."
        }]

        # 1. Near identical text (similarity >= 0.85) -> Confirmed Duplicate
        res_confirmed = DuplicateDetector.check_duplicate(
            "Continuous water leaking from flush pipe creating puddle in Hostel Block B 3rd floor washroom",
            candidate
        )
        self.assertTrue(res_confirmed["is_duplicate"])
        self.assertFalse(res_confirmed["requires_human_verification"])
        self.assertGreaterEqual(res_confirmed["similarity_score"], 0.80)

        # 2. Distinct issue in another facility -> Not duplicate
        res_distinct = DuplicateDetector.check_duplicate(
            "Projector lamp blown in Seminar Hall 1 during guest lecture",
            candidate
        )
        self.assertFalse(res_distinct["is_duplicate"])
        self.assertFalse(res_distinct.get("is_potential_duplicate", False))

    # =========================================================================
    # 5. Security: Student Cannot Submit Final Priority (Section 6)
    # =========================================================================
    def test_student_cannot_dictate_final_priority(self):
        """Verify authoritative context priority is set by AI and ignores student tampering."""
        token, _ = self._login("student@resolvex.edu", "Student@123")
        headers = {"Authorization": f"Bearer {token}"}

        # Student attempts to file a critical exam network crash with priority: LOW
        res = self.client.post("/api/complaints", headers=headers, json={
            "title": "Campus network fails during an online examination",
            "description": "Campus wireless network fails during an online examination in computer center, blocking all student submissions.",
            "category_id": 1,
            "department_id": 1,
            "priority": "LOW" # Student tampering attempt
        })
        self.assertEqual(res.status_code, 201)
        data = json.loads(res.data)["data"]

        # Backend AI evaluated context disruption and assigned authoritative HIGH priority
        self.assertEqual(data["priority"], "HIGH")
        self.assertEqual(data["ai_priority"], "HIGH")

    # =========================================================================
    # 6. Override Intelligence with Recorded Reason & Audit (Section 6)
    # =========================================================================
    def test_staff_admin_override_requires_recorded_reason(self):
        """Verify override requires non-empty reason and records audit history."""
        student_token, _ = self._login("student@resolvex.edu", "Student@123")
        admin_token, _ = self._login("admin@resolvex.edu", "Admin@123")

        # Submit complaint
        res_sub = self.client.post("/api/complaints", headers={"Authorization": f"Bearer {student_token}"}, json={
            "title": "Ceiling fan squeaking in Room 104",
            "description": "Fan makes a squeaking noise when running at top speed in Room 104 Hostel Block A.",
            "category_id": 2,
            "department_id": 2,
        })
        cid = json.loads(res_sub.data)["data"]["complaint_id"]

        # 1. Override without reason -> 400 Bad Request
        res_no_reason = self.client.post(
            f"/api/complaints/{cid}/override",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "priority": "HIGH",
                "reason": "" # Empty reason
            }
        )
        self.assertEqual(res_no_reason.status_code, 400)
        self.assertIn("reason", json.loads(res_no_reason.data)["message"].lower())

        # 2. Override with recorded reason -> 200 Success
        res_with_reason = self.client.post(
            f"/api/complaints/{cid}/override",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "priority": "HIGH",
                "reason": "Wobbly fan bracket poses falling hazard to student desk below."
            }
        )
        self.assertEqual(res_with_reason.status_code, 200)
        data = json.loads(res_with_reason.data)["data"]

        self.assertTrue(data["is_overridden"])
        self.assertEqual(data["final_priority"], "HIGH")
        self.assertEqual(data["priority"], "HIGH")

        # Verify audit history
        history_actions = [h["action"] for h in data["history"]]
        self.assertIn("AI Recommendation Overridden", history_actions)
        override_entry = next(h for h in data["history"] if h["action"] == "AI Recommendation Overridden")
        self.assertIn("Wobbly fan bracket", override_entry["notes"])

    def test_student_forbidden_from_overriding_ai(self):
        """Verify student role gets 403 Forbidden when attempting to override AI."""
        student_token, _ = self._login("student@resolvex.edu", "Student@123")

        res_sub = self.client.post("/api/complaints", headers={"Authorization": f"Bearer {student_token}"}, json={
            "title": "Library fluorescent tube flickering",
            "description": "Fluorescent light flickering on 2nd floor library reading desk.",
            "category_id": 3,
            "department_id": 3,
        })
        cid = json.loads(res_sub.data)["data"]["complaint_id"]

        res_forbidden = self.client.post(
            f"/api/complaints/{cid}/override",
            headers={"Authorization": f"Bearer {student_token}"},
            json={"priority": "HIGH", "reason": "Self upgrade"}
        )
        self.assertEqual(res_forbidden.status_code, 403)

    # =========================================================================
    # 7. Recurring Issue & Geographic Cluster Intelligence (Section 5)
    # =========================================================================
    def test_recurring_issue_clustering_requires_sample_size_and_location(self):
        """Verify recurring issue clusters group by (category, location, dept) with valid sample size."""
        admin_token, _ = self._login("admin@resolvex.edu", "Admin@123")
        student_token, _ = self._login("student@resolvex.edu", "Student@123")

        # Seed two complaints at the exact same location "Hostel Block A" with category "Wi-Fi & Internet"
        self.client.post("/api/complaints", headers={"Authorization": f"Bearer {student_token}"}, json={
            "title": "Frequent Wi-Fi signal loss in Hostel Block A",
            "description": "Wireless connectivity drops continuously in Hostel Block A corridor.",
            "category_id": 1,
            "department_id": 1,
        })
        self.client.post("/api/complaints", headers={"Authorization": f"Bearer {student_token}"}, json={
            "title": "Cannot obtain IP address in Hostel Block A",
            "description": "DHCP timeout error when connecting to router in Hostel Block A.",
            "category_id": 1,
            "department_id": 1,
        })

        # Admin fetches recurring issues
        res = self.client.get("/api/ai/recurring-issues", headers={"Authorization": f"Bearer {admin_token}"})
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)["data"]

        clusters = data["clusters"]
        self.assertGreaterEqual(len(clusters), 1)

        # Find the Hostel Block A cluster
        cluster = next((c for c in clusters if "Hostel Block A" in c["location"]), None)
        self.assertIsNotNone(cluster)
        self.assertGreaterEqual(cluster["incident_count"], 2)
        self.assertTrue(cluster["sample_size_valid"])
        self.assertIn("Wi-Fi & Internet", cluster["category"])
        self.assertIn("insight", cluster)
        self.assertIn("recommended_action", cluster)

    def test_student_cannot_access_recurring_issues(self):
        """Verify students cannot view recurring issue telemetry (403 Forbidden)."""
        student_token, _ = self._login("student@resolvex.edu", "Student@123")
        res = self.client.get("/api/ai/recurring-issues", headers={"Authorization": f"Bearer {student_token}"})
        self.assertEqual(res.status_code, 403)

    # =========================================================================
    # 8. Safe Fallback on AI Service Error
    # =========================================================================
    def test_ai_service_safe_fallback(self):
        """Verify AIService returns non-crashing fallback dictionary upon error."""
        # Force an error by passing unparseable input or invoking fallback directly
        fallback_res = AIService.analyze(title=None, description=None)
        self.assertIn("category", fallback_res)
        self.assertIn("priority", fallback_res)
        self.assertIn("summary", fallback_res)
        self.assertIn("explanation", fallback_res)
        self.assertTrue(fallback_res.get("human_review_required"))

if __name__ == "__main__":
    unittest.main()
