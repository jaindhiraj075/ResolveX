from datetime import datetime
from sqlalchemy import func

def generate_complaint_id(db_session, ComplaintModel):
    """
    Generates sequential, human-readable complaint IDs in format: RX-YYYY-000001
    Example: RX-2026-000001, RX-2026-000002
    """
    current_year = datetime.utcnow().year
    prefix = f"RX-{current_year}-"

    count = db_session.query(func.count(ComplaintModel.id)).filter(
        ComplaintModel.complaint_id.like(f"{prefix}%")
    ).scalar() or 0

    next_num = count + 1
    candidate_id = f"{prefix}{next_num:06d}"

    # Verify candidate is unique
    existing = db_session.query(ComplaintModel).filter_by(complaint_id=candidate_id).first()
    while existing:
        next_num += 1
        candidate_id = f"{prefix}{next_num:06d}"
        existing = db_session.query(ComplaintModel).filter_by(complaint_id=candidate_id).first()

    return candidate_id
