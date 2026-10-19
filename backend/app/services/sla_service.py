from datetime import datetime, timedelta
from backend.app.extensions import db
from backend.app.models.complaint import Complaint, ComplaintStatus, ComplaintPriority
from backend.app.models.history import ComplaintHistory
from backend.app.models.notification import NotificationType
from backend.app.models.user import User, RoleEnum
from backend.app.services.notification_service import NotificationService

class SLAService:
    """Central SLA calculation, monitoring, and escalation service (Phase 5)."""

    # Configurable Default SLA Hours (Section 1)
    SLA_CONFIG = {
        ComplaintPriority.HIGH: 24,
        ComplaintPriority.MEDIUM: 48,
        ComplaintPriority.LOW: 72,
    }

    # Threshold for DUE_SOON (25% remaining)
    DUE_SOON_PERCENT = 0.25

    @classmethod
    def get_sla_hours(cls, priority: str) -> int:
        return cls.SLA_CONFIG.get((priority or "").upper(), 48)

    @classmethod
    def calculate_due_date(cls, priority: str, start_time: datetime = None) -> datetime:
        start_time = start_time or datetime.utcnow()
        hours = cls.get_sla_hours(priority)
        return start_time + timedelta(hours=hours)

    @classmethod
    def get_sla_info(cls, complaint: Complaint) -> dict:
        if not complaint.sla_due_at:
            complaint.sla_due_at = cls.calculate_due_date(complaint.priority, complaint.created_at)

        now = datetime.utcnow()
        is_terminal = complaint.status in [
            ComplaintStatus.RESOLVED,
            ComplaintStatus.CLOSED,
            ComplaintStatus.CLOSED_AS_DUPLICATE,
        ]

        if is_terminal:
            return {
                "priority": complaint.priority,
                "sla_hours": cls.get_sla_hours(complaint.priority),
                "created_at": complaint.created_at.isoformat() if complaint.created_at else None,
                "sla_due_at": complaint.sla_due_at.isoformat() if complaint.sla_due_at else None,
                "resolved_at": complaint.resolved_at.isoformat() if complaint.resolved_at else None,
                "sla_status": "RESOLVED",
                "remaining_seconds": 0,
                "is_overdue": False,
                "escalation_level": complaint.escalation_level or 0,
            }

        total_seconds = cls.get_sla_hours(complaint.priority) * 3600
        remaining_seconds = int((complaint.sla_due_at - now).total_seconds())

        if remaining_seconds <= 0:
            sla_status = "OVERDUE"
            is_overdue = True
            overdue_duration = abs(remaining_seconds)
            # Determine level 1 vs level 2
            escalation_level = 2 if overdue_duration > total_seconds else 1
        elif remaining_seconds <= (total_seconds * cls.DUE_SOON_PERCENT):
            sla_status = "DUE_SOON"
            is_overdue = False
            escalation_level = 0
        else:
            sla_status = "ON_TRACK"
            is_overdue = False
            escalation_level = 0

        return {
            "priority": complaint.priority,
            "sla_hours": cls.get_sla_hours(complaint.priority),
            "created_at": complaint.created_at.isoformat() if complaint.created_at else None,
            "sla_due_at": complaint.sla_due_at.isoformat() if complaint.sla_due_at else None,
            "sla_status": sla_status,
            "remaining_seconds": remaining_seconds,
            "is_overdue": is_overdue,
            "escalation_level": escalation_level,
        }

    @classmethod
    def evaluate_and_escalate(cls):
        """
        Idempotent background & on-demand evaluation of all active complaints.
        Prevents duplicate notification alerts.
        """
        active_complaints = Complaint.query.filter(
            Complaint.status.notin_([
                ComplaintStatus.RESOLVED,
                ComplaintStatus.CLOSED,
                ComplaintStatus.CLOSED_AS_DUPLICATE,
            ])
        ).all()

        evaluated_count = len(active_complaints)
        due_soon_count = 0
        overdue_count = 0
        escalated_count = 0

        for complaint in active_complaints:
            sla_info = cls.get_sla_info(complaint)
            sla_status = sla_info["sla_status"]
            escalation_level = sla_info["escalation_level"]

            active_asgn = complaint.active_assignment
            assigned_staff_id = active_asgn.staff_id if active_asgn else None

            # 1. DUE_SOON Event
            if sla_status == "DUE_SOON" and not complaint.sla_due_soon_notified:
                complaint.sla_due_soon_notified = True
                due_soon_count += 1

                if assigned_staff_id:
                    NotificationService.create_notification(
                        user_id=assigned_staff_id,
                        title="SLA Deadline Approaching",
                        message=f"Complaint {complaint.complaint_id} ({complaint.title}) is approaching its SLA deadline.",
                        notification_type=NotificationType.SLA_DUE_SOON,
                        reference_id=complaint.complaint_id,
                    )

                history = ComplaintHistory(
                    complaint_id=complaint.id,
                    action="SLA Due Soon",
                    from_status=complaint.status,
                    to_status=complaint.status,
                    performed_by_id=None,
                    notes=f"Remaining time entered critical ≤25% SLA threshold ({sla_info['remaining_seconds'] // 3600}h remaining).",
                )
                db.session.add(history)

            # 2. OVERDUE Event (Level 1)
            elif sla_status == "OVERDUE":
                if not complaint.sla_overdue_notified:
                    complaint.sla_overdue_notified = True
                    complaint.escalation_level = 1
                    overdue_count += 1

                    # Notify assigned staff
                    if assigned_staff_id:
                        NotificationService.create_notification(
                            user_id=assigned_staff_id,
                            title="Complaint Overdue",
                            message=f"Complaint {complaint.complaint_id} has exceeded its SLA resolution deadline.",
                            notification_type=NotificationType.SLA_OVERDUE,
                            reference_id=complaint.complaint_id,
                        )

                    # Notify administrators
                    admins = User.query.filter_by(role=RoleEnum.ADMIN).all()
                    for adm in admins:
                        NotificationService.create_notification(
                            user_id=adm.id,
                            title="SLA Overdue - Department Escalation",
                            message=f"Complaint {complaint.complaint_id} ({complaint.department.name if complaint.department else 'General'}) is overdue.",
                            notification_type=NotificationType.SLA_OVERDUE,
                            reference_id=complaint.complaint_id,
                        )

                    history = ComplaintHistory(
                        complaint_id=complaint.id,
                        action="SLA Overdue",
                        from_status=complaint.status,
                        to_status=complaint.status,
                        performed_by_id=None,
                        notes="Complaint exceeded SLA resolution window without closure. Escalated to Level 1.",
                    )
                    db.session.add(history)

                # 3. Extended Overdue (Level 2 Escalation)
                if escalation_level == 2 and complaint.sla_escalated_level < 2:
                    complaint.escalation_level = 2
                    complaint.sla_escalated_level = 2
                    escalated_count += 1

                    admins = User.query.filter_by(role=RoleEnum.ADMIN).all()
                    for adm in admins:
                        NotificationService.create_notification(
                            user_id=adm.id,
                            title="Critical SLA Escalation (Level 2)",
                            message=f"Urgent: Complaint {complaint.complaint_id} has exceeded 2x SLA cycles without resolution.",
                            notification_type=NotificationType.SLA_ESCALATED,
                            reference_id=complaint.complaint_id,
                        )

                    history = ComplaintHistory(
                        complaint_id=complaint.id,
                        action="Complaint Escalated",
                        from_status=complaint.status,
                        to_status=complaint.status,
                        performed_by_id=None,
                        notes="Extended overdue period detected (>2x SLA window). Critical Escalation Level 2 applied.",
                    )
                    db.session.add(history)

        try:
            db.session.commit()
            return {
                "evaluated": evaluated_count,
                "due_soon": due_soon_count,
                "overdue": overdue_count,
                "escalated": escalated_count,
            }
        except Exception:
            db.session.rollback()
            return {"evaluated": 0, "error": "Failed to persist SLA evaluation"}
