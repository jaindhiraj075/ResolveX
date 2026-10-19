from flask import jsonify

def success_response(message="Success", data=None, status_code=200):
    """Consistent API success response format."""
    payload = {
        "success": True,
        "message": message,
        "data": data if data is not None else {}
    }
    return jsonify(payload), status_code

def error_response(message="An error occurred", error=None, status_code=400):
    """Consistent API error response format."""
    payload = {
        "success": False,
        "message": message,
        "error": error if error is not None else message
    }
    return jsonify(payload), status_code
