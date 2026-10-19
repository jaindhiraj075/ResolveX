from datetime import datetime
from backend.app.extensions import db

class DuplicateComplaint(db.Model):
    __tablename__ = "duplicate_complaints"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    original_complaint_id = db.Column(db.Integer, db.ForeignKey("complaints.id", ondelete="CASCADE"), nullable=False)
    duplicate_complaint_id = db.Column(db.Integer, db.ForeignKey("complaints.id", ondelete="CASCADE"), nullable=False)
    similarity_score = db.Column(db.Float, nullable=False)
    detected_by = db.Column(db.String(50), default="AI", nullable=False)
    status = db.Column(db.String(30), default="PENDING_REVIEW", nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    original_complaint = db.relationship("Complaint", foreign_keys=[original_complaint_id], back_populates="duplicate_records")
    duplicate_complaint = db.relationship("Complaint", foreign_keys=[duplicate_complaint_id])

    def to_dict(self):
        return {
            "id": self.id,
            "original_complaint_id": self.original_complaint_id,
            "duplicate_complaint_id": self.duplicate_complaint_id,
            "similarity_score": self.similarity_score,
            "detected_by": self.detected_by,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
