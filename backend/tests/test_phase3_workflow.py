import os
import sys
import unittest
import json

# Add project root to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.app import create_app
from backend.app.config.config import TestingConfig
from backend.app.extensions import db
from backend.app.models.user import User, RoleEnum
from backend.app.models.complaint import Complaint, ComplaintStatus

class Phase3WorkflowTestCase(unittest.TestCase):
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

    def test_complete_phase3_workflow(self):
        # 1. Login as Student
        student_token, student_user = self._login("student@resolvex.edu", "Student@123")
        student_headers = {"Authorization": f"Bearer {student_token}"}

        # 2. Student Submits Complaint
        submit_payload = {
            "title": "Lab 3 Projector not turning on",
            "description": "The ceiling projector in Lab 3 HDMI port is broken and won't display any signal.",
            "category_id": 4, # Lab & Equipment
            "department_id": 4, # CSE Lab
            "priority": "HIGH",
            "attachment": {
                "file_name": "projector_error.jpg",
                "file_size": 245000,
                "file_type": "image/jpeg"
            }
        }
        res_submit = self.client.post("/api/complaints", headers=student_headers, json=submit_payload)
        self.assertEqual(res_submit.status_code, 201)
        submit_data = json.loads(res_submit.data)["data"]
        complaint_id = submit_data["complaint_id"]
        self.assertTrue(complaint_id.startswith("RX-2026-"))
        self.assertEqual(submit_data["status"], "PENDING")

        # 3. Student views My Complaints
        res_list = self.client.get("/api/complaints", headers=student_headers)
        self.assertEqual(res_list.status_code, 200)
        list_data = json.loads(res_list.data)["data"]["complaints"]
        self.assertTrue(any(c["complaint_id"] == complaint_id for c in list_data))

        # 4. Student views Complaint Details
        res_detail = self.client.get(f"/api/complaints/{complaint_id}", headers=student_headers)
        self.assertEqual(res_detail.status_code, 200)
        detail_data = json.loads(res_detail.data)["data"]["complaint"]
        self.assertEqual(detail_data["title"], "Lab 3 Projector not turning on")
        self.assertGreaterEqual(len(detail_data["history"]), 1)
        self.assertEqual(detail_data["history"][0]["action"], "Complaint Submitted")

        # 5. Admin Logs In and Views All Complaints
        admin_token, admin_user = self._login("admin@resolvex.edu", "Admin@123")
        admin_headers = {"Authorization": f"Bearer {admin_token}"}

        res_admin_list = self.client.get("/api/complaints", headers=admin_headers)
        self.assertEqual(res_admin_list.status_code, 200)

        # 6. Admin assigns complaint to Staff
        _, staff_user = self._login("staff@resolvex.edu", "Staff@123")
        res_assign = self.client.post(
            f"/api/admin/complaints/{complaint_id}/assign",
            headers=admin_headers,
            json={"staff_id": staff_user["id"], "notes": "Please prioritize this projector fix."}
        )
        self.assertEqual(res_assign.status_code, 200)
        assign_data = json.loads(res_assign.data)["data"]
        self.assertEqual(assign_data["status"], "ASSIGNED")

        # 7. Staff Logs In and sees assigned complaint
        staff_token, _ = self._login("staff@resolvex.edu", "Staff@123")
        staff_headers = {"Authorization": f"Bearer {staff_token}"}

        res_staff_list = self.client.get("/api/staff/complaints", headers=staff_headers)
        self.assertEqual(res_staff_list.status_code, 200)
        staff_complaints = json.loads(res_staff_list.data)["data"]["complaints"]
        self.assertTrue(any(c["complaint_id"] == complaint_id for c in staff_complaints))

        # 8. Staff Starts Work (Mark IN_PROGRESS)
        res_start = self.client.put(
            f"/api/staff/complaints/{complaint_id}/status",
            headers=staff_headers,
            json={"status": "IN_PROGRESS", "notes": "Arrived at Lab 3 to inspect HDMI cabling."}
        )
        self.assertEqual(res_start.status_code, 200)
        self.assertEqual(json.loads(res_start.data)["data"]["status"], "IN_PROGRESS")

        # 9. Staff Requests Information
        res_req = self.client.post(
            f"/api/staff/complaints/{complaint_id}/request-info",
            headers=staff_headers,
            json={"message": "Is this happening on the wall HDMI port or the desk switcher?"}
        )
        self.assertEqual(res_req.status_code, 200)
        req_data = json.loads(res_req.data)["data"]
        self.assertEqual(req_data["status"], "INFORMATION_REQUIRED")

        # 10. Student Responds with Details
        res_resp = self.client.post(
            f"/api/complaints/{complaint_id}/respond-info",
            headers=student_headers,
            json={"message": "It is happening on the desk switcher in front of the podium."}
        )
        self.assertEqual(res_resp.status_code, 200)
        resp_data = json.loads(res_resp.data)["data"]
        self.assertEqual(resp_data["status"], "IN_PROGRESS")

        # 11. Staff Resolves Complaint
        res_resolve = self.client.post(
            f"/api/staff/complaints/{complaint_id}/resolve",
            headers=staff_headers,
            json={
                "resolution_summary": "Replaced faulty HDMI switcher box and verified with instructor laptop.",
                "resolution_details": "Signal tested at 1080p 60Hz. Both wall and podium inputs operational."
            }
        )
        self.assertEqual(res_resolve.status_code, 200)
        resolve_data = json.loads(res_resolve.data)["data"]
        self.assertEqual(resolve_data["status"], "RESOLVED")
        self.assertIsNotNone(resolve_data["resolved_at"])

        # 12. Student verifies RESOLVED in timeline
        res_final = self.client.get(f"/api/complaints/{complaint_id}", headers=student_headers)
        self.assertEqual(res_final.status_code, 200)
        final_data = json.loads(res_final.data)["data"]["complaint"]
        self.assertEqual(final_data["status"], "RESOLVED")
        history_actions = [h["action"] for h in final_data["history"]]
        self.assertIn("Complaint Submitted", history_actions)
        self.assertIn("Staff Assigned", history_actions)
        self.assertIn("Information Requested", history_actions)
        self.assertIn("Student Responded", history_actions)
        self.assertIn("Complaint Resolved", history_actions)

        # 13. Security checks: unauthorized student cannot access this complaint
        # Register a second student
        reg_second = self.client.post("/api/auth/register", json={
            "full_name": "Bob Second",
            "email": "bob.second@resolvex.edu",
            "password": "Password@123"
        })
        second_token = json.loads(reg_second.data)["data"]["token"]
        second_headers = {"Authorization": f"Bearer {second_token}"}

        res_forbidden = self.client.get(f"/api/complaints/{complaint_id}", headers=second_headers)
        self.assertEqual(res_forbidden.status_code, 403)

        # Unauthorized student cannot respond to information
        res_hack = self.client.post(f"/api/complaints/{complaint_id}/respond-info", headers=second_headers, json={"message": "hacked"})
        self.assertEqual(res_hack.status_code, 403)

        # Non-existent complaint returns 404
        res_404 = self.client.get("/api/complaints/RX-9999-999999", headers=student_headers)
        self.assertEqual(res_404.status_code, 404)

if __name__ == "__main__":
    unittest.main()
