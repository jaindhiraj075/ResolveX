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

class Phase2AuthTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app(TestingConfig)
        self.client = self.app.test_client()
        self.ctx = self.app.app_context()
        self.ctx.push()

    def tearDown(self):
        db.session.remove()
        self.ctx.pop()

    def test_complete_student_flow(self):
        # 1. Register student
        reg_payload = {
            "full_name": "Arjun Kumar",
            "email": "arjun.student@resolvex.edu",
            "password": "Password@123",
            "student_id_number": "STU-2024-9912",
            "phone": "+91 9876543210"
        }
        res = self.client.post("/api/auth/register", json=reg_payload)
        self.assertEqual(res.status_code, 201)
        data = json.loads(res.data)
        token = data["data"]["token"]
        user = data["data"]["user"]
        self.assertEqual(user["role"], "STUDENT")

        # 2. Login
        login_res = self.client.post("/api/auth/login", json={
            "email": "arjun.student@resolvex.edu",
            "password": "Password@123"
        })
        self.assertEqual(login_res.status_code, 200)

        # 3. Verify /api/auth/me
        headers = {"Authorization": f"Bearer {token}"}
        me_res = self.client.get("/api/auth/me", headers=headers)
        self.assertEqual(me_res.status_code, 200)

        # 4. Attempt admin route -> MUST BE 403 Forbidden
        admin_res = self.client.get("/api/admin/overview", headers=headers)
        self.assertEqual(admin_res.status_code, 403)
        admin_data = json.loads(admin_res.data)
        self.assertFalse(admin_data["success"])

        # 5. Profile Update
        profile_res = self.client.put("/api/auth/profile", headers=headers, json={
            "full_name": "Arjun K. Sharma",
            "phone": "+91 9999888877"
        })
        self.assertEqual(profile_res.status_code, 200)
        updated_data = json.loads(profile_res.data)
        self.assertEqual(updated_data["data"]["user"]["full_name"], "Arjun K. Sharma")

    def test_staff_flow(self):
        # Login with demo staff
        res = self.client.post("/api/auth/login", json={
            "email": "staff@resolvex.edu",
            "password": "Staff@123"
        })
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        token = data["data"]["token"]
        user = data["data"]["user"]
        self.assertEqual(user["role"], "STAFF")

        # Staff can access staff dashboard summary
        headers = {"Authorization": f"Bearer {token}"}
        staff_res = self.client.get("/api/staff/dashboard-summary", headers=headers)
        self.assertEqual(staff_res.status_code, 200)

        # Staff CANNOT access admin overview
        admin_res = self.client.get("/api/admin/overview", headers=headers)
        self.assertEqual(admin_res.status_code, 403)

    def test_admin_flow(self):
        # Login with demo admin
        res = self.client.post("/api/auth/login", json={
            "email": "admin@resolvex.edu",
            "password": "Admin@123"
        })
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        token = data["data"]["token"]
        user = data["data"]["user"]
        self.assertEqual(user["role"], "ADMIN")

        # Admin CAN access overview, users list, staff list
        headers = {"Authorization": f"Bearer {token}"}
        res_overview = self.client.get("/api/admin/overview", headers=headers)
        self.assertEqual(res_overview.status_code, 200)

        res_users = self.client.get("/api/admin/users", headers=headers)
        self.assertEqual(res_users.status_code, 200)

        res_staff = self.client.get("/api/admin/staff", headers=headers)
        self.assertEqual(res_staff.status_code, 200)

    def test_invalid_authentications(self):
        # 1. Wrong password
        res = self.client.post("/api/auth/login", json={
            "email": "admin@resolvex.edu",
            "password": "WrongPassword!99"
        })
        self.assertEqual(res.status_code, 401)

        # 2. Unknown email
        res = self.client.post("/api/auth/login", json={
            "email": "nobody@nowhere.edu",
            "password": "Password@123"
        })
        self.assertEqual(res.status_code, 401)

        # 3. Missing token on protected endpoint
        res = self.client.get("/api/auth/me")
        self.assertEqual(res.status_code, 401)

        # 4. Invalid token
        res = self.client.get("/api/auth/me", headers={"Authorization": "Bearer bad-token-xyz"})
        self.assertIn(res.status_code, [401, 422])

        # 5. Duplicate registration
        res = self.client.post("/api/auth/register", json={
            "full_name": "Duplicate Student",
            "email": "student@resolvex.edu",
            "password": "Password@123"
        })
        self.assertEqual(res.status_code, 409)

        # 6. Invalid registration data (short password)
        res = self.client.post("/api/auth/register", json={
            "full_name": "Short Pass",
            "email": "shortpass@resolvex.edu",
            "password": "123"
        })
        self.assertEqual(res.status_code, 400)

if __name__ == "__main__":
    unittest.main()
