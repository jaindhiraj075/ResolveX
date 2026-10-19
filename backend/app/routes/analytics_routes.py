from datetime import datetime
from flask import Blueprint, request, Response
from backend.app.middleware.auth_middleware import role_required
from backend.app.models.user import RoleEnum
from backend.app.services.analytics_service import AnalyticsService
from backend.app.utils.response import success_response, error_response

analytics_bp = Blueprint("admin_analytics", __name__, url_prefix="/api/admin/analytics")

@analytics_bp.route("/overview", methods=["GET"])
@role_required(RoleEnum.ADMIN)
def get_overview():
    filters = AnalyticsService.parse_filters(request.args)
    data = AnalyticsService.get_overview(filters)
    return success_response(message="Overview metrics retrieved", data=data)

@analytics_bp.route("/trends", methods=["GET"])
@role_required(RoleEnum.ADMIN)
def get_trends():
    filters = AnalyticsService.parse_filters(request.args)
    group_by = request.args.get("group_by", "day").lower()
    data = AnalyticsService.get_trends(filters, group_by=group_by)
    return success_response(message="Complaint trends retrieved", data={"trends": data})

@analytics_bp.route("/status", methods=["GET"])
@role_required(RoleEnum.ADMIN)
def get_status_distribution():
    filters = AnalyticsService.parse_filters(request.args)
    data = AnalyticsService.get_status_distribution(filters)
    return success_response(message="Status distribution retrieved", data={"distribution": data})

@analytics_bp.route("/categories", methods=["GET"])
@role_required(RoleEnum.ADMIN)
def get_category_analytics():
    filters = AnalyticsService.parse_filters(request.args)
    data = AnalyticsService.get_category_analytics(filters)
    return success_response(message="Category analytics retrieved", data={"categories": data})

@analytics_bp.route("/departments", methods=["GET"])
@role_required(RoleEnum.ADMIN)
def get_department_analytics():
    filters = AnalyticsService.parse_filters(request.args)
    data = AnalyticsService.get_department_analytics(filters)
    return success_response(message="Department analytics retrieved", data={"departments": data})

@analytics_bp.route("/priorities", methods=["GET"])
@role_required(RoleEnum.ADMIN)
def get_priority_analytics():
    filters = AnalyticsService.parse_filters(request.args)
    data = AnalyticsService.get_priority_analytics(filters)
    return success_response(message="Priority analytics retrieved", data={"priorities": data})

@analytics_bp.route("/sla", methods=["GET"])
@role_required(RoleEnum.ADMIN)
def get_sla_analytics():
    filters = AnalyticsService.parse_filters(request.args)
    data = AnalyticsService.get_sla_analytics(filters)
    return success_response(message="SLA analytics retrieved", data=data)

@analytics_bp.route("/resolution", methods=["GET"])
@role_required(RoleEnum.ADMIN)
def get_resolution_analytics():
    filters = AnalyticsService.parse_filters(request.args)
    data = AnalyticsService.get_resolution_analytics(filters)
    return success_response(message="Resolution analytics retrieved", data=data)

@analytics_bp.route("/staff", methods=["GET"])
@role_required(RoleEnum.ADMIN)
def get_staff_workload():
    filters = AnalyticsService.parse_filters(request.args)
    data = AnalyticsService.get_staff_workload(filters)
    return success_response(message="Staff workload retrieved", data={"staff": data})

@analytics_bp.route("/feedback", methods=["GET"])
@role_required(RoleEnum.ADMIN)
def get_feedback_analytics():
    filters = AnalyticsService.parse_filters(request.args)
    data = AnalyticsService.get_feedback_analytics(filters)
    return success_response(message="Feedback analytics retrieved", data=data)

@analytics_bp.route("/ai", methods=["GET"])
@role_required(RoleEnum.ADMIN)
def get_ai_analytics():
    filters = AnalyticsService.parse_filters(request.args)
    data = AnalyticsService.get_ai_analytics(filters)
    return success_response(message="AI operational analytics retrieved", data=data)

@analytics_bp.route("/recurring-issues", methods=["GET"])
@role_required(RoleEnum.ADMIN)
def get_recurring_issues_analytics():
    """Returns recurring issue geographic and departmental clusters for administrative review."""
    from backend.app.models.complaint import Complaint, ComplaintStatus
    from backend.ai import AIService
    complaints = Complaint.query.filter(
        Complaint.status != ComplaintStatus.CLOSED_AS_DUPLICATE
    ).order_by(Complaint.created_at.desc()).limit(200).all()

    clusters = AIService.analyze_recurring_issues(complaints)
    return success_response(
        message="Recurring issue clusters retrieved",
        data={"clusters": clusters, "count": len(clusters)}
    )

@analytics_bp.route("/export", methods=["GET"])
@role_required(RoleEnum.ADMIN)
def export_csv():
    filters = AnalyticsService.parse_filters(request.args)
    csv_content = AnalyticsService.export_csv(filters)
    filename = f"resolvex_complaints_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
    return Response(
        csv_content,
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

# Staff performance detail route
staff_perf_bp = Blueprint("admin_staff_perf", __name__, url_prefix="/api/admin/staff")

@staff_perf_bp.route("/<int:staff_id>/performance", methods=["GET"])
@role_required(RoleEnum.ADMIN)
def get_staff_performance(staff_id):
    data = AnalyticsService.get_staff_performance_detail(staff_id)
    if not data:
        return error_response(message="Staff member not found", status_code=404)
    return success_response(message="Staff performance detail retrieved", data=data)
