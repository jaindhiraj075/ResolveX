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
from backend.app.models.assignment import ComplaintAssignment
from backend.app.services.analytics_service import AnalyticsService

class Phase6AnalyticsTestCase(unittest.TestCase):
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

    def test_overview_metrics_calculation(self):
        """Test overview metrics calculation against real database data (Section 1 & 21)."""
        admin_token, _ = self._login("admin@resolvex.edu", "Admin@123")
        headers = {"Authorization": f"Bearer {admin_token}"}

        res = self.client.get("/api/admin/analytics/overview", headers=headers)
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)["data"]

        # Basic KPI assertions
        self.assertIn("total_complaints", data)
        self.assertIn("pending", data)
        self.assertIn("in_progress", data)
        self.assertIn("resolved", data)
        self.assertIn("overdue", data)
        self.assertIn("sla_compliance", data)
        self.assertIn("average_resolution_hours", data)
        self.assertIn("average_rating", data)
        self.assertIn("insights", data)
        self.assertIn("previous_period", data)
        self.assertIsInstance(data["insights"], list)

    def test_trends_endpoint_and_grouping(self):
        """Test complaints trend grouping over time (Section 3)."""
        admin_token, _ = self._login("admin@resolvex.edu", "Admin@123")
        headers = {"Authorization": f"Bearer {admin_token}"}

        res = self.client.get("/api/admin/analytics/trends?group_by=day", headers=headers)
        self.assertEqual(res.status_code, 200)
        trends = json.loads(res.data)["data"]["trends"]
        self.assertIsInstance(trends, list)
        if trends:
            self.assertIn("date", trends[0])
            self.assertIn("complaints", trends[0])
            self.assertIn("resolved", trends[0])

    def test_category_and_department_analytics(self):
        """Test category and department analytics aggregation (Section 5 & 6)."""
        admin_token, _ = self._login("admin@resolvex.edu", "Admin@123")
        headers = {"Authorization": f"Bearer {admin_token}"}

        # Categories
        res_cat = self.client.get("/api/admin/analytics/categories", headers=headers)
        self.assertEqual(res_cat.status_code, 200)
        cats = json.loads(res_cat.data)["data"]["categories"]
        self.assertIsInstance(cats, list)

        # Departments
        res_dept = self.client.get("/api/admin/analytics/departments", headers=headers)
        self.assertEqual(res_dept.status_code, 200)
        depts = json.loads(res_dept.data)["data"]["departments"]
        self.assertIsInstance(depts, list)
        self.assertGreater(len(depts), 0)
        self.assertIn("department", depts[0])
        self.assertIn("sla_compliance", depts[0])

    def test_sla_and_resolution_performance(self):
        """Test SLA performance analytics and resolution durations (Section 8, 9, 10)."""
        admin_token, _ = self._login("admin@resolvex.edu", "Admin@123")
        headers = {"Authorization": f"Bearer {admin_token}"}

        # SLA
        res_sla = self.client.get("/api/admin/analytics/sla", headers=headers)
        self.assertEqual(res_sla.status_code, 200)
        sla_data = json.loads(res_sla.data)["data"]
        self.assertIn("sla_met", sla_data)
        self.assertIn("sla_breached", sla_data)
        self.assertIn("compliance_pct", sla_data)

        # Resolution
        res_res = self.client.get("/api/admin/analytics/resolution", headers=headers)
        self.assertEqual(res_res.status_code, 200)
        res_data = json.loads(res_res.data)["data"]
        self.assertIn("avg_hours", res_data)
        self.assertIn("median_hours", res_data)

    def test_staff_workload_and_performance_detail(self):
        """Test staff workload breakdown and officer detail performance (Section 12 & 13)."""
        admin_token, _ = self._login("admin@resolvex.edu", "Admin@123")
        headers = {"Authorization": f"Bearer {admin_token}"}

        res_staff = self.client.get("/api/admin/analytics/staff", headers=headers)
        self.assertEqual(res_staff.status_code, 200)
        staff_list = json.loads(res_staff.data)["data"]["staff"]
        self.assertIsInstance(staff_list, list)
        self.assertGreater(len(staff_list), 0)

        # Pick first staff member and test performance detail
        staff_id = staff_list[0]["id"]
        res_detail = self.client.get(f"/api/admin/staff/{staff_id}/performance", headers=headers)
        self.assertEqual(res_detail.status_code, 200)
        detail_data = json.loads(res_detail.data)["data"]
        self.assertEqual(detail_data["staff"]["id"], staff_id)
        self.assertIn("metrics", detail_data)

    def test_feedback_and_ai_analytics(self):
        """Test feedback satisfaction and responsible AI metrics (Section 14 & 17)."""
        admin_token, _ = self._login("admin@resolvex.edu", "Admin@123")
        headers = {"Authorization": f"Bearer {admin_token}"}

        # Feedback
        res_fb = self.client.get("/api/admin/analytics/feedback", headers=headers)
        self.assertEqual(res_fb.status_code, 200)
        fb_data = json.loads(res_fb.data)["data"]
        self.assertIn("average_rating", fb_data)
        self.assertIn("rating_distribution", fb_data)

        # AI
        res_ai = self.client.get("/api/admin/analytics/ai", headers=headers)
        self.assertEqual(res_ai.status_code, 200)
        ai_data = json.loads(res_ai.data)["data"]
        self.assertIn("ai_analyzed_count", ai_data)
        self.assertIn("override_rate", ai_data)
        self.assertIn("duplicate_count", ai_data)

    def test_csv_export(self):
        """Test tabular CSV export generation (Section 24)."""
        admin_token, _ = self._login("admin@resolvex.edu", "Admin@123")
        headers = {"Authorization": f"Bearer {admin_token}"}

        res = self.client.get("/api/admin/analytics/export", headers=headers)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.content_type, "text/csv; charset=utf-8")
        csv_text = res.data.decode("utf-8")
        self.assertIn("Complaint ID,Title", csv_text)

    def test_security_rbac_restrictions(self):
        """Test that Students and Staff cannot access admin analytics APIs (Section 35)."""
        student_token, _ = self._login("student@resolvex.edu", "Student@123")
        staff_token, _ = self._login("staff@resolvex.edu", "Staff@123")

        # Student access rejected (403)
        res_stu = self.client.get("/api/admin/analytics/overview", headers={"Authorization": f"Bearer {student_token}"})
        self.assertEqual(res_stu.status_code, 403)

        # Staff access rejected (403)
        res_stf = self.client.get("/api/admin/analytics/overview", headers={"Authorization": f"Bearer {staff_token}"})
        self.assertEqual(res_stf.status_code, 403)

        # Unauthenticated access rejected (401)
        res_unauth = self.client.get("/api/admin/analytics/overview")
        self.assertEqual(res_unauth.status_code, 401)

if __name__ == "__main__":
    unittest.main()
