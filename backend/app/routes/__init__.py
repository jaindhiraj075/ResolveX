from .auth_routes import auth_bp
from .complaint_routes import complaint_bp, ai_bp
from .staff_routes import staff_bp
from .admin_routes import admin_bp
from .notification_routes import notification_bp
from .analytics_routes import analytics_bp, staff_perf_bp

def register_blueprints(app):
    app.register_blueprint(auth_bp)
    app.register_blueprint(complaint_bp)
    app.register_blueprint(ai_bp)
    app.register_blueprint(staff_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(notification_bp)
    app.register_blueprint(analytics_bp)
    app.register_blueprint(staff_perf_bp)

