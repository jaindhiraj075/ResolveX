from flask_jwt_extended import create_access_token
from backend.app.extensions import db
from backend.app.models.user import User, RoleEnum

class AuthService:
    @staticmethod
    def register_user(data: dict):
        full_name = (data.get("full_name") or "").strip()
        email = (data.get("email") or "").strip().lower()
        password = data.get("password") or ""
        department_id = data.get("department_id")
        phone = data.get("phone")
        student_id_number = data.get("student_id_number")

        # Public registration strictly defaults to STUDENT
        # Admin or Staff accounts must be provisioned via admin directory or database seeds
        role = RoleEnum.STUDENT

        # Input validations
        if not full_name:
            return None, "Full name is required", 400
        if not email or "@" not in email:
            return None, "A valid email address is required", 400
        if not password or len(password) < 6:
            return None, "Password must be at least 6 characters long", 400

        # Prevent duplicate email
        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            return None, "An account with this email already exists", 409

        # Instantiate user
        new_user = User(
            full_name=full_name,
            email=email,
            role=role,
            department_id=department_id,
            phone=phone,
            student_id_number=student_id_number,
            is_active=True,
        )
        new_user.set_password(password)

        try:
            db.session.add(new_user)
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            return None, f"Database error during registration: {str(e)}", 500

        # Generate JWT access token with string identity and additional claims
        token = create_access_token(
            identity=str(new_user.id),
            additional_claims={"email": new_user.email, "role": new_user.role}
        )

        return {
            "token": token,
            "user": new_user.to_dict()
        }, None, 201

    @staticmethod
    def login_user(email: str, password: str):
        normalized_email = (email or "").strip().lower()
        if not normalized_email or not password:
            return None, "Email and password are required", 400

        user = User.query.filter_by(email=normalized_email).first()
        if not user or not user.check_password(password):
            return None, "Invalid email or password", 401

        if not user.is_active:
            return None, "Account has been deactivated. Please contact support.", 403

        token = create_access_token(
            identity=str(user.id),
            additional_claims={"email": user.email, "role": user.role}
        )

        return {
            "token": token,
            "user": user.to_dict()
        }, None, 200

    @staticmethod
    def get_user_profile(user_id: int):
        user = db.session.get(User, user_id)
        if not user:
            return None, "User not found", 404
        return user.to_dict(), None, 200

    @staticmethod
    def update_user_profile(user_id: int, data: dict):
        user = db.session.get(User, user_id)
        if not user:
            return None, "User not found", 404

        if "full_name" in data and data["full_name"]:
            user.full_name = data["full_name"].strip()
        if "phone" in data:
            user.phone = data["phone"].strip() if data["phone"] else None

        try:
            db.session.commit()
            return user.to_dict(), None, 200
        except Exception as e:
            db.session.rollback()
            return None, f"Failed to update profile: {str(e)}", 500
