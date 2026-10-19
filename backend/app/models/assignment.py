from datetime import datetime
from backend.app.extensions import db

class ComplaintAssignment(db.Model):
    __tablename__ = "complaint_assignments"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    complaint_id = db.Column(db.Integer, db.ForeignKey("complaints.id", ondelete="CASCADE"), nullable=False)
    staff_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    assigned_by_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    notes = db.Column(db.Text, nullable=True)
    assigned_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    complaint = db.relationship("Complaint", back_populates="assignments")
    staff = db.relationship("User", foreign_keys=[staff_id])
    assigned_by = db.relationship("User", foreign_keys=[assigned_by_id])

    def to_dict(self):
        return {
            "id": self.id,
            "complaint_id": self.complaint_id,
            "staff_id": self.staff_id,
            "staff_name": self.staff.full_name if self.staff else None,
            "assigned_by_id": self.assigned_by_id,
            "assigned_by_name": self.assigned_by.full_name if self.assigned_by else None,
            "is_active": self.is_active,
            "notes": self.notes,
            "assigned_at": self.assigned_at.isoformat() if self.assigned_at else None,
        }
