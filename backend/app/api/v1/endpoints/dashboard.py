from fastapi import APIRouter, Depends, HTTPException
from app.core.security import get_current_user, CurrentUser
from app.core.supabase_client import get_supabase_admin
from app.models.schemas import DashboardStats
import logging
from typing import Any, Dict, List

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])
logger = logging.getLogger(__name__)

@router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats(
    current_user: CurrentUser = Depends(get_current_user)
):
    try:
        db = get_supabase_admin()
        
        # 1. Fetch cases
        cases_res = db.table("cases").select("id, status, priority, created_at").execute()
        cases = cases_res.data or []
        total_cases = len(cases)
        open_cases = sum(1 for c in cases if c.get("status") == "open")
        active_cases = sum(1 for c in cases if c.get("status") == "investigating" or c.get("status") == "active")
        closed_cases = sum(1 for c in cases if c.get("status") == "closed")

        # Priority distribution
        priority_counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}
        for c in cases:
            p = c.get("priority")
            if p in priority_counts:
                priority_counts[p] += 1
        
        priority_distribution = [{"name": k, "value": v} for k, v in priority_counts.items() if v > 0]

        # Trend Data (Last 6 Months)
        from datetime import datetime
        from dateutil.relativedelta import relativedelta
        from dateutil import parser
        import calendar

        trend_data = []
        now = datetime.utcnow()
        for i in range(5, -1, -1):
            d = now - relativedelta(months=i)
            trend_data.append({
                "month": calendar.month_abbr[d.month],
                "year": d.year,
                "monthIndex": d.month - 1, # 0-indexed
                "cases": 0,
                "closed": 0
            })

        for c in cases:
            created_at_str = c.get("created_at")
            if not created_at_str:
                continue
            dt = parser.isoparse(created_at_str)
            for m in trend_data:
                if m["monthIndex"] == (dt.month - 1) and m["year"] == dt.year:
                    m["cases"] += 1
                    if c.get("status") == "closed":
                        m["closed"] += 1
                    break

        # 2. Fetch evidence count
        evidence_res = db.table("evidence").select("id", count="exact").execute()
        total_evidence = evidence_res.count if hasattr(evidence_res, "count") and evidence_res.count is not None else len(evidence_res.data or [])

        # 3. Fetch findings
        findings_res = db.table("findings").select("id, severity").execute()
        findings = findings_res.data or []
        total_findings = len(findings)
        critical_findings = sum(1 for f in findings if f.get("severity") == "critical")

        # 4. Fetch reports count
        reports_res = db.table("reports").select("id", count="exact").execute()
        reports_generated = reports_res.count if hasattr(reports_res, "count") and reports_res.count is not None else len(reports_res.data or [])

        # 4.5 Fetch Correlations
        correlations_res = db.table("correlations").select("id, correlation_severity").execute()
        correlations = correlations_res.data or []
        total_correlations = len(correlations)
        critical_correlations = sum(1 for c in correlations if c.get("correlation_severity") == "critical")

        # 5. Fetch recent activity (Global Timeline)
        activity_res = db.table("timeline_events").select("*").order("event_time", desc=True).limit(10).execute()
        recent_activity = activity_res.data or []

        return DashboardStats(
            total_cases=total_cases,
            open_cases=open_cases,
            active_cases=active_cases,
            closed_cases=closed_cases,
            total_evidence=total_evidence,
            total_findings=total_findings,
            critical_findings=critical_findings,
            reports_generated=reports_generated,
            total_correlations=total_correlations,
            critical_correlations=critical_correlations,
            recent_activity=recent_activity,
            priority_distribution=priority_distribution,
            trend_data=trend_data
        )
    except Exception as e:
        logger.error(f"Dashboard stats error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
