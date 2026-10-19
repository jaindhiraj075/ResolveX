import os
import sys
import unittest
import json
import io

# Add project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.app import create_app
from backend.app.config.config import TestingConfig
from backend.app.extensions import db
from backend.app.models.complaint import Complaint, ComplaintStatus, ComplaintPriority
from backend.app.models.user import User, RoleEnum

class Phase7SecurityTestCase(unittest.TestCase):
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
        if "data" in data and "token" in data["data"]:
            return data["data"]["token"], data["data"]["user"]
        return None, None

    def test_unauthenticated_request_rejected(self):
        """Test endpoints without JWT tokens are rejected with 401 (Phase 7 Section 4)."""
        res = self.client.get("/api/complaints")
        self.assertEqual(res.status_code, 401)

        res = self.client.get("/api/admin/analytics/overview")
        self.assertEqual(res.status_code, 401)

    def test_invalid_jwt_rejected(self):
        """Test forged or malformed JWT token is rejected (Phase 7 Section 4)."""
        headers = {"Authorization": "Bearer forged.invalid.token"}
        res = self.client.get("/api/complaints", headers=headers)
        self.assertEqual(res.status_code, 401)

    def test_role_based_access_control_student_forbidden(self):
        """Test student role is forbidden from admin endpoints (Phase 7 Section 5)."""
        student_token, _ = self._login("student@resolvex.edu", "Student@123")
        self.assertIsNotNone(student_token)
        headers = {"Authorization": f"Bearer {student_token}"}

        # Student trying to access admin analytics overview
        res = self.client.get("/api/admin/analytics/overview", headers=headers)
        self.assertEqual(res.status_code, 403)

        # Student trying to access admin complaint assignment
        res = self.client.post("/api/admin/complaints/1/assign", headers=headers, json={"staff_id": 2})
        self.assertEqual(res.status_code, 403)

    def test_role_based_access_control_staff_forbidden(self):
        """Test staff role is forbidden from admin endpoints (Phase 7 Section 5)."""
        staff_token, _ = self._login("staff@resolvex.edu", "Staff@123")
        self.assertIsNotNone(staff_token)
        headers = {"Authorization": f"Bearer {staff_token}"}

        res = self.client.get("/api/admin/analytics/overview", headers=headers)
        self.assertEqual(res.status_code, 403)

    def test_object_level_authorization(self):
        """Test student cannot access another student's complaint (Phase 7 Section 5)."""
        # Create a second student
        student2 = User(
            full_name="Alice Wonder",
            email="alice@resolvex.edu",
            role=RoleEnum.STUDENT,
            is_active=True
        )
        student2.set_password("Alice@123")
        db.session.add(student2)
        db.session.commit()

        # Login as student1
        student1_token, user1 = self._login("student@resolvex.edu", "Student@123")
        # Login as student2
        student2_token, user2 = self._login("alice@resolvex.edu", "Alice@123")

        # Student 1 creates a complaint
        res = self.client.post("/api/complaints", headers={"Authorization": f"Bearer {student1_token}"}, json={
            "title": "Student 1 Private Ticket",
            "description": "This is a private issue with hostel room 101 ventilation.",
            "category_id": 2,
            "department_id": 2,
            "priority": "LOW"
        })
        self.assertEqual(res.status_code, 201)
        data = json.loads(res.data)["data"]
        cid = data["complaint_id"]

        # Student 2 tries to view Student 1's complaint directly
        res2 = self.client.get(f"/api/complaints/{cid}", headers={"Authorization": f"Bearer {student2_token}"})
        self.assertEqual(res2.status_code, 403)
        self.assertIn("Access denied", json.loads(res2.data)["message"])

        # Student 2 tries to reopen Student 1's complaint
        res3 = self.client.post(f"/api/complaints/{cid}/reopen", headers={"Authorization": f"Bearer {student2_token}"}, json={
            "reason": "I am trying to reopen someone else's complaint."
        })
        self.assertEqual(res3.status_code, 403)

    def test_input_validation_boundaries(self):
        """Test API input length and field constraints (Phase 7 Section 6)."""
        student_token, _ = self._login("student@resolvex.edu", "Student@123")
        headers = {"Authorization": f"Bearer {student_token}"}

        # 1. Title too short (< 3 chars)
        res = self.client.post("/api/complaints", headers=headers, json={
            "title": "AB",
            "description": "A valid description of sufficient length.",
            "category_id": 1,
            "department_id": 1,
            "priority": "LOW"
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn("title must be between 3 and 200", json.loads(res.data)["message"].lower())

        # 2. Description too short (< 10 chars)
        res = self.client.post("/api/complaints", headers=headers, json={
            "title": "Valid Title Here",
            "description": "Short",
            "category_id": 1,
            "department_id": 1,
            "priority": "LOW"
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn("description must be between 10 and 5000", json.loads(res.data)["message"].lower())

        # 3. Invalid priority value
        res = self.client.post("/api/complaints", headers=headers, json={
            "title": "Valid Title Here",
            "description": "A valid description of sufficient length.",
            "category_id": 1,
            "department_id": 1,
            "priority": "URGENT_NOW"
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn("invalid priority", json.loads(res.data)["message"].lower())

    def test_file_upload_security(self):
        """Test file extension restrictions and safe upload handling (Phase 7 Section 8)."""
        student_token, _ = self._login("student@resolvex.edu", "Student@123")
        headers = {"Authorization": f"Bearer {student_token}"}

        # 1. Disallow executable file (.exe)
        malicious_file = (io.BytesIO(b"binary payload"), "malware.exe")
        res = self.client.post(
            "/api/complaints/upload",
            headers=headers,
            data={"file": malicious_file},
            content_type="multipart/form-data"
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("not permitted", json.loads(res.data)["message"].lower())

        # 2. Disallow script file (.sh)
        script_file = (io.BytesIO(b"echo 'pwned'"), "exploit.sh")
        res = self.client.post(
            "/api/complaints/upload",
            headers=headers,
            data={"file": script_file},
            content_type="multipart/form-data"
        )
        self.assertEqual(res.status_code, 400)

        # 3. Disallow PHP script (.php)
        php_file = (io.BytesIO(b"<?php phpinfo(); ?>"), "webshell.php")
        res = self.client.post(
            "/api/complaints/upload",
            headers=headers,
            data={"file": php_file},
            content_type="multipart/form-data"
        )
        self.assertEqual(res.status_code, 400)

        # 4. Allow valid PDF file
        pdf_file = (io.BytesIO(b"%PDF-1.4 sample file content"), "report.pdf")
        res = self.client.post(
            "/api/complaints/upload",
            headers=headers,
            data={"file": pdf_file},
            content_type="multipart/form-data"
        )
        self.assertEqual(res.status_code, 201)
        data = json.loads(res.data)["data"]
        self.assertEqual(data["file_name"], "report.pdf")
        self.assertTrue(data["stored_name"].endswith("report.pdf"))

    def test_sql_injection_defense(self):
        """Test SQL injection defense on search and filters (Phase 7 Section 7)."""
        admin_token, _ = self._login("admin@resolvex.edu", "Admin@123")
        headers = {"Authorization": f"Bearer {admin_token}"}

        # Malicious search input containing SQL syntax
        sql_injections = [
            "' OR 1=1 --",
            "'; DROP TABLE complaints; --",
            "1' UNION SELECT 1,2,3 --",
            "\" OR \"\"=\""
        ]

        for payload in sql_injections:
            res = self.client.get(f"/api/complaints?search={payload}", headers=headers)
            # Must return 200 with normal search (no 500 error or SQL crash)
            self.assertEqual(res.status_code, 200)

    def test_health_check_endpoint(self):
        """Test /api/health returns system status without exposing credentials (Phase 7 Section 10)."""
        res = self.client.get("/api/health")
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertTrue(data["success"])
        self.assertEqual(data["status"], "healthy")
        self.assertNotIn("password", str(data).lower())
        self.assertNotIn("secret", str(data).lower())

if __name__ == "__main__":
    unittest.main()
