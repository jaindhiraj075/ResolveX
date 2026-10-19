import json
from datetime import datetime
from backend.app.extensions import db

class ComplaintStatus:
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    ASSIGNED = "ASSIGNED"
    IN_PROGRESS = "IN_PROGRESS"
    INFORMATION_REQUIRED = "INFORMATION_REQUIRED"
    RESOLVED = "RESOLVED"
    REOPENED = "REOPENED"
    CLOSED = "CLOSED"
    CLOSED_AS_DUPLICATE = "CLOSED_AS_DUPLICATE"

    ALL = [
        PENDING,
        PROCESSING,
        ASSIGNED,
        IN_PROGRESS,
        INFORMATION_REQUIRED,
        RESOLVED,
        REOPENED,
        CLOSED,
        CLOSED_AS_DUPLICATE,
    ]

    VALID_TRANSITIONS = {
        PENDING: [PROCESSING, ASSIGNED, CLOSED_AS_DUPLICATE],
        PROCESSING: [ASSIGNED, PENDING, CLOSED_AS_DUPLICATE],
        ASSIGNED: [IN_PROGRESS, INFORMATION_REQUIRED, RESOLVED, CLOSED_AS_DUPLICATE],
        IN_PROGRESS: [INFORMATION_REQUIRED, RESOLVED, ASSIGNED],
        INFORMATION_REQUIRED: [IN_PROGRESS, RESOLVED],
        RESOLVED: [REOPENED, CLOSED],
        REOPENED: [IN_PROGRESS, ASSIGNED],
        CLOSED: [REOPENED],
        CLOSED_AS_DUPLICATE: [PENDING, REOPENED],
    }

class ComplaintPriority:
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"

    ALL = [LOW, MEDIUM, HIGH]

class Complaint(db.Model):
    __tablename__ = "complaints"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    complaint_id = db.Column(db.String(30), unique=True, nullable=False, index=True)
    student_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    category_id = db.Column(db.Integer, db.ForeignKey("categories.id", ondelete="SET NULL"), nullable=True)
    department_id = db.Column(db.Integer, db.ForeignKey("departments.id", ondelete="SET NULL"), nullable=True)
    priority = db.Column(db.String(20), nullable=False, default=ComplaintPriority.MEDIUM)
    status = db.Column(db.String(30), nullable=False, default=ComplaintStatus.PENDING)

    # Phase 4 & Phase 9: AI Intelligence & Explainability fields
    ai_confidence = db.Column(db.Float, nullable=True, default=0.0)
    ai_category = db.Column(db.String(100), nullable=True)
    ai_category_confidence = db.Column(db.Float, nullable=True, default=0.0)
    ai_department = db.Column(db.String(100), nullable=True)
    ai_department_confidence = db.Column(db.Float, nullable=True, default=0.0)
    ai_priority = db.Column(db.String(20), nullable=True)
    ai_priority_confidence = db.Column(db.Float, nullable=True, default=0.0)
    ai_summary = db.Column(db.Text, nullable=True)
    ai_explanation = db.Column(db.Text, nullable=True)
    ai_factors = db.Column(db.Text, nullable=True)
    ai_human_review = db.Column(db.Boolean, default=False, nullable=False)
    location = db.Column(db.String(150), nullable=True)

    # Phase 4: Duplicate tracking
    duplicate_score = db.Column(db.Float, nullable=True, default=0.0)
    is_duplicate = db.Column(db.Boolean, default=False, nullable=False)
    original_complaint_id = db.Column(db.Integer, db.ForeignKey("complaints.id", ondelete="SET NULL"), nullable=True)

    # Phase 4: Manual human override fields
    final_category = db.Column(db.String(100), nullable=True)
    final_department = db.Column(db.String(100), nullable=True)
    final_priority = db.Column(db.String(20), nullable=True)
    is_overridden = db.Column(db.Boolean, default=False, nullable=False)

    # Phase 5: SLA, Escalation & Reopen fields
    sla_due_at = db.Column(db.DateTime, nullable=True, index=True)
    escalation_level = db.Column(db.Integer, default=0, nullable=False)
    sla_due_soon_notified = db.Column(db.Boolean, default=False, nullable=False)
    sla_overdue_notified = db.Column(db.Boolean, default=False, nullable=False)
    sla_escalated_level = db.Column(db.Integer, default=0, nullable=False)
    reopened_count = db.Column(db.Integer, default=0, nullable=False)
    reopen_reason = db.Column(db.Text, nullable=True)

    resolved_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    student = db.relationship("User", back_populates="complaints", foreign_keys=[student_id])
    department = db.relationship("Department", back_populates="complaints")
    category = db.relationship("Category", back_populates="complaints")
    history = db.relationship("ComplaintHistory", back_populates="complaint", cascade="all, delete-orphan", order_by="ComplaintHistory.created_at.asc()")
    assignments = db.relationship("ComplaintAssignment", back_populates="complaint", cascade="all, delete-orphan", order_by="ComplaintAssignment.assigned_at.desc()")
    messages = db.relationship("ComplaintMessage", back_populates="complaint", cascade="all, delete-orphan", order_by="ComplaintMessage.created_at.asc()")
    attachments = db.relationship("Attachment", back_populates="complaint", cascade="all, delete-orphan")
    feedback = db.relationship("Feedback", back_populates="complaint", uselist=False, cascade="all, delete-orphan")
    duplicate_records = db.relationship("DuplicateComplaint", back_populates="original_complaint", foreign_keys="DuplicateComplaint.original_complaint_id", cascade="all, delete-orphan")
    original_complaint = db.relationship("Complaint", remote_side=[id], foreign_keys=[original_complaint_id])

    @property
    def active_assignment(self):
        for a in self.assignments:
            if a.is_active:
                return a
        return None

    def to_dict(self, include_details=False):
        active_asgn = self.active_assignment

        data = {
            "id": self.id,
            "complaint_id": self.complaint_id,
            "student_id": self.student_id,
            "student_name": self.student.full_name if self.student else None,
            "student_email": self.student.email if self.student else None,
            "title": self.title,
            "description": self.description,
            "category_id": self.category_id,
            "category_name": self.category.name if self.category else None,
            "department_id": self.department_id,
            "department_name": self.department.name if self.department else None,
            "priority": self.priority,
            "status": self.status,

            # AI Metadata & Explainability (Phase 4 & 9)
            "ai_confidence": self.ai_confidence or 0.0,
            "ai_category": self.ai_category,
            "ai_category_confidence": self.ai_category_confidence or 0.0,
            "ai_department": self.ai_department,
            "ai_department_confidence": self.ai_department_confidence or 0.0,
            "ai_priority": self.ai_priority,
            "ai_priority_confidence": self.ai_priority_confidence or 0.0,
            "location": self.location,
            "ai_summary": self.ai_summary,
            "ai_explanation": self.ai_explanation,
            "ai_factors": json.loads(self.ai_factors) if self.ai_factors and self.ai_factors.startswith("[") else ([f.strip() for f in self.ai_factors.split(";")] if self.ai_factors else []),
            "ai_human_review": self.ai_human_review,
            "clarification_questions": (
                (lambda: [
                    q for q in (
                        __import__("backend.ai.classification.context_extractor", fromlist=["ComplaintContextExtractor"])
                        .ComplaintContextExtractor.extract(self.title or "", self.description or "")
                        .get("clarification_questions", [])
                    )
                ])() if (self.title or self.description) else []
            ),
            "is_out_of_taxonomy": bool(
                self.ai_human_review and self.ai_category_confidence and self.ai_category_confidence < 0.35
            ),

            # Duplicate Metadata
            "duplicate_score": self.duplicate_score or 0.0,
            "is_duplicate": self.is_duplicate,
            "original_complaint_id": self.original_complaint_id,
            "original_complaint_readable_id": self.original_complaint.complaint_id if self.original_complaint else None,

            # Override Metadata
            "final_category": self.final_category,
            "final_department": self.final_department,
            "final_priority": self.final_priority,
            "is_overridden": self.is_overridden,

            # Phase 5: SLA & Reopen Metadata
            "sla_due_at": self.sla_due_at.isoformat() if self.sla_due_at else None,
            "escalation_level": self.escalation_level or 0,
            "reopened_count": self.reopened_count or 0,
            "reopen_reason": self.reopen_reason,

            # Feedback
            "feedback": self.feedback.to_dict() if self.feedback else None,

            "resolved_at": self.resolved_at.isoformat() if self.resolved_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "assigned_staff_id": active_asgn.staff_id if active_asgn else None,
            "assigned_staff_name": active_asgn.staff.full_name if active_asgn and active_asgn.staff else None,
        }

        if include_details:
            data["history"] = [h.to_dict() for h in self.history]
            data["messages"] = [m.to_dict() for m in self.messages]
            data["attachments"] = [att.to_dict() for att in self.attachments]
            data["assignments"] = [asgn.to_dict() for asgn in self.assignments]

        return data
