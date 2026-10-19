from flask import Blueprint
from backend.app.middleware.auth_middleware import role_required
from backend.app.models.user import RoleEnum, User
from backend.app.models.complaint import Complaint
from backend.app.models.department import Department
from backend.app.models.category import Category
from backend.app.utils.response import success_response

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")

@admin_bp.route("/overview", methods=["GET"])
@role_required(RoleEnum.ADMIN)
def admin_overview():
    total_users = User.query.count()
    total_complaints = Complaint.query.count()
    total_departments = Department.query.count()
    total_categories = Category.query.count()
    total_staff = User.query.filter_by(role=RoleEnum.STAFF).count()

    return success_response(
        message="Admin overview metrics",
        data={
            "metrics": {
                "total_users": total_users,
                "total_complaints": total_complaints,
                "total_departments": total_departments,
                "total_categories": total_categories,
                "total_staff": total_staff,
            }
        }
    )

@admin_bp.route("/users", methods=["GET"])
@role_required(RoleEnum.ADMIN)
def list_users():
    users = User.query.order_by(User.id.asc()).all()
    return success_response(
        message="Users list",
        data={"users": [u.to_dict() for u in users]}
    )

@admin_bp.route("/staff", methods=["GET"])
@role_required(RoleEnum.ADMIN)
def list_staff():
    staff_members = User.query.filter(User.role.in_([RoleEnum.STAFF, RoleEnum.ADMIN])).order_by(User.id.asc()).all()
    return success_response(
        message="Staff list",
        data={"staff": [s.to_dict() for s in staff_members]}
    )

@admin_bp.route("/departments", methods=["GET"])
@role_required(RoleEnum.ADMIN)
def list_departments():
    departments = Department.query.all()
    return success_response(
        message="Departments list",
        data={"departments": [d.to_dict() for d in departments]}
    )

@admin_bp.route("/categories", methods=["GET"])
@role_required(RoleEnum.ADMIN)
def list_categories():
    categories = Category.query.all()
    return success_response(
        message="Categories list",
        data={"categories": [c.to_dict() for c in categories]}
    )

@admin_bp.route("/complaints/<string:identifier>/assign", methods=["POST"])
@role_required(RoleEnum.ADMIN)
def assign_complaint(identifier):
    from flask import request
    from backend.app.middleware.auth_middleware import get_authenticated_user
    from backend.app.services.complaint_service import ComplaintService
    from backend.app.utils.response import error_response

    admin_user = get_authenticated_user()
    data = request.get_json() or {}
    staff_id = data.get("staff_id")
    notes = data.get("notes")

    if not staff_id:
        return error_response(message="staff_id is required", status_code=400)

    result, error, status_code = ComplaintService.assign_complaint(identifier, staff_id, admin_user, notes)
    if error:
        return error_response(message=error, status_code=status_code)

    return success_response(message="Complaint assigned successfully", data=result)

@admin_bp.route("/sla", methods=["GET"])
@role_required(RoleEnum.ADMIN)
def admin_sla_overview():
    from backend.app.services.sla_service import SLAService
    from backend.app.models.complaint import Complaint, ComplaintStatus

    # Run idempotent SLA evaluation to ensure up-to-date statuses
    SLAService.evaluate_and_escalate()

    complaints = Complaint.query.filter(
        Complaint.status.notin_([
            ComplaintStatus.RESOLVED,
            ComplaintStatus.CLOSED,
            ComplaintStatus.CLOSED_AS_DUPLICATE,
        ])
    ).all()

    on_track = 0
    due_soon = 0
    overdue = 0
    escalated_l1 = 0
    escalated_l2 = 0

    for c in complaints:
        info = SLAService.get_sla_info(c)
        st = info["sla_status"]
        lvl = info["escalation_level"]
        if st == "ON_TRACK":
            on_track += 1
        elif st == "DUE_SOON":
            due_soon += 1
        elif st == "OVERDUE":
            overdue += 1
            if lvl == 1:
                escalated_l1 += 1
            elif lvl == 2:
                escalated_l2 += 1

    return success_response(
        message="Institutional SLA metrics",
        data={
            "total_active": len(complaints),
            "on_track": on_track,
            "due_soon": due_soon,
            "overdue": overdue,
            "escalated_level_1": escalated_l1,
            "escalated_level_2": escalated_l2,
        }
    )

