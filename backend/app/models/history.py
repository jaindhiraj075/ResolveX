from datetime import datetime
from backend.app.extensions import db

class ComplaintHistory(db.Model):
    __tablename__ = "complaint_history"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    complaint_id = db.Column(db.Integer, db.ForeignKey("complaints.id", ondelete="CASCADE"), nullable=False)
    action = db.Column(db.String(100), nullable=False)
    from_status = db.Column(db.String(50), nullable=True)
    to_status = db.Column(db.String(50), nullable=True)
    performed_by_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    complaint = db.relationship("Complaint", back_populates="history")
    performed_by = db.relationship("User", foreign_keys=[performed_by_id])

    def to_dict(self):
        return {
            "id": self.id,
            "complaint_id": self.complaint_id,
            "action": self.action,
            "from_status": self.from_status,
            "to_status": self.to_status,
            "performed_by_id": self.performed_by_id,
            "performed_by_name": self.performed_by.full_name if self.performed_by else "System",
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
