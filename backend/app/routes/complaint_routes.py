from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from backend.app.services.complaint_service import ComplaintService
from backend.app.services.sla_service import SLAService
from backend.app.models.user import User, RoleEnum
from backend.app.models.department import Department
from backend.app.models.category import Category
from backend.app.models.complaint import Complaint, ComplaintStatus
from backend.app.models.feedback import Feedback
from backend.app.utils.response import success_response, error_response
from backend.app.extensions import db
from backend.ai import AIService

complaint_bp = Blueprint("complaints", __name__, url_prefix="/api/complaints")

@complaint_bp.route("/meta/options", methods=["GET"])
@jwt_required()
def get_complaint_options():
    departments = Department.query.order_by(Department.id.asc()).all()
    categories = Category.query.order_by(Category.id.asc()).all()

    return success_response(
        message="Options retrieved",
        data={
            "departments": [d.to_dict() for d in departments],
            "categories": [c.to_dict() for c in categories],
        }
    )

@complaint_bp.route("/upload", methods=["POST"])
@jwt_required()
def upload_attachment():
    """Secure file upload endpoint with MIME, extension and size validation (Phase 7 Section 8)."""
    identity = get_jwt_identity()
    user_id = int(identity) if identity else None
    user = db.session.get(User, user_id) if user_id else None

    if not user:
        return error_response(message="Authenticated user not found", status_code=401)

    if "file" not in request.files:
        return error_response(message="No file uploaded in request", status_code=400)

    file = request.files["file"]
    if not file or file.filename == "":
        return error_response(message="No file selected", status_code=400)

    from werkzeug.utils import secure_filename
    import os
    import uuid
    from flask import current_app

    raw_filename = secure_filename(file.filename)
    if not raw_filename or "." not in raw_filename:
        return error_response(message="Invalid file name or missing extension", status_code=400)

    ext = raw_filename.rsplit(".", 1)[-1].lower()
    allowed_exts = current_app.config.get("ALLOWED_EXTENSIONS", {"pdf", "png", "jpg", "jpeg", "doc", "docx"})
    disallowed_exts = {"exe", "sh", "bat", "php", "py", "js", "html", "htm", "vbs", "cmd", "ps1", "bin", "dll"}

    if ext in disallowed_exts or ext not in allowed_exts:
        return error_response(
            message=f"File extension '.{ext}' is not permitted. Allowed: {', '.join(sorted(allowed_exts))}",
            status_code=400
        )

    # Validate file size
    file.seek(0, os.SEEK_END)
    file_size = file.tell()
    file.seek(0)

    max_size = current_app.config.get("MAX_CONTENT_LENGTH", 5 * 1024 * 1024)
    if file_size > max_size:
        return error_response(message=f"File size exceeds maximum limit of {max_size // (1024*1024)} MB", status_code=413)

    # Generate safe random filename to prevent collisions and path traversal
    safe_name = f"{uuid.uuid4().hex[:12]}_{raw_filename}"
    upload_dir = current_app.config.get("UPLOAD_FOLDER", os.path.join(os.path.dirname(__file__), "..", "..", "uploads"))
    os.makedirs(upload_dir, exist_ok=True)
    destination = os.path.join(upload_dir, safe_name)
    file.save(destination)

    return success_response(
        message="File uploaded successfully",
        data={
            "file_name": raw_filename,
            "stored_name": safe_name,
            "file_path": f"/api/uploads/{safe_name}",
            "file_size": file_size,
            "file_type": file.mimetype or "application/octet-stream",
        },
        status_code=201
    )

@complaint_bp.route("", methods=["POST"])
@jwt_required()
def create_complaint():
    identity = get_jwt_identity()
    user_id = int(identity) if identity else None
    user = db.session.get(User, user_id) if user_id else None

    if not user:
        return error_response(message="Authenticated user not found", status_code=401)

    data = request.get_json() or {}
    result, error, status_code = ComplaintService.create_complaint(user.id, data)
    if error:
        return error_response(message=error, status_code=status_code)

    return success_response(
        message="Complaint submitted successfully",
        data=result,
        status_code=status_code
    )

@complaint_bp.route("", methods=["GET"])
@jwt_required()
def list_complaints():
    identity = get_jwt_identity()
    user_id = int(identity) if identity else None
    user = db.session.get(User, user_id) if user_id else None

    if not user:
        return error_response(message="Authenticated user not found", status_code=401)

    filters = {
        "search": request.args.get("search"),
        "status": request.args.get("status"),
        "priority": request.args.get("priority"),
        "category_id": request.args.get("category_id"),
        "department_id": request.args.get("department_id"),
        "sla_status": request.args.get("sla_status"),
    }

    complaints = ComplaintService.get_complaints(user, filters)
    return success_response(
        message="Complaints retrieved",
        data={"complaints": complaints, "count": len(complaints)}
    )

@complaint_bp.route("/<string:identifier>", methods=["GET"])
@jwt_required()
def get_complaint_detail(identifier):
    identity = get_jwt_identity()
    user_id = int(identity) if identity else None
    user = db.session.get(User, user_id) if user_id else None

    if not user:
        return error_response(message="Authenticated user not found", status_code=401)

    complaint, error, status_code = ComplaintService.get_complaint_by_id(user, identifier)
    if error:
        return error_response(message=error, status_code=status_code)

    return success_response(message="Complaint details", data={"complaint": complaint})

@complaint_bp.route("/<string:identifier>/sla", methods=["GET"])
@jwt_required()
def get_complaint_sla(identifier):
    """Returns SLA status and remaining time for a complaint (Section 5)."""
    identity = get_jwt_identity()
    user_id = int(identity) if identity else None
    user = db.session.get(User, user_id) if user_id else None

    if not user:
        return error_response(message="Authenticated user not found", status_code=401)

    complaint = ComplaintService._resolve_complaint(identifier)
    if not complaint:
        return error_response(message="Complaint not found", status_code=404)

    # RBAC authorization check
    if user.role == RoleEnum.STUDENT and complaint.student_id != user.id:
        return error_response(message="Access denied: You can only view SLA for your own complaints", status_code=403)
    elif user.role == RoleEnum.STAFF:
        is_assigned = any(a.staff_id == user.id and a.is_active for a in complaint.assignments)
        is_dept_member = user.department_id and complaint.department_id == user.department_id
        if not (is_assigned or is_dept_member):
            return error_response(message="Access denied: Complaint is not assigned to your department", status_code=403)

    sla_info = SLAService.get_sla_info(complaint)
    return success_response(message="SLA status retrieved", data=sla_info)

@complaint_bp.route("/<string:identifier>/reopen", methods=["POST"])
@jwt_required()
def reopen_complaint(identifier):
    """Student reopens a resolved complaint (Section 23 & 24)."""
    identity = get_jwt_identity()
    user_id = int(identity) if identity else None
    user = db.session.get(User, user_id) if user_id else None

    if not user:
        return error_response(message="Authenticated user not found", status_code=401)

    data = request.get_json() or {}
    reason = data.get("reason")

    result, error, status_code = ComplaintService.reopen_complaint(identifier, user, reason)
    if error:
        return error_response(message=error, status_code=status_code)

    return success_response(message="Complaint reopened successfully. New SLA cycle started.", data=result)

@complaint_bp.route("/<string:identifier>/feedback", methods=["POST"])
@jwt_required()
def submit_feedback(identifier):
    """Student submits 1-5 star resolution feedback (Section 19)."""
    identity = get_jwt_identity()
    user_id = int(identity) if identity else None
    user = db.session.get(User, user_id) if user_id else None

    if not user:
        return error_response(message="Authenticated user not found", status_code=401)

    data = request.get_json() or {}
    rating = data.get("rating")
    comments = data.get("comments") or data.get("comment")

    result, error, status_code = ComplaintService.submit_feedback(identifier, user, rating, comments)
    if error:
        return error_response(message=error, status_code=status_code)

    return success_response(message="Feedback submitted successfully. Thank you!", data=result, status_code=201)

@complaint_bp.route("/<string:identifier>/feedback", methods=["GET"])
@jwt_required()
def get_feedback(identifier):
    complaint = ComplaintService._resolve_complaint(identifier)
    if not complaint:
        return error_response(message="Complaint not found", status_code=404)

    feedback = Feedback.query.filter_by(complaint_id=complaint.id).first()
    return success_response(
        message="Feedback details",
        data={"feedback": feedback.to_dict() if feedback else None}
    )

@complaint_bp.route("/<string:identifier>/feedback", methods=["PUT"])
@jwt_required()
def update_feedback(identifier):
    identity = get_jwt_identity()
    user_id = int(identity) if identity else None
    user = db.session.get(User, user_id) if user_id else None

    if not user:
        return error_response(message="Authenticated user not found", status_code=401)

    data = request.get_json() or {}
    rating = data.get("rating")
    comments = data.get("comments") or data.get("comment")

    result, error, status_code = ComplaintService.update_feedback(identifier, user, rating, comments)
    if error:
        return error_response(message=error, status_code=status_code)

    return success_response(message="Feedback updated successfully", data=result)

@complaint_bp.route("/<string:identifier>/respond-info", methods=["POST"])
@jwt_required()
def respond_information(identifier):
    identity = get_jwt_identity()
    user_id = int(identity) if identity else None
    user = db.session.get(User, user_id) if user_id else None

    if not user:
        return error_response(message="Authenticated user not found", status_code=401)

    data = request.get_json() or {}
    message = data.get("message")

    result, error, status_code = ComplaintService.respond_information(identifier, user, message)
    if error:
        return error_response(message=error, status_code=status_code)

    return success_response(message="Response submitted successfully", data=result)

@complaint_bp.route("/<string:identifier>/override", methods=["POST"])
@jwt_required()
def override_classification(identifier):
    identity = get_jwt_identity()
    user_id = int(identity) if identity else None
    user = db.session.get(User, user_id) if user_id else None

    if not user or user.role not in [RoleEnum.STAFF, RoleEnum.ADMIN]:
        return error_response(message="Access denied: Only Staff or Admin can override AI classification", status_code=403)

    data = request.get_json() or {}
    result, error, status_code = ComplaintService.override_ai(identifier, user, data)
    if error:
        return error_response(message=error, status_code=status_code)

    return success_response(message="AI classification recommendation overridden successfully", data=result)

# Dedicated AI Analysis Blueprint Route
ai_bp = Blueprint("ai", __name__, url_prefix="/api/ai")

@ai_bp.route("/analyze", methods=["POST"])
@jwt_required()
def analyze_complaint():
    data = request.get_json() or {}
    title = (data.get("title") or "").strip()
    description = (data.get("description") or "").strip()

    if not title:
        return error_response(message="Title is required for AI analysis", status_code=400)

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

    analysis = AIService.analyze(
        title=title,
        description=description,
        existing_complaints=candidate_complaints,
    )

    return success_response(
        message="AI analysis complete",
        data={
            "category": analysis["category"],
            "category_confidence": analysis["category_confidence"],
            "department": analysis["department"],
            "department_id": analysis["department_id"],
            "department_confidence": analysis["department_confidence"],
            "priority": analysis["priority"],
            "priority_confidence": analysis["priority_confidence"],
            "explanation": analysis.get("explanation"),
            "factors": analysis.get("factors", []),
            "summary": analysis.get("summary"),
            "location": analysis.get("location"),
            "disruption_level": analysis.get("disruption_level"),
            "human_review_required": analysis.get("human_review_required", False),
            "duplicate": analysis["is_duplicate"],
            "is_potential_duplicate": analysis.get("is_potential_duplicate", False),
            "duplicate_confidence": analysis["duplicate_similarity"],
            "duplicate_reason": analysis.get("duplicate_reason"),
            "original_complaint_id": analysis["original_complaint_id"],
            "original_complaint_readable_id": analysis["original_complaint_readable_id"],
            "original_title": analysis.get("original_title"),
            "is_low_confidence": analysis["is_low_confidence"],
            "clarification_questions": analysis.get("clarification_questions", []),
            "is_out_of_taxonomy": analysis.get("is_out_of_taxonomy", False),
            "routing_reason": analysis.get("routing_reason"),
        }
    )

@ai_bp.route("/recurring-issues", methods=["GET"])
@jwt_required()
def get_recurring_issues():
    """Identifies recurring complaint clusters by category, department, and campus location (Phase 9 Section 5)."""
    identity = get_jwt_identity()
    user_id = int(identity) if identity else None
    user = db.session.get(User, user_id) if user_id else None

    if not user or user.role not in [RoleEnum.STAFF, RoleEnum.ADMIN]:
        return error_response(message="Access denied: Only Staff and Admin can view recurring issue clusters", status_code=403)

    complaints = Complaint.query.filter(
        Complaint.status != ComplaintStatus.CLOSED_AS_DUPLICATE
    ).order_by(Complaint.created_at.desc()).limit(200).all()

    clusters = AIService.analyze_recurring_issues(complaints)
    return success_response(
        message="Recurring issue intelligence retrieved",
        data={"clusters": clusters, "count": len(clusters)}
    )
