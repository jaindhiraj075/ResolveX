from datetime import datetime
from backend.app.extensions import db

class Category(db.Model):
    __tablename__ = "categories"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(100), nullable=False)
    department_id = db.Column(db.Integer, db.ForeignKey("departments.id", ondelete="CASCADE"), nullable=False)
    description = db.Column(db.Text, nullable=True)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    department = db.relationship("Department", back_populates="categories")
    complaints = db.relationship("Complaint", back_populates="category")

    __table_args__ = (
        db.UniqueConstraint("name", "department_id", name="uq_category_department"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "department_id": self.department_id,
            "department_name": self.department.name if self.department else None,
            "description": self.description,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
