import csv
import io
from datetime import datetime, timedelta
from sqlalchemy import func, or_, and_, case
from backend.app.extensions import db
from backend.app.models.complaint import Complaint, ComplaintStatus, ComplaintPriority
from backend.app.models.assignment import ComplaintAssignment
from backend.app.models.feedback import Feedback
from backend.app.models.user import User, RoleEnum
from backend.app.models.department import Department
from backend.app.models.category import Category
from backend.app.services.sla_service import SLAService

class AnalyticsService:
    """Enterprise management intelligence and analytics computation service (Phase 6)."""

    @classmethod
    def parse_filters(cls, args: dict) -> dict:
        filters = {}

        # Date range
        start_date_str = args.get("start_date")
        end_date_str = args.get("end_date")

        now = datetime.utcnow()
        range_preset = args.get("range", "").lower()

        if range_preset == "today":
            filters["start_date"] = datetime(now.year, now.month, now.day)
            filters["end_date"] = now
        elif range_preset == "7d" or range_preset == "last_7_days":
            filters["start_date"] = now - timedelta(days=7)
            filters["end_date"] = now
        elif range_preset == "30d" or range_preset == "last_30_days":
            filters["start_date"] = now - timedelta(days=30)
            filters["end_date"] = now
        elif range_preset == "90d" or range_preset == "last_90_days":
            filters["start_date"] = now - timedelta(days=90)
            filters["end_date"] = now
        elif range_preset == "year" or range_preset == "this_year":
            filters["start_date"] = datetime(now.year, 1, 1)
            filters["end_date"] = now
        else:
            if start_date_str:
                try:
                    filters["start_date"] = datetime.fromisoformat(start_date_str.replace("Z", "+00:00").split("+")[0])
                except Exception:
                    try:
                        filters["start_date"] = datetime.strptime(start_date_str[:10], "%Y-%m-%d")
                    except Exception:
                        pass

            if end_date_str:
                try:
                    ed = datetime.fromisoformat(end_date_str.replace("Z", "+00:00").split("+")[0])
                    # If just date, set to end of day
                    if len(end_date_str) <= 10:
                        ed = datetime(ed.year, ed.month, ed.day, 23, 59, 59)
                    filters["end_date"] = ed
                except Exception:
                    try:
                        ed = datetime.strptime(end_date_str[:10], "%Y-%m-%d")
                        filters["end_date"] = datetime(ed.year, ed.month, ed.day, 23, 59, 59)
                    except Exception:
                        pass

        # Department filter
        dept_id = args.get("department_id")
        if dept_id and str(dept_id).upper() != "ALL":
            try:
                filters["department_id"] = int(dept_id)
            except ValueError:
                pass

        # Category filter
        cat_id = args.get("category_id")
        if cat_id and str(cat_id).upper() != "ALL":
            try:
                filters["category_id"] = int(cat_id)
            except ValueError:
                pass

        # Priority filter
        priority = args.get("priority")
        if priority and priority.upper() != "ALL":
            filters["priority"] = priority.upper()

        # Status filter
        status = args.get("status")
        if status and status.upper() != "ALL":
            filters["status"] = status.upper()

        return filters

    @classmethod
    def apply_filters(cls, query, filters: dict, date_col=Complaint.created_at):
        if "start_date" in filters and filters["start_date"]:
            query = query.filter(date_col >= filters["start_date"])
        if "end_date" in filters and filters["end_date"]:
            query = query.filter(date_col <= filters["end_date"])
        if "department_id" in filters:
            query = query.filter(Complaint.department_id == filters["department_id"])
        if "category_id" in filters:
            query = query.filter(Complaint.category_id == filters["category_id"])
        if "priority" in filters:
            query = query.filter(Complaint.priority == filters["priority"])
        if "status" in filters:
            query = query.filter(Complaint.status == filters["status"])
        return query

    @classmethod
    def get_overview(cls, filters: dict) -> dict:
        now = datetime.utcnow()
        base_q = cls.apply_filters(Complaint.query, filters)
        complaints = base_q.all()

        total = len(complaints)
        pending = sum(1 for c in complaints if c.status == ComplaintStatus.PENDING)
        in_progress = sum(1 for c in complaints if c.status in [
            ComplaintStatus.IN_PROGRESS, ComplaintStatus.ASSIGNED,
            ComplaintStatus.INFORMATION_REQUIRED, ComplaintStatus.REOPENED
        ])
        resolved = sum(1 for c in complaints if c.status == ComplaintStatus.RESOLVED)
        closed = sum(1 for c in complaints if c.status in [
            ComplaintStatus.CLOSED, ComplaintStatus.CLOSED_AS_DUPLICATE
        ])

        # Overdue count
        overdue = sum(1 for c in complaints if c.status not in [
            ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED, ComplaintStatus.CLOSED_AS_DUPLICATE
        ] and c.sla_due_at and c.sla_due_at < now)

        # SLA Compliance for resolved
        resolved_complaints = [c for c in complaints if c.status == ComplaintStatus.RESOLVED and c.resolved_at]
        resolved_count = len(resolved_complaints)

        met_count = sum(1 for c in resolved_complaints if c.sla_due_at and c.resolved_at <= c.sla_due_at)
        sla_compliance = round((met_count / resolved_count * 100), 1) if resolved_count > 0 else 100.0

        # Average resolution hours
        res_hours = []
        for c in resolved_complaints:
            diff = (c.resolved_at - c.created_at).total_seconds() / 3600.0
            if diff >= 0:
                res_hours.append(diff)

        avg_resolution_hours = round(sum(res_hours) / len(res_hours), 1) if res_hours else 0.0

        # Average Feedback Rating
        complaint_ids = [c.id for c in complaints]
        if complaint_ids:
            feedbacks = Feedback.query.filter(Feedback.complaint_id.in_(complaint_ids)).all()
            avg_rating = round(sum(f.rating for f in feedbacks) / len(feedbacks), 1) if feedbacks else 0.0
            feedback_count = len(feedbacks)
        else:
            avg_rating = 0.0
            feedback_count = 0

        # Reopen rate
        reopened_total = sum(1 for c in complaints if (c.reopened_count or 0) > 0 or c.status == ComplaintStatus.REOPENED)
        reopen_rate = round((reopened_total / max(1, resolved_count + reopened_total) * 100), 1)

        # Previous Period Comparison
        previous_comparison = cls._compute_previous_comparison(filters, total, resolved_count, sla_compliance, avg_resolution_hours)

        # Operational Insights
        insights = cls._generate_insights(complaints, overdue, sla_compliance, resolved_count)

        return {
            "total_complaints": total,
            "pending": pending,
            "in_progress": in_progress,
            "resolved": resolved,
            "closed": closed,
            "overdue": overdue,
            "sla_compliance": sla_compliance,
            "average_resolution_hours": avg_resolution_hours,
            "average_rating": avg_rating,
            "feedback_count": feedback_count,
            "reopen_rate": reopen_rate,
            "previous_period": previous_comparison,
            "insights": insights,
        }

    @classmethod
    def _compute_previous_comparison(cls, filters: dict, curr_total: int, curr_resolved: int, curr_sla: float, curr_res_hours: float) -> dict:
        start_date = filters.get("start_date")
        end_date = filters.get("end_date") or datetime.utcnow()

        if not start_date:
            # Default to comparing past 30 days
            start_date = end_date - timedelta(days=30)

        duration = end_date - start_date
        prev_end = start_date
        prev_start = prev_end - duration

        prev_filters = dict(filters)
        prev_filters["start_date"] = prev_start
        prev_filters["end_date"] = prev_end

        prev_complaints = cls.apply_filters(Complaint.query, prev_filters).all()
        prev_total = len(prev_complaints)
        prev_resolved = [c for c in prev_complaints if c.status == ComplaintStatus.RESOLVED and c.resolved_at]
        prev_res_count = len(prev_resolved)

        prev_met = sum(1 for c in prev_resolved if c.sla_due_at and c.resolved_at <= c.sla_due_at)
        prev_sla = round((prev_met / prev_res_count * 100), 1) if prev_res_count > 0 else 100.0

        def calc_pct_change(curr, prev):
            if prev == 0:
                return 0.0 if curr == 0 else 100.0
            return round(((curr - prev) / prev) * 100.0, 1)

        return {
            "complaints_change_pct": calc_pct_change(curr_total, prev_total),
            "resolved_change_pct": calc_pct_change(curr_resolved, prev_res_count),
            "sla_change_pct": round(curr_sla - prev_sla, 1),
            "previous_total": prev_total,
            "previous_resolved": prev_res_count,
        }

    @classmethod
    def _generate_insights(cls, complaints: list, overdue_count: int, sla_compliance: float, resolved_count: int) -> list:
        insights = []

        if not complaints:
            return ["No complaints recorded in the selected period."]

        # 1. Top category insight
        cat_counts = {}
        dept_counts = {}
        for c in complaints:
            c_name = c.category.name if c.category else "Uncategorized"
            d_name = c.department.name if c.department else "General"
            cat_counts[c_name] = cat_counts.get(c_name, 0) + 1
            dept_counts[d_name] = dept_counts.get(d_name, 0) + 1

        if cat_counts:
            top_cat = max(cat_counts.items(), key=lambda x: x[1])
            cat_pct = round((top_cat[1] / len(complaints)) * 100)
            insights.append(f"{top_cat[0]} is the highest-volume category ({top_cat[1]} tickets, {cat_pct}% of total).")

        if dept_counts:
            top_dept = max(dept_counts.items(), key=lambda x: x[1])
            insights.append(f"{top_dept[0]} handles the highest operational load with {top_dept[1]} assigned complaints.")

        # 2. Overdue insight
        if overdue_count > 0:
            insights.append(f"{overdue_count} complaint{'s' if overdue_count > 1 else ''} currently exceed target SLA resolution deadlines.")
        else:
            insights.append("Zero active complaints are currently overdue across campus departments.")

        # 3. SLA compliance insight
        if resolved_count > 0:
            if sla_compliance >= 90.0:
                insights.append(f"Institutional SLA resolution compliance is strong at {sla_compliance}%.")
            elif sla_compliance >= 70.0:
                insights.append(f"Overall SLA compliance is moderate at {sla_compliance}%.")
            else:
                insights.append(f"SLA compliance requires attention ({sla_compliance}% achieved against institutional targets).")

        return insights[:4]

    @classmethod
    def get_trends(cls, filters: dict, group_by: str = "day") -> list:
        base_q = cls.apply_filters(Complaint.query, filters)
        complaints = base_q.order_by(Complaint.created_at.asc()).all()

        date_groups = {}
        for c in complaints:
            dt = c.created_at
            if group_by == "month":
                key = dt.strftime("%Y-%m")
            elif group_by == "week":
                # Monday of week
                monday = dt - timedelta(days=dt.weekday())
                key = monday.strftime("%Y-%m-%d")
            else:
                key = dt.strftime("%Y-%m-%d")

            if key not in date_groups:
                date_groups[key] = {
                    "date": key,
                    "complaints": 0,
                    "resolved": 0,
                    "high_priority": 0,
                }

            date_groups[key]["complaints"] += 1
            if c.status == ComplaintStatus.RESOLVED:
                date_groups[key]["resolved"] += 1
            if c.priority == ComplaintPriority.HIGH:
                date_groups[key]["high_priority"] += 1

        # Format sorted array
        sorted_keys = sorted(date_groups.keys())
        return [date_groups[k] for k in sorted_keys]

    @classmethod
    def get_status_distribution(cls, filters: dict) -> list:
        base_q = cls.apply_filters(Complaint.query, filters)
        complaints = base_q.all()
        total = len(complaints) or 1

        status_counts = {}
        for s in ComplaintStatus.ALL:
            status_counts[s] = 0

        for c in complaints:
            status_counts[c.status] = status_counts.get(c.status, 0) + 1

        results = []
        for status, count in status_counts.items():
            if count > 0:
                results.append({
                    "status": status,
                    "count": count,
                    "percentage": round((count / total) * 100, 1),
                })

        return sorted(results, key=lambda x: x["count"], reverse=True)

    @classmethod
    def get_category_analytics(cls, filters: dict) -> list:
        base_q = cls.apply_filters(Complaint.query, filters)
        complaints = base_q.all()
        total = len(complaints) or 1

        cat_map = {}
        for c in complaints:
            c_name = c.category.name if c.category else "Uncategorized"
            if c_name not in cat_map:
                cat_map[c_name] = {"category": c_name, "count": 0, "resolved": 0}
            cat_map[c_name]["count"] += 1
            if c.status == ComplaintStatus.RESOLVED:
                cat_map[c_name]["resolved"] += 1

        results = []
        for c_name, data in cat_map.items():
            results.append({
                "category": c_name,
                "count": data["count"],
                "resolved": data["resolved"],
                "percentage": round((data["count"] / total) * 100, 1),
            })

        return sorted(results, key=lambda x: x["count"], reverse=True)

    @classmethod
    def get_department_analytics(cls, filters: dict) -> list:
        now = datetime.utcnow()
        departments = Department.query.order_by(Department.id.asc()).all()

        results = []
        for dept in departments:
            dept_filters = dict(filters)
            dept_filters["department_id"] = dept.id
            complaints = cls.apply_filters(Complaint.query, dept_filters).all()

            total = len(complaints)
            resolved = [c for c in complaints if c.status == ComplaintStatus.RESOLVED]
            pending = sum(1 for c in complaints if c.status in [ComplaintStatus.PENDING, ComplaintStatus.ASSIGNED])
            overdue = sum(1 for c in complaints if c.status not in [
                ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED, ComplaintStatus.CLOSED_AS_DUPLICATE
            ] and c.sla_due_at and c.sla_due_at < now)

            # Resolution hours
            res_hours = [(c.resolved_at - c.created_at).total_seconds() / 3600.0 for c in resolved if c.resolved_at]
            avg_res = round(sum(res_hours) / len(res_hours), 1) if res_hours else 0.0

            # SLA compliance
            met = sum(1 for c in resolved if c.sla_due_at and c.resolved_at and c.resolved_at <= c.sla_due_at)
            sla_compliance = round((met / len(resolved) * 100), 1) if resolved else 100.0

            results.append({
                "id": dept.id,
                "department": dept.name,
                "code": dept.code,
                "total": total,
                "resolved": len(resolved),
                "pending": pending,
                "overdue": overdue,
                "avg_resolution_hours": avg_res,
                "sla_compliance": sla_compliance,
            })

        return sorted(results, key=lambda x: x["total"], reverse=True)

    @classmethod
    def get_priority_analytics(cls, filters: dict) -> list:
        base_q = cls.apply_filters(Complaint.query, filters)
        complaints = base_q.all()
        total = len(complaints) or 1

        priority_counts = {
            ComplaintPriority.HIGH: 0,
            ComplaintPriority.MEDIUM: 0,
            ComplaintPriority.LOW: 0,
        }

        for c in complaints:
            if c.priority in priority_counts:
                priority_counts[c.priority] += 1

        return [
            {
                "priority": p,
                "count": priority_counts[p],
                "percentage": round((priority_counts[p] / total) * 100, 1),
            }
            for p in [ComplaintPriority.HIGH, ComplaintPriority.MEDIUM, ComplaintPriority.LOW]
        ]

    @classmethod
    def get_sla_analytics(cls, filters: dict) -> dict:
        now = datetime.utcnow()
        base_q = cls.apply_filters(Complaint.query, filters)
        complaints = base_q.all()

        resolved = [c for c in complaints if c.status == ComplaintStatus.RESOLVED and c.resolved_at]
        active = [c for c in complaints if c.status not in [
            ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED, ComplaintStatus.CLOSED_AS_DUPLICATE
        ]]

        sla_met = sum(1 for c in resolved if c.sla_due_at and c.resolved_at <= c.sla_due_at)
        sla_breached = len(resolved) - sla_met

        due_soon = 0
        overdue = 0
        for c in active:
            info = SLAService.get_sla_info(c)
            if info["sla_status"] == "DUE_SOON":
                due_soon += 1
            elif info["sla_status"] == "OVERDUE":
                overdue += 1

        total_resolved = len(resolved)
        compliance_pct = round((sla_met / total_resolved * 100), 1) if total_resolved > 0 else 100.0

        return {
            "total_resolved": total_resolved,
            "sla_met": sla_met,
            "sla_breached": sla_breached,
            "due_soon": due_soon,
            "overdue": overdue,
            "compliance_pct": compliance_pct,
            "active_monitored": len(active),
        }

    @classmethod
    def get_resolution_analytics(cls, filters: dict) -> dict:
        base_q = cls.apply_filters(Complaint.query, filters)
        resolved = base_q.filter(
            Complaint.status == ComplaintStatus.RESOLVED,
            Complaint.resolved_at.isnot(None)
        ).all()

        durations = []
        for c in resolved:
            dur = (c.resolved_at - c.created_at).total_seconds() / 3600.0
            if dur >= 0:
                durations.append(dur)

        if not durations:
            return {
                "count": 0,
                "avg_hours": 0.0,
                "median_hours": 0.0,
                "fastest_hours": 0.0,
                "slowest_hours": 0.0,
            }

        durations.sort()
        n = len(durations)
        median = durations[n // 2] if n % 2 != 0 else (durations[(n - 1) // 2] + durations[n // 2]) / 2.0

        return {
            "count": n,
            "avg_hours": round(sum(durations) / n, 1),
            "median_hours": round(median, 1),
            "fastest_hours": round(durations[0], 1),
            "slowest_hours": round(durations[-1], 1),
        }

    @classmethod
    def get_staff_workload(cls, filters: dict) -> list:
        now = datetime.utcnow()
        staff_members = User.query.filter(User.role.in_([RoleEnum.STAFF, RoleEnum.ADMIN])).all()

        results = []
        for staff in staff_members:
            # Active and past assignments
            asgns = ComplaintAssignment.query.filter_by(staff_id=staff.id).all()
            cid_list = [a.complaint_id for a in asgns]

            if not cid_list:
                results.append({
                    "id": staff.id,
                    "name": staff.full_name,
                    "email": staff.email,
                    "department": staff.department.name if staff.department else "Unassigned",
                    "assigned_total": 0,
                    "active_count": 0,
                    "resolved_count": 0,
                    "overdue_count": 0,
                    "avg_resolution_hours": 0.0,
                    "sla_compliance": 100.0,
                    "avg_rating": 0.0,
                })
                continue

            q = cls.apply_filters(Complaint.query.filter(Complaint.id.in_(cid_list)), filters)
            complaints = q.all()

            assigned_total = len(complaints)
            active_count = sum(1 for c in complaints if c.status in [
                ComplaintStatus.ASSIGNED, ComplaintStatus.IN_PROGRESS, ComplaintStatus.INFORMATION_REQUIRED, ComplaintStatus.REOPENED
            ])
            resolved_list = [c for c in complaints if c.status == ComplaintStatus.RESOLVED and c.resolved_at]
            resolved_count = len(resolved_list)

            overdue_count = sum(1 for c in complaints if c.status not in [
                ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED, ComplaintStatus.CLOSED_AS_DUPLICATE
            ] and c.sla_due_at and c.sla_due_at < now)

            res_hours = [(c.resolved_at - c.created_at).total_seconds() / 3600.0 for c in resolved_list]
            avg_res = round(sum(res_hours) / len(res_hours), 1) if res_hours else 0.0

            met = sum(1 for c in resolved_list if c.sla_due_at and c.resolved_at <= c.sla_due_at)
            sla_compliance = round((met / resolved_count * 100), 1) if resolved_count > 0 else 100.0

            # Feedbacks for this staff's resolved tickets
            staff_cids = [c.id for c in resolved_list]
            feedbacks = Feedback.query.filter(Feedback.complaint_id.in_(staff_cids)).all() if staff_cids else []
            avg_rating = round(sum(f.rating for f in feedbacks) / len(feedbacks), 1) if feedbacks else 0.0

            results.append({
                "id": staff.id,
                "name": staff.full_name,
                "email": staff.email,
                "department": staff.department.name if staff.department else "Unassigned",
                "assigned_total": assigned_total,
                "active_count": active_count,
                "resolved_count": resolved_count,
                "overdue_count": overdue_count,
                "avg_resolution_hours": avg_res,
                "sla_compliance": sla_compliance,
                "avg_rating": avg_rating,
            })

        return sorted(results, key=lambda x: x["active_count"], reverse=True)

    @classmethod
    def get_staff_performance_detail(cls, staff_id: int) -> dict:
        staff = db.session.get(User, staff_id)
        if not staff or staff.role not in [RoleEnum.STAFF, RoleEnum.ADMIN]:
            return None

        now = datetime.utcnow()
        asgns = ComplaintAssignment.query.filter_by(staff_id=staff.id).all()
        cid_list = [a.complaint_id for a in asgns]

        complaints = Complaint.query.filter(Complaint.id.in_(cid_list)).all() if cid_list else []
        resolved = [c for c in complaints if c.status == ComplaintStatus.RESOLVED]
        active = [c for c in complaints if c.status in [
            ComplaintStatus.ASSIGNED, ComplaintStatus.IN_PROGRESS, ComplaintStatus.INFORMATION_REQUIRED, ComplaintStatus.REOPENED
        ]]
        overdue = [c for c in active if c.sla_due_at and c.sla_due_at < now]

        res_hours = [(c.resolved_at - c.created_at).total_seconds() / 3600.0 for c in resolved if c.resolved_at]
        avg_res = round(sum(res_hours) / len(res_hours), 1) if res_hours else 0.0

        met = sum(1 for c in resolved if c.sla_due_at and c.resolved_at and c.resolved_at <= c.sla_due_at)
        sla_compliance = round((met / len(resolved) * 100), 1) if resolved else 100.0

        feedbacks = Feedback.query.filter(Feedback.complaint_id.in_([c.id for c in resolved])).all() if resolved else []
        avg_rating = round(sum(f.rating for f in feedbacks) / len(feedbacks), 1) if feedbacks else 0.0

        return {
            "staff": staff.to_dict(),
            "metrics": {
                "assigned_total": len(complaints),
                "active_count": len(active),
                "resolved_count": len(resolved),
                "overdue_count": len(overdue),
                "avg_resolution_hours": avg_res,
                "sla_compliance": sla_compliance,
                "avg_rating": avg_rating,
                "feedback_count": len(feedbacks),
            },
            "recent_complaints": [c.to_dict() for c in complaints[:10]],
            "feedbacks": [f.to_dict() for f in feedbacks[:10]],
        }

    @classmethod
    def get_feedback_analytics(cls, filters: dict) -> dict:
        base_q = cls.apply_filters(Complaint.query, filters)
        complaints = base_q.all()
        cid_list = [c.id for c in complaints]

        if not cid_list:
            return {
                "average_rating": 0.0,
                "total_feedbacks": 0,
                "feedback_response_rate": 0.0,
                "rating_distribution": [{"stars": i, "count": 0, "percentage": 0} for i in range(1, 6)],
            }

        feedbacks = Feedback.query.filter(Feedback.complaint_id.in_(cid_list)).all()
        resolved_count = sum(1 for c in complaints if c.status == ComplaintStatus.RESOLVED)

        dist = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
        for f in feedbacks:
            if f.rating in dist:
                dist[f.rating] += 1

        total_f = len(feedbacks)
        avg_rating = round(sum(f.rating for f in feedbacks) / total_f, 1) if total_f > 0 else 0.0
        resp_rate = round((total_f / resolved_count * 100), 1) if resolved_count > 0 else 0.0

        return {
            "average_rating": avg_rating,
            "total_feedbacks": total_f,
            "feedback_response_rate": resp_rate,
            "rating_distribution": [
                {
                    "stars": i,
                    "count": dist[i],
                    "percentage": round((dist[i] / total_f * 100), 1) if total_f > 0 else 0.0,
                }
                for i in [5, 4, 3, 2, 1]
            ],
        }

    @classmethod
    def get_ai_analytics(cls, filters: dict) -> dict:
        base_q = cls.apply_filters(Complaint.query, filters)
        complaints = base_q.all()

        total = len(complaints)
        analyzed = sum(1 for c in complaints if c.ai_category is not None)
        low_confidence = sum(1 for c in complaints if c.ai_category_confidence and c.ai_category_confidence < 0.50)
        overrides = sum(1 for c in complaints if c.is_overridden)
        duplicates = sum(1 for c in complaints if c.is_duplicate)

        denom = max(1, analyzed)
        return {
            "total_complaints": total,
            "ai_analyzed_count": analyzed,
            "low_confidence_count": low_confidence,
            "low_confidence_rate": round((low_confidence / denom * 100), 1),
            "override_count": overrides,
            "override_rate": round((overrides / denom * 100), 1),
            "duplicate_count": duplicates,
            "duplicate_rate": round((duplicates / max(1, total) * 100), 1),
        }

    @classmethod
    def export_csv(cls, filters: dict) -> str:
        base_q = cls.apply_filters(Complaint.query, filters)
        complaints = base_q.order_by(Complaint.created_at.desc()).all()

        output = io.StringIO()
        writer = csv.writer(output)

        # Header row
        writer.writerow([
            "Complaint ID",
            "Title",
            "Student Name",
            "Student Email",
            "Category",
            "Department",
            "Priority",
            "Status",
            "SLA Status",
            "Assigned Staff",
            "Created At",
            "SLA Due At",
            "Resolved At",
            "Resolution Hours",
            "Rating",
            "Is Duplicate",
            "Is Overridden"
        ])

        for c in complaints:
            sla_info = SLAService.get_sla_info(c)
            active_asgn = c.active_assignment
            staff_name = active_asgn.staff.full_name if active_asgn and active_asgn.staff else "Unassigned"

            res_hrs = ""
            if c.resolved_at and c.created_at:
                diff = max(0.0, (c.resolved_at - c.created_at).total_seconds() / 3600.0)
                res_hrs = f"{diff:.1f}"

            writer.writerow([
                c.complaint_id,
                c.title,
                c.student.full_name if c.student else "",
                c.student.email if c.student else "",
                c.category.name if c.category else "Uncategorized",
                c.department.name if c.department else "General",
                c.priority,
                c.status,
                sla_info.get("sla_status", ""),
                staff_name,
                c.created_at.isoformat() if c.created_at else "",
                c.sla_due_at.isoformat() if c.sla_due_at else "",
                c.resolved_at.isoformat() if c.resolved_at else "",
                res_hrs,
                c.feedback.rating if c.feedback else "",
                "YES" if c.is_duplicate else "NO",
                "YES" if c.is_overridden else "NO"
            ])

        return output.getvalue()
