from datetime import datetime
from backend.app.extensions import db

class Feedback(db.Model):
    __tablename__ = "feedback"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    complaint_id = db.Column(db.Integer, db.ForeignKey("complaints.id", ondelete="CASCADE"), unique=True, nullable=False)
    student_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    rating = db.Column(db.Integer, nullable=False)
    comments = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    complaint = db.relationship("Complaint", back_populates="feedback")
    student = db.relationship("User", back_populates="feedback")

    __table_args__ = (
        db.CheckConstraint("rating >= 1 AND rating <= 5", name="chk_feedback_rating"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "complaint_id": self.complaint_id,
            "student_id": self.student_id,
            "rating": self.rating,
            "comments": self.comments,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
