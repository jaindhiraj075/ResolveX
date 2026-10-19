from backend.app.extensions import db
from backend.app.models.notification import Notification

class NotificationService:
    @staticmethod
    def create_notification(user_id: int, title: str, message: str, notification_type="INFO", reference_id=None):
        """Creates an in-app notification record for the specified user."""
        try:
            notif = Notification(
                user_id=user_id,
                title=title,
                message=message,
                type=notification_type,
                reference_id=str(reference_id) if reference_id else None,
                is_read=False,
            )
            db.session.add(notif)
            return notif
        except Exception:
            return None
