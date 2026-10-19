from datetime import datetime
from backend.app.extensions import db

class NotificationType:
    COMPLAINT_SUBMITTED = "COMPLAINT_SUBMITTED"
    COMPLAINT_ASSIGNED = "COMPLAINT_ASSIGNED"
    STATUS_CHANGED = "STATUS_CHANGED"
    INFORMATION_REQUESTED = "INFORMATION_REQUESTED"
    STUDENT_RESPONDED = "STUDENT_RESPONDED"
    COMPLAINT_RESOLVED = "COMPLAINT_RESOLVED"
    COMPLAINT_REOPENED = "COMPLAINT_REOPENED"
    SLA_DUE_SOON = "SLA_DUE_SOON"
    SLA_OVERDUE = "SLA_OVERDUE"
    SLA_ESCALATED = "SLA_ESCALATED"
    FEEDBACK_REQUESTED = "FEEDBACK_REQUESTED"
    FEEDBACK_SUBMITTED = "FEEDBACK_SUBMITTED"
    HIGH_PRIORITY_COMPLAINT = "HIGH_PRIORITY_COMPLAINT"
    INFO = "INFO"
    SUCCESS = "SUCCESS"
    WARNING = "WARNING"
    ERROR = "ERROR"

class Notification(db.Model):
    __tablename__ = "notifications"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = db.Column(db.String(150), nullable=False)
    message = db.Column(db.Text, nullable=False)
    type = db.Column(db.String(50), nullable=False, default=NotificationType.INFO)
    reference_id = db.Column(db.String(50), nullable=True) # e.g. RX-2026-000001
    complaint_id = db.Column(db.Integer, nullable=True)
    is_read = db.Column(db.Boolean, default=False, nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    user = db.relationship("User", back_populates="notifications")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "title": self.title,
            "message": self.message,
            "type": self.type,
            "reference_id": self.reference_id,
            "complaint_id": self.complaint_id,
            "is_read": self.is_read,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
