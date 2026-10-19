import os
import sys
import unittest
import json

# Add project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.app import create_app
from backend.app.config.config import TestingConfig
from backend.app.extensions import db
from backend.app.models.user import User, RoleEnum
from backend.app.models.category import Category
from backend.app.models.department import Department
from backend.app.models.complaint import Complaint, ComplaintStatus, ComplaintPriority
from backend.ai import AIService
from backend.ai.classification.taxonomy_classifier import TaxonomyClassifier
from backend.ai.classification.context_extractor import ComplaintContextExtractor
from backend.ai.classification.context_evaluator import ContextPriorityEvaluator

class Phase4ContextAwareAITestCase(unittest.TestCase):
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
    # Test 1: Broken classroom bench disrupting an ongoing lecture
    # =========================================================================
    def test_case_1_broken_classroom_bench_disrupting_lecture(self):
        """
        Broken classroom bench disrupting ongoing lecture:
        - Category: Campus Infrastructure (NOT Hostel)
        - Department: Campus Maintenance (NOT Hostel Administration)
        - Priority: HIGH (ongoing lecture disturbed)
        """
        title = "Broken bench in tutorial room"
        desc = "The bench is broken in tutorial room 2 and the ongoing lecture is being disturbed."
        analysis = AIService.analyze(title, desc)

        self.assertEqual(analysis["category"], "Campus Infrastructure")
        self.assertEqual(analysis["department"], "Campus Maintenance")
        self.assertEqual(analysis["priority"], "HIGH")
        self.assertIn("lecture", analysis["explanation"].lower())
        self.assertNotEqual(analysis["category"], "Hostel & Living")
        self.assertNotEqual(analysis["department"], "Hostel Administration")

    # =========================================================================
    # Test 2: Broken hostel furniture with no class-related impact
    # =========================================================================
    def test_case_2_broken_hostel_furniture_no_class_impact(self):
        """
        Broken hostel furniture:
        - Category: Hostel & Living
        - Department: Hostel Administration
        - Priority: LOW or MEDIUM (isolated individual amenity, no class affected)
        """
        title = "Broken study table drawer"
        desc = "Study table drawer is broken in hostel room 304 Block B."
        analysis = AIService.analyze(title, desc)

        self.assertEqual(analysis["category"], "Hostel & Living")
        self.assertEqual(analysis["department"], "Hostel Administration")
        self.assertIn(analysis["priority"], ["LOW", "MEDIUM"])
        self.assertNotEqual(analysis["category"], "Campus Infrastructure")

    # =========================================================================
    # Test 3: Wi-Fi outage during an examination
    # =========================================================================
    def test_case_3_wifi_outage_during_examination(self):
        """
        Wi-Fi outage during examination:
        - Category: Wi-Fi & Internet
        - Department: IT / Network
        - Priority: HIGH (examination disruption, critical)
        """
        title = "Wi-Fi not working"
        desc = "Wi-Fi is not working during an online examination in computer center."
        analysis = AIService.analyze(title, desc)

        self.assertEqual(analysis["category"], "Wi-Fi & Internet")
        self.assertEqual(analysis["department"], "IT / Network")
        self.assertEqual(analysis["priority"], "HIGH")
        self.assertEqual(analysis["disruption_level"], "CRITICAL")
        self.assertIn("examination", analysis["explanation"].lower())

    # =========================================================================
    # Test 4: Minor facility inconvenience with a reasonable workaround
    # =========================================================================
    def test_case_4_minor_facility_with_workaround(self):
        """
        Facility issue where alternative exists:
        - Priority: LOW (manual workaround works, non-urgent)
        """
        title = "Air conditioner remote malfunction"
        desc = "The air conditioner remote is not responding in Seminar Hall 1, but manual switch works fine."
        analysis = AIService.analyze(title, desc)

        self.assertEqual(analysis["category"], "Campus Infrastructure")
        self.assertEqual(analysis["department"], "Campus Maintenance")
        self.assertEqual(analysis["priority"], "LOW")
        self.assertTrue(any("workaround" in f.lower() or "alternative" in f.lower() for f in analysis["factors"]))

    # =========================================================================
    # Test 5: Electrical sparking or safety-critical hazard
    # =========================================================================
    def test_case_5_electrical_sparking_safety_hazard(self):
        """
        Safety hazard (electrical sparking):
        - Priority: HIGH
        - Human review: True
        """
        title = "Sparking electrical switch"
        desc = "Classroom 102 electrical switchboard is sparking with smoke coming out."
        analysis = AIService.analyze(title, desc)

        self.assertEqual(analysis["category"], "Campus Infrastructure")
        self.assertEqual(analysis["priority"], "HIGH")
        self.assertTrue(analysis["human_review_required"])
        self.assertIn("safety", analysis["explanation"].lower())

    # =========================================================================
    # Test 6: Vague complaint with insufficient location information
    # =========================================================================
    def test_case_6_vague_complaint_missing_location(self):
        """
        Vague description with missing location:
        - Human review required: True
        - Clarification questions provided
        """
        title = "Broken equipment"
        desc = "It is not working and broken."
        analysis = AIService.analyze(title, desc)

        self.assertTrue(analysis["human_review_required"])
        self.assertGreater(len(analysis["clarification_questions"]), 0)

    # =========================================================================
    # Test 7: Conflicting or ambiguous context
    # =========================================================================
    def test_case_7_conflicting_ambiguous_context(self):
        """
        Complaint with conflicting residential and academic keywords:
        - Human review: True
        - Clarification question asks to disambiguate hostel vs classroom
        """
        title = "Water leakage interruption"
        desc = "Professor lecture interrupted because hostel bathroom tap is leaking in classroom."
        analysis = AIService.analyze(title, desc)

        self.assertTrue(analysis["human_review_required"])
        self.assertTrue(any("hostel" in q.lower() or "classroom" in q.lower() for q in analysis["clarification_questions"]))

    # =========================================================================
    # Test 8: Complaint whose category or department is missing from taxonomy
    # =========================================================================
    def test_case_8_missing_out_of_taxonomy_complaint(self):
        """
        Complaint topic outside configured categories (e.g., fee refund/scholarship):
        - is_out_of_taxonomy: True
        - Human review: True
        - Low confidence flag
        """
        title = "Scholarship fee stipend refund"
        desc = "My semester tuition fee refund and scholarship stipend have not been credited to bank account."
        analysis = AIService.analyze(title, desc)

        self.assertTrue(analysis["is_out_of_taxonomy"])
        self.assertTrue(analysis["human_review_required"])
        self.assertTrue(analysis["is_low_confidence"])

    # =========================================================================
    # Test 9: Student can submit complaint without manually selecting Category & Dept
    # =========================================================================
    def test_student_submit_without_manual_category_or_department(self):
        token, _ = self._login("student@resolvex.edu", "Student@123")
        headers = {"Authorization": f"Bearer {token}"}

        # Submit only title and description
        res = self.client.post("/api/complaints", headers=headers, json={
            "title": "Wi-Fi disconnecting in hostel",
            "description": "The campus wireless internet keeps disconnecting continuously in Hostel Block A rooms.",
        })

        self.assertEqual(res.status_code, 201)
        data = json.loads(res.data)["data"]
        # AI auto-assigned Category and Department
        self.assertEqual(data["category_name"], "Wi-Fi & Internet")
        self.assertEqual(data["department_name"], "IT / Network")
        self.assertIsNotNone(data["ai_category"])
        self.assertIsNotNone(data["ai_department"])
        self.assertIsNotNone(data["ai_priority"])

    # =========================================================================
    # Test 10: Authorized staff/admin can override AI recommendations
    # =========================================================================
    def test_authorized_override_and_audit(self):
        # 1. Student creates complaint
        student_token, _ = self._login("student@resolvex.edu", "Student@123")
        student_headers = {"Authorization": f"Bearer {student_token}"}

        res = self.client.post("/api/complaints", headers=student_headers, json={
            "title": "Bench issue in tutorial room",
            "description": "A bench is broken in tutorial room 2 and ongoing lecture is being disturbed.",
        })
        self.assertEqual(res.status_code, 201)
        complaint = json.loads(res.data)["data"]
        comp_id = complaint["complaint_id"]

        # 2. Student cannot override (forbidden)
        override_res_student = self.client.post(f"/api/complaints/{comp_id}/override", headers=student_headers, json={
            "priority": "LOW",
            "reason": "Student trying to downgrade",
        })
        self.assertEqual(override_res_student.status_code, 403)

        # 3. Staff can override with audited reason
        staff_token, _ = self._login("staff@resolvex.edu", "Staff@123")
        staff_headers = {"Authorization": f"Bearer {staff_token}"}

        override_res_staff = self.client.post(f"/api/complaints/{comp_id}/override", headers=staff_headers, json={
            "priority": "MEDIUM",
            "reason": "Temporary chairs provided to class; downgraded from HIGH to MEDIUM.",
        })
        self.assertEqual(override_res_staff.status_code, 200)
        updated = json.loads(override_res_staff.data)["data"]
        self.assertEqual(updated["priority"], "MEDIUM")
        self.assertEqual(updated["final_priority"], "MEDIUM")
        self.assertTrue(updated["is_overridden"])

        # 4. Verify reload preserves override and audit history (via Admin)
        admin_token, _ = self._login("admin@resolvex.edu", "Admin@123")
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        get_res = self.client.get(f"/api/complaints/{comp_id}", headers=admin_headers)
        self.assertEqual(get_res.status_code, 200)
        data = json.loads(get_res.data)["data"]
        reloaded = data.get("complaint") or data
        self.assertEqual(reloaded["priority"], "MEDIUM")
        self.assertTrue(any("Overridden by" in h["notes"] for h in reloaded["history"]))

    # =========================================================================
    # Test 11: Dynamic support for newly added category in database
    # =========================================================================
    def test_newly_added_category_dynamic_classification(self):
        """Verify adding a new category to the database works without rebuilding the model."""
        # Add a new category "Sports & Fitness" under Department 3
        new_cat = Category(
            name="Sports & Gymnasium",
            department_id=3,
            description="Gym equipment, treadmill, weights, indoor sports courts",
            is_active=True
        )
        db.session.add(new_cat)
        db.session.commit()

        analysis = AIService.analyze(
            title="Broken treadmill belt in gym",
            description="The running treadmill belt in sports complex gym is torn and unusable."
        )

        self.assertEqual(analysis["category"], "Sports & Gymnasium")
        self.assertEqual(analysis["department"], "Campus Maintenance")
        self.assertFalse(analysis["is_out_of_taxonomy"])

if __name__ == "__main__":
    unittest.main()
