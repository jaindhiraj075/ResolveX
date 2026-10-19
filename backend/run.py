import os
import sys

# Ensure root directory is on Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.app import create_app

app = create_app()

if __name__ == "__main__":
    port = int(os.getenv("BACKEND_PORT", 5000))
    host = os.getenv("BACKEND_HOST", "0.0.0.0")
    print(f"[*] Starting ResolveX Flask Backend on {host}:{port}")
    app.run(host=host, port=port, debug=os.getenv("FLASK_ENV") == "development")
