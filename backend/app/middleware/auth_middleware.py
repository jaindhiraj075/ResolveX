from functools import wraps
from flask import request
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
from backend.app.models.user import User
from backend.app.extensions import db
from backend.app.utils.response import error_response

def role_required(*allowed_roles):
    """
    Decorator to restrict endpoint access by User Role (STUDENT, STAFF, ADMIN).
    Requires a valid JWT token.
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            try:
                verify_jwt_in_request()
            except Exception as e:
                return error_response(message="Invalid or missing authentication token", error=str(e), status_code=401)

            identity = get_jwt_identity()
            try:
                user_id = int(identity)
            except (ValueError, TypeError):
                user_id = None

            user = db.session.get(User, user_id) if user_id else None
            if not user:
                return error_response(message="Authenticated user not found", status_code=401)

            if not user.is_active:
                return error_response(message="User account is deactivated", status_code=403)

            if allowed_roles and user.role not in allowed_roles:
                return error_response(
                    message=f"Access forbidden: requires one of [{', '.join(allowed_roles)}] permissions",
                    status_code=403
                )

            # Store current user in request context for convenience
            request.current_user = user
            return fn(*args, **kwargs)
        return wrapper
    return decorator

def get_authenticated_user():
    """Helper to retrieve authenticated user from current request or JWT identity."""
    if hasattr(request, "current_user") and request.current_user:
        return request.current_user

    try:
        verify_jwt_in_request()
        identity = get_jwt_identity()
        user_id = int(identity) if identity else None
        return db.session.get(User, user_id) if user_id else None
    except Exception:
        return None
