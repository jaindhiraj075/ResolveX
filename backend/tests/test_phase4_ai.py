import os
import sys
import unittest
import json

# Add project root to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.app import create_app
from backend.app.config.config import TestingConfig
from backend.app.extensions import db
from backend.app.models.complaint import Complaint, ComplaintStatus
from backend.app.models.duplicate import DuplicateComplaint
from backend.ai import AIService
from backend.ai.preprocessing.text_cleaner import ComplaintPreprocessor

class Phase4AITestCase(unittest.TestCase):
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

    def test_nlp_preprocessing(self):
        raw = "Wi-Fi is NOT working in Hostel Block A!! Check URL: https://wifi.edu"
        cleaned = ComplaintPreprocessor.clean(raw)
        self.assertIn("wifi", cleaned)
        self.assertIn("not", cleaned)
        self.assertIn("hostel", cleaned)
        self.assertNotIn("https", cleaned)

    def test_ai_service_direct_analysis(self):
        res = AIService.analyze(
            title="Wi-Fi connectivity dropped in Hostel Block A",
            description="Unable to reach gateway on eduroam wireless network during exam."
        )
        self.assertIn("category", res)
        self.assertEqual(res["category"], "Wi-Fi & Internet")
        self.assertEqual(res["department"], "IT / Network")
        self.assertGreater(res["category_confidence"], 0.0)
        self.assertLessEqual(res["category_confidence"], 1.0)
        self.assertIn(res["priority"], ["LOW", "MEDIUM", "HIGH"])
        self.assertFalse(res["is_duplicate"])

    def test_api_ai_analyze_endpoint(self):
        token, _ = self._login("student@resolvex.edu", "Student@123")
        headers = {"Authorization": f"Bearer {token}"}

        res = self.client.post(
            "/api/ai/analyze",
            headers=headers,
            json={
                "title": "Desktop computer blue screen crash",
                "description": "Workstation 12 in CSE Lab 2 crashes on boot with blue screen error."
            }
        )
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)["data"]
        self.assertEqual(data["category"], "Lab & Equipment")
        self.assertEqual(data["department"], "CSE Lab")
        self.assertGreater(data["category_confidence"], 0.0)

    def test_complaint_submission_stores_ai_and_detects_duplicate(self):
        token, _ = self._login("student@resolvex.edu", "Student@123")
        headers = {"Authorization": f"Bearer {token}"}

        # 1. Submit original complaint
        res1 = self.client.post("/api/complaints", headers=headers, json={
            "title": "Water leakage in 3rd floor washroom",
            "description": "Continuous water leaking from flush pipe creating puddle in Hostel Block B.",
            "category_id": 2,
            "department_id": 2,
            "priority": "HIGH"
        })
        self.assertEqual(res1.status_code, 201)
        orig_data = json.loads(res1.data)["data"]
        orig_id = orig_data["id"]
        orig_readable_id = orig_data["complaint_id"]
        self.assertFalse(orig_data["is_duplicate"])
        self.assertIsNotNone(orig_data["ai_category"])

        # 2. Submit near-identical duplicate complaint
        res2 = self.client.post("/api/complaints", headers=headers, json={
            "title": "Water leakage in 3rd floor washroom",
            "description": "Continuous water leaking from flush pipe creating puddle in Hostel Block B.",
            "category_id": 2,
            "department_id": 2,
            "priority": "HIGH"
        })
        self.assertEqual(res2.status_code, 201)
        dup_data = json.loads(res2.data)["data"]

        # Verify duplicate workflow (Sections 12, 13, 14)
        self.assertTrue(dup_data["is_duplicate"])
        self.assertEqual(dup_data["status"], ComplaintStatus.CLOSED_AS_DUPLICATE)
        self.assertEqual(dup_data["original_complaint_id"], orig_id)
        self.assertGreater(dup_data["duplicate_score"], 0.65)

        # Check DuplicateComplaint record exists
        dup_rec = DuplicateComplaint.query.filter_by(duplicate_complaint_id=dup_data["id"]).first()
        self.assertIsNotNone(dup_rec)
        self.assertEqual(dup_rec.original_complaint_id, orig_id)

    def test_ai_classification_override_by_staff_or_admin(self):
        student_token, _ = self._login("student@resolvex.edu", "Student@123")
        admin_token, _ = self._login("admin@resolvex.edu", "Admin@123")

        # 1. Student submits complaint
        res_submit = self.client.post("/api/complaints", headers={"Authorization": f"Bearer {student_token}"}, json={
            "title": "Short circuit near laboratory switchboard",
            "description": "Smell of burning wire near electrical board in Lab 1.",
            "category_id": 4, # initially filed under Lab
            "department_id": 4,
            "priority": "MEDIUM"
        })
        complaint = json.loads(res_submit.data)["data"]
        cid = complaint["complaint_id"]
        orig_ai_cat = complaint["ai_category"]

        # 2. Admin overrides to Campus Infrastructure and HIGH priority
        res_override = self.client.post(
            f"/api/complaints/{cid}/override",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "category_id": 3, # Campus Infrastructure
                "department_id": 3, # Campus Maintenance
                "priority": "HIGH",
                "reason": "Direct electrical hazard requires physical maintenance electricians."
            }
        )
        self.assertEqual(res_override.status_code, 200)
        overridden = json.loads(res_override.data)["data"]

        # Verify final decision vs original AI prediction (Section 20 & 21)
        self.assertTrue(overridden["is_overridden"])
        self.assertEqual(overridden["ai_category"], orig_ai_cat) # preserved original
        self.assertEqual(overridden["final_category"], "Campus Infrastructure")
        self.assertEqual(overridden["final_priority"], "HIGH")

        # Verify audit history entry exists
        history_actions = [h["action"] for h in overridden["history"]]
        self.assertIn("AI Recommendation Overridden", history_actions)

if __name__ == "__main__":
    unittest.main()
