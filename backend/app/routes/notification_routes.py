from flask import Blueprint
from flask_jwt_extended import jwt_required, get_jwt_identity
from backend.app.models.notification import Notification
from backend.app.models.user import User
from backend.app.utils.response import success_response, error_response
from backend.app.extensions import db

notification_bp = Blueprint("notifications", __name__, url_prefix="/api/notifications")

@notification_bp.route("", methods=["GET"])
@jwt_required()
def get_notifications():
    identity = get_jwt_identity()
    user_id = int(identity) if identity else None
    notifications = Notification.query.filter_by(user_id=user_id).order_by(Notification.created_at.desc()).limit(50).all()
    unread_count = Notification.query.filter_by(user_id=user_id, is_read=False).count()

    return success_response(
        message="Notifications retrieved",
        data={
            "notifications": [n.to_dict() for n in notifications],
            "unread_count": unread_count
        }
    )

@notification_bp.route("/<int:notification_id>/read", methods=["PUT"])
@jwt_required()
def mark_read(notification_id):
    identity = get_jwt_identity()
    user_id = int(identity) if identity else None
    notification = Notification.query.filter_by(id=notification_id, user_id=user_id).first()
    if not notification:
        return error_response(message="Notification not found", status_code=404)
    notification.is_read = True
    db.session.commit()
    return success_response(message="Notification marked as read", data=notification.to_dict())

@notification_bp.route("/read-all", methods=["PUT"])
@notification_bp.route("/mark-all-read", methods=["PUT"])
@jwt_required()
def mark_all_read():
    identity = get_jwt_identity()
    user_id = int(identity) if identity else None
    Notification.query.filter_by(user_id=user_id, is_read=False).update({"is_read": True})
    db.session.commit()
    return success_response(message="All notifications marked as read")
