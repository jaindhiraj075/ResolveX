import os
import sys
import unittest
import json
from datetime import datetime, timedelta

# Add project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.app import create_app
from backend.app.config.config import TestingConfig
from backend.app.extensions import db
from backend.app.models.complaint import Complaint, ComplaintStatus, ComplaintPriority
from backend.app.models.feedback import Feedback
from backend.app.models.notification import Notification, NotificationType
from backend.app.services.sla_service import SLAService
from backend.app.services.complaint_service import ComplaintService

class Phase5SLATestCase(unittest.TestCase):
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

    def test_sla_calculation_rules(self):
        """Test SLA calculations: HIGH=24h, MEDIUM=48h, LOW=72h (Section 1 & 2)."""
        now = datetime(2026, 10, 1, 10, 0, 0)
        due_high = SLAService.calculate_due_date("HIGH", now)
        due_med = SLAService.calculate_due_date("MEDIUM", now)
        due_low = SLAService.calculate_due_date("LOW", now)

        self.assertEqual(due_high, now + timedelta(hours=24))
        self.assertEqual(due_med, now + timedelta(hours=48))
        self.assertEqual(due_low, now + timedelta(hours=72))

    def test_sla_status_and_escalation_detection(self):
        """Test SLA status thresholds: ON_TRACK, DUE_SOON, OVERDUE, Escalation Levels (Section 3, 7, 8)."""
        token, user = self._login("student@resolvex.edu", "Student@123")
        headers = {"Authorization": f"Bearer {token}"}

        # 1. Create a HIGH priority complaint (24h)
        res = self.client.post("/api/complaints", headers=headers, json={
            "title": "Laboratory Main Server Outage",
            "description": "The main rack server in Lab 3 is completely unresponsive during test.",
            "category_id": 4,
            "department_id": 4,
            "priority": "HIGH"
        })
        self.assertEqual(res.status_code, 201)
        cid = json.loads(res.data)["data"]["complaint_id"]
        c = Complaint.query.filter_by(complaint_id=cid).first()

        # Check initial ON_TRACK
        info = SLAService.get_sla_info(c)
        self.assertEqual(info["sla_status"], "ON_TRACK")
        self.assertEqual(info["escalation_level"], 0)

        # 2. Simulate DUE_SOON: 2 hours remaining on 24h SLA (≤ 25%)
        c.sla_due_at = datetime.utcnow() + timedelta(hours=2)
        info_due_soon = SLAService.get_sla_info(c)
        self.assertEqual(info_due_soon["sla_status"], "DUE_SOON")

        # 3. Simulate OVERDUE (Level 1: 5 hours past deadline)
        c.sla_due_at = datetime.utcnow() - timedelta(hours=5)
        info_overdue = SLAService.get_sla_info(c)
        self.assertEqual(info_overdue["sla_status"], "OVERDUE")
        self.assertEqual(info_overdue["escalation_level"], 1)

        # 4. Simulate EXTENDED OVERDUE (Level 2: 30 hours past deadline on 24h SLA)
        c.sla_due_at = datetime.utcnow() - timedelta(hours=30)
        info_crit = SLAService.get_sla_info(c)
        self.assertEqual(info_crit["sla_status"], "OVERDUE")
        self.assertEqual(info_crit["escalation_level"], 2)

    def test_idempotent_sla_evaluation(self):
        """Test that running SLA evaluation multiple times does not generate duplicate alerts (Section 34)."""
        student_token, _ = self._login("student@resolvex.edu", "Student@123")
        admin_token, _ = self._login("admin@resolvex.edu", "Admin@123")

        # Create complaint
        res = self.client.post("/api/complaints", headers={"Authorization": f"Bearer {student_token}"}, json={
            "title": "Corridor light sparking",
            "description": "Exposed wire sparking in Hostel Block A corridor.",
            "category_id": 3,
            "department_id": 3,
            "priority": "HIGH"
        })
        cid = json.loads(res.data)["data"]["complaint_id"]
        c = Complaint.query.filter_by(complaint_id=cid).first()

        # Artificially set to overdue
        c.sla_due_at = datetime.utcnow() - timedelta(hours=3)
        db.session.commit()

        initial_notifs_count = Notification.query.count()

        # Run evaluation 1st time
        eval1 = SLAService.evaluate_and_escalate()
        self.assertGreaterEqual(eval1["overdue"], 1)

        count_after_first = Notification.query.count()
        self.assertGreater(count_after_first, initial_notifs_count)

        # Run evaluation 2nd time immediately - must be idempotent!
        eval2 = SLAService.evaluate_and_escalate()
        count_after_second = Notification.query.count()
        self.assertEqual(count_after_first, count_after_second)

    def test_student_feedback_workflow(self):
        """Test student submitting rating & feedback on resolved complaint (Sections 17-22)."""
        student_token, _ = self._login("student@resolvex.edu", "Student@123")
        staff_token, _ = self._login("staff@resolvex.edu", "Staff@123")

        # 1. Submit complaint
        res = self.client.post("/api/complaints", headers={"Authorization": f"Bearer {student_token}"}, json={
            "title": "Hostel room door knob loose",
            "description": "Room 204 door knob falls off when closing.",
            "category_id": 2,
            "department_id": 2,
            "priority": "LOW"
        })
        cid = json.loads(res.data)["data"]["complaint_id"]

        # 2. Try feedback before resolution -> Must fail
        fb_fail = self.client.post(f"/api/complaints/{cid}/feedback", headers={"Authorization": f"Bearer {student_token}"}, json={
            "rating": 5, "comments": "Premature review"
        })
        self.assertEqual(fb_fail.status_code, 400)

        # 3. Staff resolves complaint
        res_resolve = self.client.post(f"/api/staff/complaints/{cid}/resolve", headers={"Authorization": f"Bearer {staff_token}"}, json={
            "resolution_summary": "Replaced door knob and latch mechanism."
        })
        self.assertEqual(res_resolve.status_code, 200)

        # 4. Student submits valid 5-star feedback
        res_fb = self.client.post(f"/api/complaints/{cid}/feedback", headers={"Authorization": f"Bearer {student_token}"}, json={
            "rating": 5, "comments": "Quick and clean repair. Thank you!"
        })
        self.assertEqual(res_fb.status_code, 201)
        fb_data = json.loads(res_fb.data)["data"]
        self.assertEqual(fb_data["rating"], 5)
        self.assertEqual(fb_data["comments"], "Quick and clean repair. Thank you!")

        # 5. Duplicate feedback on same complaint -> Must fail
        fb_dup = self.client.post(f"/api/complaints/{cid}/feedback", headers={"Authorization": f"Bearer {student_token}"}, json={
            "rating": 4, "comments": "Second attempt"
        })
        self.assertEqual(fb_dup.status_code, 400)

    def test_reopen_complaint_and_new_sla_cycle(self):
        """Test student reopening a resolved complaint and starting a new SLA window (Sections 23-26)."""
        student_token, _ = self._login("student@resolvex.edu", "Student@123")
        staff_token, _ = self._login("staff@resolvex.edu", "Staff@123")

        # 1. Create and resolve complaint
        res = self.client.post("/api/complaints", headers={"Authorization": f"Bearer {student_token}"}, json={
            "title": "Wi-Fi in library 3rd floor drops",
            "description": "Eduroam disconnections every 5 minutes in library quiet study zone.",
            "category_id": 1,
            "department_id": 1,
            "priority": "HIGH"
        })
        cid = json.loads(res.data)["data"]["complaint_id"]

        self.client.post(f"/api/staff/complaints/{cid}/resolve", headers={"Authorization": f"Bearer {staff_token}"}, json={
            "resolution_summary": "Restarted wireless AP."
        })

        # 2. Reopen complaint with valid reason
        res_reopen = self.client.post(f"/api/complaints/{cid}/reopen", headers={"Authorization": f"Bearer {student_token}"}, json={
            "reason": "Issue returned after 2 hours. Signal still unstable."
        })
        self.assertEqual(res_reopen.status_code, 200)
        data = json.loads(res_reopen.data)["data"]

        # Verify state
        self.assertEqual(data["status"], ComplaintStatus.REOPENED)
        self.assertEqual(data["reopened_count"], 1)
        self.assertIn("Issue returned", data["reopen_reason"])

        # Verify new SLA cycle is ON_TRACK with fresh 24h target
        sla = data["sla_info"]
        self.assertEqual(sla["sla_status"], "ON_TRACK")
        self.assertGreater(sla["remaining_seconds"], 20 * 3600) # nearly full 24h remaining

        # 3. Staff can resume work on reopened ticket
        res_work = self.client.put(f"/api/staff/complaints/{cid}/status", headers={"Authorization": f"Bearer {staff_token}"}, json={
            "status": "IN_PROGRESS", "notes": "Dispatched technician for physical AP cable inspection."
        })
        self.assertEqual(res_work.status_code, 200)
        self.assertEqual(json.loads(res_work.data)["data"]["status"], "IN_PROGRESS")

    def test_notification_center_and_read_all(self):
        """Test notification center, mark read, and mark all read (Sections 13 & 14)."""
        student_token, _ = self._login("student@resolvex.edu", "Student@123")
        headers = {"Authorization": f"Bearer {student_token}"}

        # Submit a complaint to generate notification
        self.client.post("/api/complaints", headers=headers, json={
            "title": "Water cooler leaking in Academic Block",
            "description": "Floor is slippery outside room 104.",
            "category_id": 3,
            "department_id": 3,
            "priority": "MEDIUM"
        })

        # Fetch notifications
        res_get = self.client.get("/api/notifications", headers=headers)
        self.assertEqual(res_get.status_code, 200)
        data = json.loads(res_get.data)["data"]
        notifs = data["notifications"]
        self.assertGreater(len(notifs), 0)

        # Mark all read
        res_mark_all = self.client.put("/api/notifications/read-all", headers=headers)
        self.assertEqual(res_mark_all.status_code, 200)

        # Verify unread count is now 0
        res_verify = self.client.get("/api/notifications", headers=headers)
        self.assertEqual(json.loads(res_verify.data)["data"]["unread_count"], 0)

if __name__ == "__main__":
    unittest.main()
