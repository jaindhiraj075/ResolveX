from datetime import datetime
from sqlalchemy import or_
from backend.app.extensions import db
from backend.app.models.complaint import Complaint, ComplaintStatus, ComplaintPriority
from backend.app.models.history import ComplaintHistory
from backend.app.models.assignment import ComplaintAssignment
from backend.app.models.message import ComplaintMessage
from backend.app.models.attachment import Attachment
from backend.app.models.duplicate import DuplicateComplaint
from backend.app.models.feedback import Feedback
from backend.app.models.notification import NotificationType
from backend.app.models.user import User, RoleEnum
from backend.app.models.department import Department
from backend.app.models.category import Category
from backend.app.services.notification_service import NotificationService
from backend.app.services.sla_service import SLAService
from backend.app.utils.id_generator import generate_complaint_id
from backend.ai import AIService

class ComplaintService:
    @staticmethod
    def create_complaint(student_id: int, data: dict):
        title = (data.get("title") or "").strip()
        description = (data.get("description") or "").strip()
        category_id = data.get("category_id")
        department_id = data.get("department_id")
        priority = (data.get("priority") or ComplaintPriority.MEDIUM).upper()
        attachment_data = data.get("attachment")

        if not title:
            return None, "Complaint title is required", 400
        if len(title) < 3 or len(title) > 200:
            return None, "Complaint title must be between 3 and 200 characters", 400
        if not description:
            return None, "Complaint description is required", 400
        if len(description) < 10 or len(description) > 5000:
            return None, "Complaint description must be between 10 and 5000 characters", 400
        if data.get("priority") and priority not in ComplaintPriority.ALL:
            return None, f"Invalid priority. Must be one of {ComplaintPriority.ALL}", 400
        # 1. Candidate complaints for duplicate detection
        candidate_complaints = [
            {
                "id": c.id,
                "complaint_id": c.complaint_id,
                "title": c.title,
                "description": c.description,
            }
            for c in Complaint.query.filter(
                Complaint.status != ComplaintStatus.CLOSED,
                Complaint.status != ComplaintStatus.CLOSED_AS_DUPLICATE,
            ).limit(100).all()
        ]

        # 2. Run real Context-Aware NLP & Taxonomy Analysis
        ai_result = AIService.analyze(
            title=title,
            description=description,
            existing_complaints=candidate_complaints,
        )

        # Category and Department can be provided by user or AI-recommended by default
        resolved_category_id = None
        if category_id:
            cat = db.session.get(Category, int(category_id))
            if cat and cat.is_active:
                resolved_category_id = cat.id
        if not resolved_category_id:
            resolved_category_id = ai_result.get("category_id")

        # Fallback to first active category if still unassigned
        if not resolved_category_id:
            first_cat = Category.query.filter_by(is_active=True).first()
            if first_cat:
                resolved_category_id = first_cat.id

        resolved_department_id = None
        if department_id:
            dept = db.session.get(Department, int(department_id))
            if dept and dept.is_active:
                resolved_department_id = dept.id
        if not resolved_department_id:
            # If category has department_id, prefer that
            if resolved_category_id:
                cat_obj = db.session.get(Category, resolved_category_id)
                if cat_obj and cat_obj.department_id:
                    resolved_department_id = cat_obj.department_id
            if not resolved_department_id:
                resolved_department_id = ai_result.get("department_id")

        # Fallback to first active department if still unassigned
        if not resolved_department_id:
            first_dept = Department.query.filter_by(is_active=True).first()
            if first_dept:
                resolved_department_id = first_dept.id

        category_id = resolved_category_id
        department_id = resolved_department_id

        # Attachment validation and security (Section 8)
        if attachment_data and isinstance(attachment_data, dict):
            raw_filename = (attachment_data.get("file_name") or "").strip()
            file_size = attachment_data.get("file_size") or 0

            if raw_filename:
                ext = raw_filename.rsplit(".", 1)[-1].lower() if "." in raw_filename else ""
                allowed = {"pdf", "png", "jpg", "jpeg", "doc", "docx"}
                if ext not in allowed:
                    return None, f"Invalid file format (.{ext}). Allowed formats: PDF, PNG, JPG, JPEG, DOC, DOCX", 400

            if file_size > 5 * 1024 * 1024:
                return None, "Attached file exceeds maximum allowable limit of 5 MB", 400

        try:
            complaint_id = generate_complaint_id(db.session, Complaint)
            # Authoritative context priority assigned by backend AI (Section 6: students cannot dictate final priority)
            assigned_priority = ai_result.get("priority") or ComplaintPriority.MEDIUM
            is_dup = bool(ai_result.get("is_duplicate"))
            is_potential_dup = bool(ai_result.get("is_potential_duplicate"))
            orig_id = ai_result.get("original_complaint_id")
            orig_readable_id = ai_result.get("original_complaint_readable_id")

            # Only auto-close if confirmed duplicate; potential duplicate stays PENDING for human verification
            initial_status = ComplaintStatus.CLOSED_AS_DUPLICATE if is_dup else ComplaintStatus.PENDING

            # 3. Calculate SLA Due Date via SLAService based on context priority
            now = datetime.utcnow()
            sla_due_at = SLAService.calculate_due_date(assigned_priority, now)

            import json
            factors_json = json.dumps(ai_result.get("factors") or [])

            complaint = Complaint(
                complaint_id=complaint_id,
                student_id=student_id,
                title=title,
                description=description,
                category_id=category_id,
                department_id=department_id,
                priority=assigned_priority,
                status=initial_status,
                created_at=now,
                sla_due_at=sla_due_at,

                # AI inference results
                ai_category=ai_result.get("category"),
                ai_category_confidence=ai_result.get("category_confidence", 0.0),
                ai_department=ai_result.get("department"),
                ai_department_confidence=ai_result.get("department_confidence", 0.0),
                ai_priority=ai_result.get("priority"),
                ai_priority_confidence=ai_result.get("priority_confidence", 0.0),
                ai_confidence=ai_result.get("category_confidence", 0.0),
                ai_summary=ai_result.get("summary"),
                ai_explanation=ai_result.get("explanation"),
                ai_factors=factors_json,
                ai_human_review=bool(ai_result.get("human_review_required")),
                location=ai_result.get("location"),

                # Duplicate metadata
                duplicate_score=ai_result.get("duplicate_similarity", 0.0),
                is_duplicate=is_dup or is_potential_dup,
                original_complaint_id=orig_id if (is_dup or is_potential_dup) else None,
            )
            db.session.add(complaint)
            db.session.flush()

            # 4. Create initial history entry
            history_notes = (
                f"AI Context Assessment: {ai_result.get('category')} ({ai_result.get('category_confidence', 0)*100:.1f}%), "
                f"{ai_result.get('department')}, Priority {assigned_priority}. {ai_result.get('explanation')}"
            )
            if is_dup:
                history_notes += f" Detected as duplicate of {orig_readable_id} ({ai_result.get('duplicate_similarity', 0)*100:.1f}% similarity) - auto-closed."
            elif is_potential_dup:
                history_notes += f" Potential duplicate of {orig_readable_id} ({ai_result.get('duplicate_similarity', 0)*100:.1f}% similarity) - queued for staff verification."
            else:
                history_notes += f" SLA Target: {SLAService.get_sla_hours(assigned_priority)}h."

            history = ComplaintHistory(
                complaint_id=complaint.id,
                action="Complaint Submitted" if not is_dup else "Closed as Duplicate",
                from_status=None,
                to_status=initial_status,
                performed_by_id=student_id,
                notes=history_notes,
            )
            db.session.add(history)

            # 5. If duplicate or potential duplicate, record in duplicate_complaints table
            if (is_dup or is_potential_dup) and orig_id:
                dup_record = DuplicateComplaint(
                    original_complaint_id=orig_id,
                    duplicate_complaint_id=complaint.id,
                    similarity_score=ai_result.get("duplicate_similarity", 0.0),
                    detected_by="AI",
                    status="AUTO_CLOSED" if is_dup else "FLAGGED_FOR_REVIEW",
                )
                db.session.add(dup_record)

            # 6. Process attachment if provided
            if attachment_data and isinstance(attachment_data, dict):
                import os
                raw_name = attachment_data.get("file_name") or "attachment"
                safe_name = os.path.basename(raw_name).replace("..", "").replace("/", "").replace("\\", "")
                if not safe_name:
                    safe_name = f"attachment_{complaint.id}.dat"
                file_path = f"/uploads/{safe_name}"
                file_type = attachment_data.get("file_type") or "application/octet-stream"
                file_size = attachment_data.get("file_size") or 0

                att = Attachment(
                    complaint_id=complaint.id,
                    file_name=safe_name,
                    file_path=file_path,
                    file_type=file_type,
                    file_size=file_size,
                    uploaded_by_id=student_id,
                )
                db.session.add(att)

            # 7. Notifications
            if is_dup:
                NotificationService.create_notification(
                    user_id=student_id,
                    title="Complaint Flagged as Duplicate",
                    message=f"Your complaint {complaint_id} is similar to existing complaint {orig_readable_id} and was closed as duplicate.",
                    notification_type=NotificationType.WARNING,
                    reference_id=complaint_id,
                )
            else:
                NotificationService.create_notification(
                    user_id=student_id,
                    title="Complaint Registered",
                    message=f"Your complaint {complaint_id} has been submitted. SLA resolution window: {SLAService.get_sla_hours(priority)}h.",
                    notification_type=NotificationType.COMPLAINT_SUBMITTED,
                    reference_id=complaint_id,
                )

                if priority == ComplaintPriority.HIGH:
                    admins = User.query.filter_by(role=RoleEnum.ADMIN).all()
                    for adm in admins:
                        NotificationService.create_notification(
                            user_id=adm.id,
                            title="High Priority Complaint",
                            message=f"High priority complaint {complaint_id} submitted in {dept.name}.",
                            notification_type=NotificationType.HIGH_PRIORITY_COMPLAINT,
                            reference_id=complaint_id,
                        )

            db.session.commit()
            return complaint.to_dict(include_details=True), None, 201

        except Exception as e:
            db.session.rollback()
            return None, f"Failed to record complaint: {str(e)}", 500

    @staticmethod
    def get_complaints(user, filters: dict = None):
        filters = filters or {}
        query = Complaint.query

        if user.role == RoleEnum.STUDENT:
            query = query.filter_by(student_id=user.id)
        elif user.role == RoleEnum.STAFF:
            staff_assignments = db.select(ComplaintAssignment.complaint_id).filter_by(
                staff_id=user.id, is_active=True
            )

            if user.department_id:
                query = query.filter(
                    or_(
                        Complaint.id.in_(staff_assignments),
                        Complaint.department_id == user.department_id
                    )
                )
            else:
                query = query.filter(Complaint.id.in_(staff_assignments))

        search = (filters.get("search") or "").strip()
        if search:
            search_pattern = f"%{search}%"
            query = query.filter(
                or_(
                    Complaint.complaint_id.ilike(search_pattern),
                    Complaint.title.ilike(search_pattern),
                    Complaint.description.ilike(search_pattern),
                )
            )

        status = filters.get("status")
        if status and status != "ALL":
            query = query.filter_by(status=status)

        priority = filters.get("priority")
        if priority and priority != "ALL":
            query = query.filter_by(priority=priority)

        category_id = filters.get("category_id")
        if category_id:
            try:
                query = query.filter_by(category_id=int(category_id))
            except ValueError:
                pass

        department_id = filters.get("department_id")
        if department_id:
            try:
                query = query.filter_by(department_id=int(department_id))
            except ValueError:
                pass

        complaints = query.order_by(Complaint.created_at.desc()).all()
        results = []
        for c in complaints:
            c_dict = c.to_dict(include_details=False)
            sla_info = SLAService.get_sla_info(c)
            c_dict["sla_info"] = sla_info
            c_dict["sla_status"] = sla_info["sla_status"]
            results.append(c_dict)

        # Filter by SLA status if requested (Section 29 & 30)
        sla_filter = filters.get("sla_status")
        if sla_filter and sla_filter != "ALL":
            results = [r for r in results if r["sla_status"] == sla_filter]

        return results

    @staticmethod
    def get_complaint_by_id(user, identifier: str):
        if identifier.isdigit():
            complaint = Complaint.query.filter(
                or_(Complaint.id == int(identifier), Complaint.complaint_id == identifier)
            ).first()
        else:
            complaint = Complaint.query.filter_by(complaint_id=identifier).first()

        if not complaint:
            return None, "Complaint not found", 404

        if user.role == RoleEnum.STUDENT:
            if complaint.student_id != user.id:
                return None, "Access denied: You can only view your own complaints", 403

        elif user.role == RoleEnum.STAFF:
            is_assigned = any(a.staff_id == user.id and a.is_active for a in complaint.assignments)
            is_dept_member = user.department_id and complaint.department_id == user.department_id

            if not (is_assigned or is_dept_member):
                return None, "Access denied: This complaint is not assigned to your department", 403

        data = complaint.to_dict(include_details=True)
        data["sla_info"] = SLAService.get_sla_info(complaint)
        data["sla_status"] = data["sla_info"]["sla_status"]
        return data, None, 200

    @staticmethod
    def reopen_complaint(complaint_id_or_num, student_user, reason: str):
        """Reopens a resolved complaint, resets the SLA cycle, and records audit history (Sections 23, 24, 25)."""
        complaint = ComplaintService._resolve_complaint(complaint_id_or_num)
        if not complaint:
            return None, "Complaint not found", 404

        if complaint.student_id != student_user.id:
            return None, "Unauthorized: You can only reopen your own complaints", 403

        if complaint.status != ComplaintStatus.RESOLVED:
            return None, f"Cannot reopen complaint with status {complaint.status}. Only RESOLVED complaints can be reopened.", 400

        reason = (reason or "").strip()
        if not reason:
            return None, "A valid reason explaining why you are reopening this complaint is required", 400
        if len(reason) < 5 or len(reason) > 1000:
            return None, "Reopen justification must be between 5 and 1000 characters", 400

        # Update status and restart SLA cycle
        old_status = complaint.status
        complaint.status = ComplaintStatus.REOPENED
        complaint.resolved_at = None
        complaint.reopened_count = (complaint.reopened_count or 0) + 1
        complaint.reopen_reason = reason

        # Reset SLA timers
        now = datetime.utcnow()
        complaint.sla_due_at = SLAService.calculate_due_date(complaint.priority, now)
        complaint.sla_due_soon_notified = False
        complaint.sla_overdue_notified = False
        complaint.sla_escalated_level = 0
        complaint.escalation_level = 0

        # Create history for reopen
        h_reopen = ComplaintHistory(
            complaint_id=complaint.id,
            action="Complaint Reopened",
            from_status=old_status,
            to_status=ComplaintStatus.REOPENED,
            performed_by_id=student_user.id,
            notes=f"Reopened by student. Reason: {reason}",
        )
        db.session.add(h_reopen)

        # Create history for SLA restart
        h_sla = ComplaintHistory(
            complaint_id=complaint.id,
            action="SLA Restarted",
            from_status=ComplaintStatus.REOPENED,
            to_status=ComplaintStatus.REOPENED,
            performed_by_id=student_user.id,
            notes=f"New {complaint.priority} SLA window initiated ({SLAService.get_sla_hours(complaint.priority)}h target: {complaint.sla_due_at.isoformat()}).",
        )
        db.session.add(h_sla)

        # Notify assigned staff member or department
        active_asgn = complaint.active_assignment
        if active_asgn:
            NotificationService.create_notification(
                user_id=active_asgn.staff_id,
                title="Complaint Reopened by Student",
                message=f"Complaint {complaint.complaint_id} has been reopened: \"{reason[:70]}...\"",
                notification_type=NotificationType.COMPLAINT_REOPENED,
                reference_id=complaint.complaint_id,
            )

        try:
            db.session.commit()
            data = complaint.to_dict(include_details=True)
            data["sla_info"] = SLAService.get_sla_info(complaint)
            return data, None, 200
        except Exception as e:
            db.session.rollback()
            return None, f"Failed to reopen complaint: {str(e)}", 500

    @staticmethod
    def submit_feedback(complaint_id_or_num, student_user, rating: int, comments: str = None):
        """Allows student to submit 1-5 star feedback on a resolved complaint (Sections 17-21)."""
        complaint = ComplaintService._resolve_complaint(complaint_id_or_num)
        if not complaint:
            return None, "Complaint not found", 404

        if complaint.student_id != student_user.id:
            return None, "Unauthorized: You can only submit feedback for your own complaint", 403

        if complaint.status not in [ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED]:
            return None, "Feedback can only be submitted after a complaint has been resolved or closed", 400

        try:
            rating = int(rating)
            if rating < 1 or rating > 5:
                return None, "Rating must be an integer between 1 and 5 stars", 400
        except (ValueError, TypeError):
            return None, "Rating must be a valid number between 1 and 5", 400

        comments = (comments or "").strip()
        if len(comments) > 1000:
            return None, "Feedback comments must not exceed 1000 characters", 400

        # Check for existing feedback
        existing = Feedback.query.filter_by(complaint_id=complaint.id).first()
        if existing:
            return None, "Feedback has already been submitted for this complaint", 400

        feedback = Feedback(
            complaint_id=complaint.id,
            student_id=student_user.id,
            rating=rating,
            comments=comments if comments else None,
        )
        db.session.add(feedback)

        # Audit history entry
        history = ComplaintHistory(
            complaint_id=complaint.id,
            action="Feedback Submitted",
            from_status=complaint.status,
            to_status=complaint.status,
            performed_by_id=student_user.id,
            notes=f"Student rated resolution quality: {rating}/5 stars. {comments or ''}".strip(),
        )
        db.session.add(history)

        # Notify assigned staff member
        active_asgn = complaint.active_assignment
        if active_asgn:
            NotificationService.create_notification(
                user_id=active_asgn.staff_id,
                title="Resolution Feedback Received",
                message=f"Student submitted {rating}/5 stars feedback on {complaint.complaint_id}.",
                notification_type=NotificationType.FEEDBACK_SUBMITTED,
                reference_id=complaint.complaint_id,
            )

        try:
            db.session.commit()
            return feedback.to_dict(), None, 201
        except Exception as e:
            db.session.rollback()
            return None, f"Failed to record feedback: {str(e)}", 500

    @staticmethod
    def update_feedback(complaint_id_or_num, student_user, rating: int, comments: str = None):
        complaint = ComplaintService._resolve_complaint(complaint_id_or_num)
        if not complaint:
            return None, "Complaint not found", 404

        feedback = Feedback.query.filter_by(complaint_id=complaint.id, student_id=student_user.id).first()
        if not feedback:
            return None, "No existing feedback found to update", 404

        try:
            rating = int(rating)
            if rating < 1 or rating > 5:
                return None, "Rating must be an integer between 1 and 5 stars", 400
        except (ValueError, TypeError):
            return None, "Rating must be a valid number between 1 and 5", 400

        feedback.rating = rating
        feedback.comments = (comments or "").strip() or None

        try:
            db.session.commit()
            return feedback.to_dict(), None, 200
        except Exception as e:
            db.session.rollback()
            return None, f"Failed to update feedback: {str(e)}", 500

    @staticmethod
    def override_ai(complaint_id_or_num, user, data: dict):
        complaint = ComplaintService._resolve_complaint(complaint_id_or_num)
        if not complaint:
            return None, "Complaint not found", 404

        if user.role not in [RoleEnum.STAFF, RoleEnum.ADMIN]:
            return None, "Unauthorized: Only Staff or Admin can override AI classification", 403

        category_id = data.get("category_id")
        department_id = data.get("department_id")
        priority = data.get("priority")
        reason = (data.get("reason") or "").strip()

        if not reason:
            return None, "Reason for override is required to audit AI corrections", 400

        old_cat = complaint.category.name if complaint.category else complaint.ai_category
        old_dept = complaint.department.name if complaint.department else complaint.ai_department
        old_priority = complaint.priority

        changes = []

        if category_id:
            cat = db.session.get(Category, int(category_id))
            if cat:
                complaint.category_id = cat.id
                complaint.final_category = cat.name
                changes.append(f"Category: {old_cat} -> {cat.name}")

        if department_id:
            dept = db.session.get(Department, int(department_id))
            if dept:
                complaint.department_id = dept.id
                complaint.final_department = dept.name
                changes.append(f"Department: {old_dept} -> {dept.name}")

        if priority and priority in ComplaintPriority.ALL:
            complaint.priority = priority
            complaint.final_priority = priority
            changes.append(f"Priority: {old_priority} -> {priority}")
            # Recalculate SLA due date based on new priority if still open
            if complaint.status not in [ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED]:
                complaint.sla_due_at = SLAService.calculate_due_date(priority, complaint.created_at)

        if not changes:
            return None, "No valid classification changes specified", 400

        complaint.is_overridden = True

        history = ComplaintHistory(
            complaint_id=complaint.id,
            action="AI Recommendation Overridden",
            from_status=complaint.status,
            to_status=complaint.status,
            performed_by_id=user.id,
            notes=f"Overridden by {user.full_name} ({user.role}): {'; '.join(changes)}. Reason: {reason or 'Manual review'}",
        )
        db.session.add(history)

        try:
            db.session.commit()
            data = complaint.to_dict(include_details=True)
            data["sla_info"] = SLAService.get_sla_info(complaint)
            return data, None, 200
        except Exception as e:
            db.session.rollback()
            return None, f"Failed to override classification: {str(e)}", 500

    @staticmethod
    def update_status(complaint_id_or_num, new_status: str, user, notes: str = None):
        complaint = ComplaintService._resolve_complaint(complaint_id_or_num)
        if not complaint:
            return None, "Complaint not found", 404

        new_status = new_status.upper()
        if new_status not in ComplaintStatus.ALL:
            return None, f"Invalid status: {new_status}", 400

        allowed_transitions = ComplaintStatus.VALID_TRANSITIONS.get(complaint.status, [])
        if new_status not in allowed_transitions and user.role != RoleEnum.ADMIN:
            return None, f"Invalid status transition from {complaint.status} to {new_status}", 400

        old_status = complaint.status
        complaint.status = new_status

        if new_status == ComplaintStatus.RESOLVED:
            complaint.resolved_at = datetime.utcnow()

        history = ComplaintHistory(
            complaint_id=complaint.id,
            action=f"Status changed to {new_status}",
            from_status=old_status,
            to_status=new_status,
            performed_by_id=user.id,
            notes=notes or f"Status updated by {user.full_name} ({user.role})",
        )
        db.session.add(history)

        # Notify student with descriptive message (Section 16)
        status_messages = {
            ComplaintStatus.ASSIGNED: "Your complaint has been assigned to the appropriate department.",
            ComplaintStatus.IN_PROGRESS: "Work has started on your complaint by department officers.",
            ComplaintStatus.INFORMATION_REQUIRED: "Additional information is required from you.",
            ComplaintStatus.RESOLVED: "Your complaint has been marked as resolved.",
            ComplaintStatus.REOPENED: "Your complaint has been reopened for further investigation.",
            ComplaintStatus.CLOSED: "Your complaint ticket has been closed.",
        }

        notif_msg = status_messages.get(new_status, f"Complaint {complaint.complaint_id} status changed to {new_status}.")
        NotificationService.create_notification(
            user_id=complaint.student_id,
            title=f"Complaint Status: {new_status}",
            message=notif_msg,
            notification_type=NotificationType.STATUS_CHANGED,
            reference_id=complaint.complaint_id,
        )

        try:
            db.session.commit()
            data = complaint.to_dict(include_details=True)
            data["sla_info"] = SLAService.get_sla_info(complaint)
            return data, None, 200
        except Exception as e:
            db.session.rollback()
            return None, f"Failed to update status: {str(e)}", 500

    @staticmethod
    def request_information(complaint_id_or_num, staff_user, message: str):
        complaint = ComplaintService._resolve_complaint(complaint_id_or_num)
        if not complaint:
            return None, "Complaint not found", 404

        message = (message or "").strip()
        if not message:
            return None, "Message requesting additional information is required", 400

        old_status = complaint.status
        complaint.status = ComplaintStatus.INFORMATION_REQUIRED

        msg = ComplaintMessage(
            complaint_id=complaint.id,
            sender_id=staff_user.id,
            message=message,
            is_internal=False,
        )
        db.session.add(msg)

        history = ComplaintHistory(
            complaint_id=complaint.id,
            action="Information Requested",
            from_status=old_status,
            to_status=ComplaintStatus.INFORMATION_REQUIRED,
            performed_by_id=staff_user.id,
            notes=message,
        )
        db.session.add(history)

        NotificationService.create_notification(
            user_id=complaint.student_id,
            title="Information Requested",
            message=f"Staff requested additional details on {complaint.complaint_id}: \"{message[:60]}...\"",
            notification_type=NotificationType.INFORMATION_REQUESTED,
            reference_id=complaint.complaint_id,
        )

        try:
            db.session.commit()
            data = complaint.to_dict(include_details=True)
            data["sla_info"] = SLAService.get_sla_info(complaint)
            return data, None, 200
        except Exception as e:
            db.session.rollback()
            return None, f"Failed to record information request: {str(e)}", 500

    @staticmethod
    def respond_information(complaint_id_or_num, student_user, message: str):
        complaint = ComplaintService._resolve_complaint(complaint_id_or_num)
        if not complaint:
            return None, "Complaint not found", 404

        if complaint.student_id != student_user.id:
            return None, "Unauthorized: You can only respond to your own complaints", 403

        message = (message or "").strip()
        if not message:
            return None, "Response message cannot be empty", 400

        old_status = complaint.status
        complaint.status = ComplaintStatus.IN_PROGRESS

        msg = ComplaintMessage(
            complaint_id=complaint.id,
            sender_id=student_user.id,
            message=message,
            is_internal=False,
        )
        db.session.add(msg)

        history = ComplaintHistory(
            complaint_id=complaint.id,
            action="Student Responded",
            from_status=old_status,
            to_status=ComplaintStatus.IN_PROGRESS,
            performed_by_id=student_user.id,
            notes=f"Student provided information: {message[:80]}",
        )
        db.session.add(history)

        active_asgn = complaint.active_assignment
        if active_asgn:
            NotificationService.create_notification(
                user_id=active_asgn.staff_id,
                title="Student Responded",
                message=f"Student provided response on {complaint.complaint_id}.",
                notification_type=NotificationType.STUDENT_RESPONDED,
                reference_id=complaint.complaint_id,
            )

        try:
            db.session.commit()
            data = complaint.to_dict(include_details=True)
            data["sla_info"] = SLAService.get_sla_info(complaint)
            return data, None, 200
        except Exception as e:
            db.session.rollback()
            return None, f"Failed to submit response: {str(e)}", 500

    @staticmethod
    def resolve_complaint(complaint_id_or_num, staff_user, resolution_summary: str, resolution_details: str = None):
        complaint = ComplaintService._resolve_complaint(complaint_id_or_num)
        if not complaint:
            return None, "Complaint not found", 404

        summary = (resolution_summary or "").strip()
        if not summary:
            return None, "Resolution summary is required", 400

        old_status = complaint.status
        complaint.status = ComplaintStatus.RESOLVED
        complaint.resolved_at = datetime.utcnow()

        full_note = f"Resolution: {summary}"
        if resolution_details and resolution_details.strip():
            full_note += f" | Details: {resolution_details.strip()}"
            msg = ComplaintMessage(
                complaint_id=complaint.id,
                sender_id=staff_user.id,
                message=f"Resolution: {summary}\n\n{resolution_details.strip()}",
                is_internal=False,
            )
            db.session.add(msg)

        history = ComplaintHistory(
            complaint_id=complaint.id,
            action="Complaint Resolved",
            from_status=old_status,
            to_status=ComplaintStatus.RESOLVED,
            performed_by_id=staff_user.id,
            notes=full_note,
        )
        db.session.add(history)

        # Notify student and trigger feedback prompt (Section 16 & 17)
        NotificationService.create_notification(
            user_id=complaint.student_id,
            title="Complaint Resolved",
            message=f"Complaint {complaint.complaint_id} has been marked as RESOLVED by {staff_user.full_name}.",
            notification_type=NotificationType.COMPLAINT_RESOLVED,
            reference_id=complaint.complaint_id,
        )

        NotificationService.create_notification(
            user_id=complaint.student_id,
            title="How was your resolution experience?",
            message=f"Please rate the resolution quality for {complaint.complaint_id}.",
            notification_type=NotificationType.FEEDBACK_REQUESTED,
            reference_id=complaint.complaint_id,
        )

        try:
            db.session.commit()
            data = complaint.to_dict(include_details=True)
            data["sla_info"] = SLAService.get_sla_info(complaint)
            return data, None, 200
        except Exception as e:
            db.session.rollback()
            return None, f"Failed to resolve complaint: {str(e)}", 500

    @staticmethod
    def assign_complaint(complaint_id_or_num, staff_id: int, admin_user, notes: str = None):
        complaint = ComplaintService._resolve_complaint(complaint_id_or_num)
        if not complaint:
            return None, "Complaint not found", 404

        staff = db.session.get(User, staff_id)
        if not staff or staff.role not in [RoleEnum.STAFF, RoleEnum.ADMIN]:
            return None, "Target user is not a qualified staff member", 400

        for a in complaint.assignments:
            a.is_active = False

        asgn = ComplaintAssignment(
            complaint_id=complaint.id,
            staff_id=staff.id,
            assigned_by_id=admin_user.id,
            is_active=True,
            notes=notes or f"Assigned to {staff.full_name}",
        )
        db.session.add(asgn)

        old_status = complaint.status
        if complaint.status == ComplaintStatus.PENDING:
            complaint.status = ComplaintStatus.ASSIGNED

        history = ComplaintHistory(
            complaint_id=complaint.id,
            action="Staff Assigned",
            from_status=old_status,
            to_status=complaint.status,
            performed_by_id=admin_user.id,
            notes=f"Assigned to {staff.full_name} ({staff.email})",
        )
        db.session.add(history)

        NotificationService.create_notification(
            user_id=staff.id,
            title="Complaint Assigned to You",
            message=f"You have been assigned to investigate complaint {complaint.complaint_id}: {complaint.title}.",
            notification_type=NotificationType.COMPLAINT_ASSIGNED,
            reference_id=complaint.complaint_id,
        )

        NotificationService.create_notification(
            user_id=complaint.student_id,
            title="Complaint Assigned",
            message=f"Complaint {complaint.complaint_id} has been assigned to {staff.full_name}.",
            notification_type=NotificationType.COMPLAINT_ASSIGNED,
            reference_id=complaint.complaint_id,
        )

        try:
            db.session.commit()
            data = complaint.to_dict(include_details=True)
            data["sla_info"] = SLAService.get_sla_info(complaint)
            return data, None, 200
        except Exception as e:
            db.session.rollback()
            return None, f"Failed to assign complaint: {str(e)}", 500

    @staticmethod
    def _resolve_complaint(complaint_id_or_num):
        identifier = str(complaint_id_or_num)
        if identifier.isdigit():
            return Complaint.query.filter(
                or_(Complaint.id == int(identifier), Complaint.complaint_id == identifier)
            ).first()
        return Complaint.query.filter_by(complaint_id=identifier).first()
