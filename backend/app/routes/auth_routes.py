from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from backend.app.services.auth_service import AuthService
from backend.app.utils.response import success_response, error_response
from backend.app.models.user import User
from backend.app.extensions import db

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    result, error, status_code = AuthService.register_user(data)
    if error:
        return error_response(message=error, status_code=status_code)
    return success_response(message="Registration successful", data=result, status_code=status_code)

@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    email = data.get("email")
    password = data.get("password")
    result, error, status_code = AuthService.login_user(email, password)
    if error:
        return error_response(message=error, status_code=status_code)
    return success_response(message="Login successful", data=result, status_code=status_code)

@auth_bp.route("/logout", methods=["POST"])
@jwt_required(optional=True)
def logout():
    # Client removes JWT token from storage. In JWT, server logout confirms status.
    return success_response(message="Logged out successfully", data={})

@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def get_me():
    identity = get_jwt_identity()
    user_id = int(identity) if identity else None
    user = db.session.get(User, user_id) if user_id else None
    if not user:
        return error_response(message="User not found", status_code=404)
    if not user.is_active:
        return error_response(message="User account is deactivated", status_code=403)
    return success_response(message="Current user profile retrieved", data={"user": user.to_dict()})

@auth_bp.route("/profile", methods=["PUT"])
@jwt_required()
def update_profile():
    identity = get_jwt_identity()
    user_id = int(identity) if identity else None
    data = request.get_json() or {}
    result, error, status_code = AuthService.update_user_profile(user_id, data)
    if error:
        return error_response(message=error, status_code=status_code)
    return success_response(message="Profile updated successfully", data={"user": result})
