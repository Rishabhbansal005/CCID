import os
import json
import logging
import tempfile
import asyncio
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Dict, Any, List
from app.core.security import require_investigator, CurrentUser, get_current_user
from app.core.supabase_client import get_supabase_admin
from app.services.forensics.event_log_parser import EventLogParser

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/event-logs", tags=["Event Log Analysis"])

class EventLogAnalysisResponse(BaseModel):
    message: str
    evidence_id: str

def fetch_evidence(db, evidence_id: str) -> dict:
    ev = db.table("evidence").select("*").eq("id", evidence_id).single().execute()
    if not ev.data:
        raise HTTPException(status_code=404, detail="Evidence not found")
    return ev.data

async def run_event_log_analysis(evidence_id: str, case_id: str, storage_path: str, storage_bucket: str, current_user_id: str):
    db = get_supabase_admin()
    try:
        # Mark as processing
        db.table("event_log_analysis_results").update({"analysis_status": "processing"}).eq("evidence_id", evidence_id).execute()
        
        # Download evidence file temporarily
        url_res = db.storage.from_(storage_bucket).create_signed_url(storage_path, 3600)
        signed_url = url_res.get("signedURL")
        if not signed_url:
            raise Exception("Failed to generate signed URL")

        # Download to temp file
        import httpx
        with tempfile.NamedTemporaryFile(delete=False) as tmp:
            tmp_path = tmp.name
            async with httpx.AsyncClient() as client:
                async with client.stream("GET", signed_url) as response:
                    response.raise_for_status()
                    async for chunk in response.aiter_bytes():
                        tmp.write(chunk)
        
        try:
            # Run EVTX Parsing
            ev_data = db.table("evidence").select("original_file_name").eq("id", evidence_id).single().execute().data
            original_name = ev_data.get("original_file_name", "") if ev_data else ""
            
            # Use real parser
            results = EventLogParser.parse_evtx(tmp_path, original_name)
            
            # Create findings for suspicious events
            suspicious_events = results.get("suspicious_events", [])
            for event in suspicious_events:
                finding_payload = {
                    "case_id": case_id,
                    "evidence_id": evidence_id,
                    "title": f"Suspicious Event: {event.get('type')}",
                    "description": event.get("description", "Unknown malicious activity"),
                    "severity": event.get("severity", "medium"),
                    "status": "open",
                    "category": "intrusion",
                    "analysis_source": "Event Log Analysis",
                    "ioc_indicators": [{"type": "ip", "value": event.get("ip_address")}] if event.get("ip_address") else [],
                    "created_by": current_user_id
                }
                db.table("findings").insert(finding_payload).execute()
            
            # Update DB
            update_payload = {
                "analysis_status": "completed",
                "suspicious_events": suspicious_events,
                "timeline_events": results.get("timeline_events", []),
                "analysis_summary": results.get("analysis_summary", {}),
                "updated_at": datetime.utcnow().isoformat()
            }
            db.table("event_log_analysis_results").update(update_payload).eq("evidence_id", evidence_id).execute()
            
            # Batch Timeline events
            for t_event in results.get("timeline_events", []):
                # Map parser event types to allowed DB constraint values
                raw_type = t_event.get("event_type", "generic")
                db_event_type = "other"
                if "login" in raw_type or "rdp" in raw_type:
                    db_event_type = "authentication"
                elif "powershell" in raw_type:
                    db_event_type = "process"
                    
                timeline_payload = {
                    "case_id": case_id,
                    "event_type": db_event_type,
                    "title": t_event.get("event_type", "Event Log Activity").replace("_", " ").title(),
                    "description": t_event.get("description", ""),
                    "event_time": t_event.get("timestamp"),
                    "created_by": current_user_id,
                    "evidence_id": evidence_id
                }
                db.table("timeline_events").insert(timeline_payload).execute()
                
            # Timeline event for analysis completion
            db.table("timeline_events").insert({
                "case_id": case_id,
                "event_type": "system",
                "title": "Event Log Analysis Completed",
                "description": f"Parsed EVTX file. Found {len(suspicious_events)} suspicious events.",
                "event_time": datetime.utcnow().isoformat(),
                "created_by": current_user_id,
                "evidence_id": evidence_id
            }).execute()

            # Trigger correlation engine which will also update risk
            from app.services.correlation_engine import generate_correlations_for_case
            generate_correlations_for_case(case_id, current_user_id)
            
            # Mark evidence as analyzed
            db.table("evidence").update({"processing_status": "analyzed"}).eq("id", evidence_id).execute()
            
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
                
    except Exception as e:
        # Auto update case risk
        from app.services.risk_service import auto_update_case_risk
        auto_update_case_risk(case_id, current_user_id)

        logger.error(f"Event Log analysis failed for evidence {evidence_id}: {e}")
        db.table("event_log_analysis_results").update({
            "analysis_status": "failed",
            "error_message": str(e),
            "updated_at": datetime.utcnow().isoformat()
        }).eq("evidence_id", evidence_id).execute()

@router.post("/{evidence_id}/analyze", response_model=EventLogAnalysisResponse)
async def start_event_log_analysis(
    evidence_id: str,
    background_tasks: BackgroundTasks,
    current_user: CurrentUser = Depends(require_investigator)
):
    db = get_supabase_admin()
    ev = fetch_evidence(db, evidence_id)
    
    # Verify file type
    original_name = ev.get("original_file_name", "").lower()
    if not (original_name.endswith(".evtx")):
        raise HTTPException(status_code=400, detail="Evidence is not a supported EVTX file")

    # Check if already analyzing
    res = db.table("event_log_analysis_results").select("id").eq("evidence_id", evidence_id).execute()
    if not res.data:
        db.table("event_log_analysis_results").insert({"evidence_id": evidence_id, "case_id": ev.get("case_id")}).execute()

    # Dispatch background task
    background_tasks.add_task(
        run_event_log_analysis,
        evidence_id,
        ev.get("case_id"),
        ev.get("storage_path"),
        ev.get("storage_bucket"),
        current_user.id
    )

    # Dispatch timeline event for starting analysis
    timeline_event = {
        "case_id": ev.get("case_id"),
        "event_type": "system",
        "title": "Event Log Analysis Started",
        "description": f"Started EVTX analysis on {ev.get('original_file_name')}",
        "event_time": datetime.utcnow().isoformat(),
        "created_by": current_user.id,
        "evidence_id": evidence_id
    }
    db.table("timeline_events").insert(timeline_event).execute()

    return EventLogAnalysisResponse(message="Event Log analysis started in background", evidence_id=evidence_id)

@router.get("/{evidence_id}/results")
async def get_event_log_analysis_results(
    evidence_id: str,
    current_user: CurrentUser = Depends(get_current_user)
):
    db = get_supabase_admin()
    res = db.table("event_log_analysis_results").select("*").eq("evidence_id", evidence_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="No event log analysis results found")
    
    return res.data[0]
