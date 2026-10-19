from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from backend.app.extensions import db

class RoleEnum:
    STUDENT = "STUDENT"
    STAFF = "STAFF"
    ADMIN = "ADMIN"
    
    ALL = [STUDENT, STAFF, ADMIN]

class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    full_name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False, default=RoleEnum.STUDENT)
    department_id = db.Column(db.Integer, db.ForeignKey("departments.id", ondelete="SET NULL"), nullable=True)
    phone = db.Column(db.String(20), nullable=True)
    student_id_number = db.Column(db.String(50), nullable=True)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    department = db.relationship("Department", back_populates="staff_members")
    complaints = db.relationship("Complaint", back_populates="student", cascade="all, delete-orphan", foreign_keys="Complaint.student_id")
    notifications = db.relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    feedback = db.relationship("Feedback", back_populates="student")

    def set_password(self, password: str):
        """Hashes and sets the user password using werkzeug secure hashing."""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        """Verifies given password against stored hash."""
        return check_password_hash(self.password_hash, password)

    def to_dict(self, include_sensitive=False):
        data = {
            "id": self.id,
            "full_name": self.full_name,
            "email": self.email,
            "role": self.role,
            "department_id": self.department_id,
            "department_name": self.department.name if self.department else None,
            "phone": self.phone,
            "student_id_number": self.student_id_number,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
        if include_sensitive:
            data["password_hash"] = self.password_hash
        return data
