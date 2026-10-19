import os
from datetime import timedelta
from dotenv import load_dotenv

# Load environment variables from .env file if present
load_dotenv()

class Config:
    """Base application configuration."""
    SECRET_KEY = os.getenv("SECRET_KEY", "resolvex-super-secret-default-key-change-in-prod")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "resolvex-jwt-secret-default-key-change-in-prod")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=int(os.getenv("JWT_ACCESS_TOKEN_EXPIRES_HOURS", "24")))

    # Database Configuration: MySQL or SQLite
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", "sqlite:///resolvex.db")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
        "pool_recycle": 280,
    } if "mysql" in os.getenv("DATABASE_URL", "").lower() else {}

    # Uploads Configuration & Security
    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
    MAX_CONTENT_LENGTH = int(os.getenv("MAX_CONTENT_LENGTH", str(5 * 1024 * 1024)))  # 5 MB max
    ALLOWED_EXTENSIONS = {ext.strip().lower() for ext in os.getenv("ALLOWED_EXTENSIONS", "pdf,png,jpg,jpeg,doc,docx").split(",") if ext.strip()}

    # CORS Configuration
    CORS_ORIGINS_RAW = os.getenv("CORS_ORIGINS", "*")
    CORS_ORIGINS = [origin.strip() for origin in CORS_ORIGINS_RAW.split(",") if origin.strip()]

    # AI Intelligence Configuration
    DUPLICATE_THRESHOLD = float(os.getenv("DUPLICATE_THRESHOLD", "0.65"))
    CATEGORY_CONFIDENCE_THRESHOLD = float(os.getenv("CATEGORY_CONFIDENCE_THRESHOLD", "0.50"))

    # SLA Configuration
    SLA_HIGH_HOURS = int(os.getenv("SLA_HIGH_HOURS", "24"))
    SLA_MEDIUM_HOURS = int(os.getenv("SLA_MEDIUM_HOURS", "48"))
    SLA_LOW_HOURS = int(os.getenv("SLA_LOW_HOURS", "72"))

class DevelopmentConfig(Config):
    DEBUG = True

class ProductionConfig(Config):
    DEBUG = False

class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"

def get_config():
    env = os.getenv("FLASK_ENV", "development").lower()
    if env == "production":
        return ProductionConfig
    elif env == "testing":
        return TestingConfig
    return DevelopmentConfig
