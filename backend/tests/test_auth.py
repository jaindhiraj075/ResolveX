import unittest
import json
import os
import sys

# Ensure root is in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.app import create_app
from backend.app.config.config import TestingConfig
from backend.app.extensions import db
from backend.app.models.user import User

class AuthTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app(TestingConfig)
        self.client = self.app.test_client()
        with self.app.app_context():
            db.create_all()

    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.drop_all()

    def test_student_registration(self):
        payload = {
            "full_name": "Alice Johnson",
            "email": "alice@resolvex.edu",
            "password": "Password@123",
            "role": "STUDENT",
            "student_id_number": "STU-2024-1001"
        }
        res = self.client.post("/api/auth/register", json=payload)
        self.assertEqual(res.status_code, 201)
        data = res.get_json()
        self.assertTrue(data["success"])
        self.assertIn("token", data["data"])
        self.assertEqual(data["data"]["user"]["email"], "alice@resolvex.edu")

    def test_login_demo_admin(self):
        # Admin is seeded during app creation
        payload = {
            "email": "admin@resolvex.edu",
            "password": "Admin@123"
        }
        res = self.client.post("/api/auth/login", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data["success"])
        self.assertIn("token", data["data"])
        self.assertEqual(data["data"]["user"]["role"], "ADMIN")

    def test_invalid_login(self):
        payload = {
            "email": "admin@resolvex.edu",
            "password": "WrongPassword"
        }
        res = self.client.post("/api/auth/login", json=payload)
        self.assertEqual(res.status_code, 401)
        data = res.get_json()
        self.assertFalse(data["success"])

if __name__ == "__main__":
    unittest.main()
