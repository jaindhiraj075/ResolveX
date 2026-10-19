from datetime import datetime
from backend.app.extensions import db

class ComplaintMessage(db.Model):
    __tablename__ = "complaint_messages"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    complaint_id = db.Column(db.Integer, db.ForeignKey("complaints.id", ondelete="CASCADE"), nullable=False)
    sender_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    message = db.Column(db.Text, nullable=False)
    is_internal = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    complaint = db.relationship("Complaint", back_populates="messages")
    sender = db.relationship("User", foreign_keys=[sender_id])

    def to_dict(self):
        return {
            "id": self.id,
            "complaint_id": self.complaint_id,
            "sender_id": self.sender_id,
            "sender_name": self.sender.full_name if self.sender else None,
            "sender_role": self.sender.role if self.sender else None,
            "message": self.message,
            "is_internal": self.is_internal,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
