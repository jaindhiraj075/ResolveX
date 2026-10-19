import os
from datetime import datetime
from flask import Flask, jsonify
from backend.app.config.config import get_config
from backend.app.extensions import db, jwt, cors
from backend.app.routes import register_blueprints
from backend.app.utils.response import error_response

def create_app(config_class=None):
    """Application factory for ResolveX Flask API."""
    app = Flask(__name__)

    if config_class is None:
        config_class = get_config()

    app.config.from_object(config_class)

    # Initialize extensions
    db.init_app(app)
    jwt.init_app(app)

    @jwt.unauthorized_loader
    def missing_token_callback(error_string):
        return error_response(message="Missing authentication token. Please sign in.", error=error_string, status_code=401)

    @jwt.invalid_token_loader
    def invalid_token_callback(error_string):
        return error_response(message="Invalid or malformed authentication token. Please sign in again.", error=error_string, status_code=401)

    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return error_response(message="Authentication token has expired. Please sign in again.", status_code=401)

    cors.init_app(
        app,
        resources={r"/api/*": {"origins": app.config.get("CORS_ORIGINS", ["*"])}},
        supports_credentials=True,
        allow_headers=["Content-Type", "Authorization"],
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"]
    )

    # Register blueprints
    register_blueprints(app)

    # Root and health check (Section 34)
    @app.route("/api/health", methods=["GET"])
    def health_check():
        db_status = "connected"
        try:
            from sqlalchemy import text
            db.session.execute(text("SELECT 1"))
        except Exception:
            db_status = "unavailable"

        ai_status = "loaded"
        try:
            from backend.ai import AIService
            ai_status = "loaded" if AIService.is_ready() else "fallback"
        except Exception:
            ai_status = "available"

        return jsonify({
            "success": True,
            "status": "healthy",
            "service": "ResolveX Backend API",
            "version": "1.0.0",
            "database": db_status,
            "ai_engine": ai_status,
            "environment": os.getenv("FLASK_ENV", "development"),
        }), 200

    # Safe file retrieval endpoint
    @app.route("/api/uploads/<path:filename>", methods=["GET"])
    def get_uploaded_file(filename):
        from flask import send_from_directory, abort
        from werkzeug.utils import secure_filename
        # Prevent path traversal
        clean_name = os.path.basename(filename)
        upload_dir = app.config.get("UPLOAD_FOLDER", os.path.join(os.path.dirname(__file__), "..", "uploads"))
        file_path = os.path.join(upload_dir, clean_name)
        if not os.path.exists(file_path) or not os.path.isfile(file_path):
            return error_response(message="Requested file not found", status_code=404)
        return send_from_directory(upload_dir, clean_name, as_attachment=False)

    # Centralized HTTP Error Handlers
    @app.errorhandler(400)
    def bad_request_error(e):
        return error_response(message="Bad Request", error=str(e), status_code=400)

    @app.errorhandler(401)
    def unauthorized_error(e):
        return error_response(message="Unauthorized access", error=str(e), status_code=401)

    @app.errorhandler(403)
    def forbidden_error(e):
        return error_response(message="Access Forbidden", error=str(e), status_code=403)

    @app.errorhandler(404)
    def not_found_error(e):
        return error_response(message="Resource Not Found", error=str(e), status_code=404)

    @app.errorhandler(409)
    def conflict_error(e):
        return error_response(message="Resource Conflict", error=str(e), status_code=409)

    @app.errorhandler(413)
    def payload_too_large_error(e):
        return error_response(message="File upload exceeds the maximum allowed size (5 MB)", status_code=413)

    @app.errorhandler(422)
    def unprocessable_entity_error(e):
        return error_response(message="Unprocessable Entity", error=str(e), status_code=422)

    @app.errorhandler(500)
    def internal_error(e):
        return error_response(message="Internal Server Error", error="An internal server error occurred.", status_code=500)

    # Ensure tables and default seed data exist on startup
    with app.app_context():
        _initialize_database(app)

    return app

def _initialize_database(app):
    """Creates tables and populates default demo data if empty."""
    from backend.app.models import (
        User,
        Department,
        Category,
        Complaint,
        ComplaintHistory,
        ComplaintAssignment,
        Notification,
        ComplaintMessage,
        DuplicateComplaint,
        Attachment,
        Feedback
    )

    db.create_all()

    # Automatic schema migration for Phase 4 columns
    try:
        from sqlalchemy import text
        with db.engine.connect() as conn:
            existing_cols = [row[1] for row in conn.execute(text("PRAGMA table_info(complaints)")).fetchall()]
            new_columns = [
                ("ai_category", "VARCHAR(100)"),
                ("ai_category_confidence", "FLOAT DEFAULT 0.0"),
                ("ai_department", "VARCHAR(100)"),
                ("ai_department_confidence", "FLOAT DEFAULT 0.0"),
                ("ai_priority", "VARCHAR(20)"),
                ("ai_priority_confidence", "FLOAT DEFAULT 0.0"),
                ("duplicate_score", "FLOAT DEFAULT 0.0"),
                ("is_duplicate", "BOOLEAN DEFAULT 0"),
                ("original_complaint_id", "INTEGER"),
                ("final_category", "VARCHAR(100)"),
                ("final_department", "VARCHAR(100)"),
                ("final_priority", "VARCHAR(20)"),
                ("is_overridden", "BOOLEAN DEFAULT 0"),
                ("escalation_level", "INTEGER DEFAULT 0"),
                ("sla_due_soon_notified", "BOOLEAN DEFAULT 0"),
                ("sla_overdue_notified", "BOOLEAN DEFAULT 0"),
                ("sla_escalated_level", "INTEGER DEFAULT 0"),
                ("reopened_count", "INTEGER DEFAULT 0"),
                ("reopen_reason", "TEXT"),
                ("ai_summary", "TEXT"),
                ("ai_explanation", "TEXT"),
                ("ai_factors", "TEXT"),
                ("ai_human_review", "BOOLEAN DEFAULT 0"),
                ("location", "VARCHAR(150)"),
            ]
            for col_name, col_def in new_columns:
                if col_name not in existing_cols:
                    conn.execute(text(f"ALTER TABLE complaints ADD COLUMN {col_name} {col_def}"))

            notif_cols = [row[1] for row in conn.execute(text("PRAGMA table_info(notifications)")).fetchall()]
            if "complaint_id" not in notif_cols:
                conn.execute(text("ALTER TABLE notifications ADD COLUMN complaint_id INTEGER"))

            conn.commit()
    except Exception as e:
        print(f"Migration notice: {e}")

    # Seed Departments if empty
    if Department.query.count() == 0:
        d1 = Department(id=1, name="IT / Network", code="IT_NET", description="Campus IT infrastructure, Wi-Fi networks, and software services")
        d2 = Department(id=2, name="Hostel Administration", code="HOSTEL", description="Hostel accommodations, room maintenance, water, and mess")
        d3 = Department(id=3, name="Campus Maintenance", code="MAINT", description="Electrical, plumbing, civil infrastructure, and facility maintenance")
        d4 = Department(id=4, name="CSE Lab", code="CSE_LAB", description="Computer Science laboratories, hardware, and equipment")
        db.session.add_all([d1, d2, d3, d4])
        db.session.commit()

    # Seed Categories if empty
    if Category.query.count() == 0:
        c1 = Category(id=1, name="Wi-Fi & Internet", department_id=1, description="Connectivity, slow speed, and router issues")
        c2 = Category(id=2, name="Hostel & Living", department_id=2, description="Room allocation, water supply, and cleanliness")
        c3 = Category(id=3, name="Campus Infrastructure", department_id=3, description="Electrical points, AC, doors, and plumbing")
        c4 = Category(id=4, name="Lab & Equipment", department_id=4, description="Lab computers, projectors, and hardware")
        db.session.add_all([c1, c2, c3, c4])
        db.session.commit()

    # Seed or ensure Demo Users exist and are active with matching passwords
    demo_users = [
        {
            "email": "admin@resolvex.edu",
            "password": "Admin@123",
            "full_name": "Demo Administrator",
            "role": "ADMIN",
            "department_id": None,
            "phone": "+1-555-0100",
            "student_id_number": None,
        },
        {
            "email": "staff@resolvex.edu",
            "password": "Staff@123",
            "full_name": "Demo Staff Member",
            "role": "STAFF",
            "department_id": 1,
            "phone": "+1-555-0101",
            "student_id_number": None,
        },
        {
            "email": "student@resolvex.edu",
            "password": "Student@123",
            "full_name": "Demo Student",
            "role": "STUDENT",
            "department_id": None,
            "phone": "+1-555-0102",
            "student_id_number": "STU-2024-8891",
        },
    ]

    for d_user in demo_users:
        user_record = User.query.filter_by(email=d_user["email"]).first()
        if not user_record:
            user_record = User(
                full_name=d_user["full_name"],
                email=d_user["email"],
                role=d_user["role"],
                department_id=d_user["department_id"],
                phone=d_user["phone"],
                student_id_number=d_user["student_id_number"],
                is_active=True
            )
            user_record.set_password(d_user["password"])
            db.session.add(user_record)
            db.session.commit()
        else:
            needs_update = False
            if not user_record.is_active:
                user_record.is_active = True
                needs_update = True
            if user_record.role != d_user["role"]:
                user_record.role = d_user["role"]
                needs_update = True
            if not user_record.check_password(d_user["password"]):
                user_record.set_password(d_user["password"])
                needs_update = True
            if needs_update:
                db.session.commit()

    # Seed Demo Complaints if empty (Section 22)
    if Complaint.query.count() == 0:
        student = User.query.filter_by(role="STUDENT").first()
        staff = User.query.filter_by(role="STAFF").first()
        admin = User.query.filter_by(role="ADMIN").first()

        if student and staff and admin:
            # 1. Assigned High Priority Wi-Fi complaint
            c1 = Complaint(
                complaint_id="RX-2026-000001",
                student_id=student.id,
                title="Wi-Fi not working in Hostel Block A",
                description="Unable to connect to eduroam / campus Wi-Fi from 3rd floor rooms in Hostel Block A since yesterday evening.",
                category_id=1,
                department_id=1,
                priority="HIGH",
                status="ASSIGNED",
                created_at=datetime.utcnow(),
            )
            db.session.add(c1)
            db.session.flush()

            h1 = ComplaintHistory(
                complaint_id=c1.id,
                action="Complaint Submitted",
                from_status=None,
                to_status="PENDING",
                performed_by_id=student.id,
                notes="Filed via student portal."
            )
            asgn1 = ComplaintAssignment(
                complaint_id=c1.id,
                staff_id=staff.id,
                assigned_by_id=admin.id,
                is_active=True,
                notes="Assigned to IT network team lead."
            )
            h1_2 = ComplaintHistory(
                complaint_id=c1.id,
                action="Staff Assigned",
                from_status="PENDING",
                to_status="ASSIGNED",
                performed_by_id=admin.id,
                notes=f"Assigned to {staff.full_name}"
            )
            db.session.add_all([h1, asgn1, h1_2])

            # 2. Pending Medium Infrastructure complaint
            c2 = Complaint(
                complaint_id="RX-2026-000002",
                student_id=student.id,
                title="AC not functioning in Room 204",
                description="The split AC unit in Room 204 is blowing warm air and making a vibrating noise.",
                category_id=3,
                department_id=3,
                priority="MEDIUM",
                status="PENDING",
                created_at=datetime.utcnow(),
            )
            db.session.add(c2)
            db.session.flush()

            h2 = ComplaintHistory(
                complaint_id=c2.id,
                action="Complaint Submitted",
                from_status=None,
                to_status="PENDING",
                performed_by_id=student.id,
                notes="Filed via student portal."
            )
            db.session.add(h2)

            # 3. Resolved Low Lab complaint
            c3 = Complaint(
                complaint_id="RX-2026-000003",
                student_id=student.id,
                title="Computer not starting in Lab 2",
                description="Workstation #14 in CSE Lab 2 does not power on after the weekend maintenance.",
                category_id=4,
                department_id=4,
                priority="LOW",
                status="RESOLVED",
                resolved_at=datetime.utcnow(),
                created_at=datetime.utcnow(),
            )
            db.session.add(c3)
            db.session.flush()

            h3_1 = ComplaintHistory(
                complaint_id=c3.id,
                action="Complaint Submitted",
                from_status=None,
                to_status="PENDING",
                performed_by_id=student.id,
                notes="Filed via student portal."
            )
            h3_2 = ComplaintHistory(
                complaint_id=c3.id,
                action="Complaint Resolved",
                from_status="IN_PROGRESS",
                to_status="RESOLVED",
                performed_by_id=staff.id,
                notes="Replaced power supply unit (PSU). Workstation tested and working."
            )
            db.session.add_all([h3_1, h3_2])

            db.session.commit()
