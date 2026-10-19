from flask import Blueprint, request
from backend.app.middleware.auth_middleware import role_required, get_authenticated_user
from backend.app.models.user import RoleEnum
from backend.app.models.complaint import Complaint, ComplaintStatus
from backend.app.models.assignment import ComplaintAssignment
from backend.app.services.complaint_service import ComplaintService
from backend.app.utils.response import success_response, error_response
from backend.app.extensions import db

from sqlalchemy import or_

staff_bp = Blueprint("staff", __name__, url_prefix="/api/staff")

@staff_bp.route("/dashboard-summary", methods=["GET"])
@role_required(RoleEnum.STAFF, RoleEnum.ADMIN)
def staff_dashboard_summary():
    user = get_authenticated_user()
    if not user:
        return error_response(message="Authenticated user not found", status_code=401)

    dept_id = user.department_id

    if user.role == RoleEnum.ADMIN:
        # Campus-wide statistics for administrative authorized queries
        active_q = Complaint.query
    else:
        # Active assignments specifically assigned to this staff member OR in their department queue
        active_assigned_ids = db.session.query(ComplaintAssignment.complaint_id).filter(
            ComplaintAssignment.staff_id == user.id,
            ComplaintAssignment.is_active == True
        ).distinct()

        if user.department_id:
            active_q = Complaint.query.filter(
                or_(
                    Complaint.id.in_(active_assigned_ids),
                    Complaint.department_id == user.department_id
                )
            )
        else:
            active_q = Complaint.query.filter(Complaint.id.in_(active_assigned_ids))

    total = active_q.count()
    pending = active_q.filter(Complaint.status == ComplaintStatus.PENDING).count()
    assigned = active_q.filter(Complaint.status.in_([ComplaintStatus.ASSIGNED, ComplaintStatus.PENDING])).count()
    in_progress = active_q.filter(Complaint.status.in_([
        ComplaintStatus.IN_PROGRESS,
        ComplaintStatus.INFORMATION_REQUIRED,
        ComplaintStatus.REOPENED,
        ComplaintStatus.PROCESSING
    ])).count()
    resolved = active_q.filter(Complaint.status.in_([ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED])).count()

    return success_response(
        message="Staff dashboard summary",
        data={
            "department_id": dept_id,
            "department_name": user.department.name if user.department else "All Departments",
            "stats": {
                "total": total,
                "assigned": total,
                "pending": pending,
                "in_progress": in_progress,
                "resolved": resolved
            }
        }
    )

@staff_bp.route("/complaints", methods=["GET"])
@role_required(RoleEnum.STAFF, RoleEnum.ADMIN)
def list_assigned_complaints():
    user = get_authenticated_user()
    filters = {
        "search": request.args.get("search"),
        "status": request.args.get("status"),
        "priority": request.args.get("priority"),
    }
    complaints = ComplaintService.get_complaints(user, filters)
    return success_response(
        message="Assigned complaints retrieved",
        data={"complaints": complaints, "count": len(complaints)}
    )

@staff_bp.route("/complaints/<string:identifier>/status", methods=["PUT"])
@role_required(RoleEnum.STAFF, RoleEnum.ADMIN)
def update_complaint_status(identifier):
    user = get_authenticated_user()
    data = request.get_json() or {}
    new_status = data.get("status")
    notes = data.get("notes")

    if not new_status:
        return error_response(message="New status is required", status_code=400)

    result, error, status_code = ComplaintService.update_status(identifier, new_status, user, notes)
    if error:
        return error_response(message=error, status_code=status_code)

    return success_response(message="Complaint status updated", data=result)

@staff_bp.route("/complaints/<string:identifier>/request-info", methods=["POST"])
@role_required(RoleEnum.STAFF, RoleEnum.ADMIN)
def request_info(identifier):
    user = get_authenticated_user()
    data = request.get_json() or {}
    message = data.get("message")

    result, error, status_code = ComplaintService.request_information(identifier, user, message)
    if error:
        return error_response(message=error, status_code=status_code)

    return success_response(message="Information request sent", data=result)

@staff_bp.route("/complaints/<string:identifier>/resolve", methods=["POST"])
@role_required(RoleEnum.STAFF, RoleEnum.ADMIN)
def resolve_complaint(identifier):
    user = get_authenticated_user()
    data = request.get_json() or {}
    summary = data.get("resolution_summary")
    details = data.get("resolution_details")

    result, error, status_code = ComplaintService.resolve_complaint(identifier, user, summary, details)
    if error:
        return error_response(message=error, status_code=status_code)

    return success_response(message="Complaint marked as resolved", data=result)

@staff_bp.route("/sla", methods=["GET"])
@role_required(RoleEnum.STAFF, RoleEnum.ADMIN)
def staff_sla_overview():
    from backend.app.services.sla_service import SLAService
    from backend.app.models.complaint import ComplaintStatus

    SLAService.evaluate_and_escalate()
    user = get_authenticated_user()

    # Get complaints for this staff member or their department
    complaints = ComplaintService.get_complaints(user, {"status": "ALL"})
    active_complaints = [c for c in complaints if c.get("status") not in [
        ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED, ComplaintStatus.CLOSED_AS_DUPLICATE
    ]]

    on_track = sum(1 for c in active_complaints if c.get("sla_status") == "ON_TRACK")
    due_soon = sum(1 for c in active_complaints if c.get("sla_status") == "DUE_SOON")
    overdue = sum(1 for c in active_complaints if c.get("sla_status") == "OVERDUE")

    return success_response(
        message="Staff SLA metrics",
        data={
            "total_active": len(active_complaints),
            "on_track": on_track,
            "due_soon": due_soon,
            "overdue": overdue,
        }
    )

