import uuid
from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from app.core.security import get_current_user, CurrentUser
from app.core.supabase_client import get_supabase_admin
from app.models.schemas import BrowserAnalysisResult
from app.services.browser_parser import BrowserParser
import logging

router = APIRouter(prefix="/forensics/browser", tags=["Browser Analysis"])
logger = logging.getLogger(__name__)

import os
import tempfile
import httpx

async def download_file_to_temp(url: str) -> str:
    """Download a file from a URL to a temporary file on disk."""
    fd, temp_path = tempfile.mkstemp(suffix=".sqlite")
    os.close(fd)
    
    async with httpx.AsyncClient() as client:
        async with client.stream("GET", url) as response:
            response.raise_for_status()
            with open(temp_path, "wb") as f:
                async for chunk in response.aiter_bytes(chunk_size=8192):
                    f.write(chunk)
    return temp_path

async def analyze_browser_artifacts_task(evidence_id: str, case_id: str, download_url: str, current_user: CurrentUser):
    db = get_supabase_admin()
    
    # Create pending record
    record_id = str(uuid.uuid4())
    record = {
        "id": record_id,
        "evidence_id": evidence_id,
        "analysis_status": "analyzing",
        "browser_type": "unknown",
        "history_entries": [],
        "downloads": [],
        "cookies": [],
        "bookmarks": [],
        "suspicious_urls": [],
        "search_terms": [],
        "analysis_summary": {}
    }
    
    temp_path = None
    try:
        db.table("browser_analysis_results").insert(record).execute()
        
        # Download the real file from Supabase Storage
        logger.info(f"Downloading browser artifact for {evidence_id}")
        temp_path = await download_file_to_temp(download_url)
        
        # Parse!
        parsed_data = BrowserParser.parse_chrome_history(temp_path)
        
        # Update record
        summary = {
            "total_history_entries": len(parsed_data["history_entries"]),
            "total_downloads": len(parsed_data["downloads"]),
            "suspicious_urls_count": len(parsed_data["suspicious_urls"]),
            "search_terms_count": len(parsed_data["search_terms"])
        }
        
        update_data = {
            "analysis_status": "completed",
            "browser_type": parsed_data["browser_type"],
            "history_entries": parsed_data["history_entries"],
            "downloads": parsed_data["downloads"],
            "cookies": parsed_data["cookies"],
            "bookmarks": parsed_data["bookmarks"],
            "suspicious_urls": parsed_data["suspicious_urls"],
            "search_terms": parsed_data["search_terms"],
            "analysis_summary": summary
        }
        
        db.table("browser_analysis_results").update(update_data).eq("id", record_id).execute()
        
        # Generate Timeline Events for suspicious URLs and search terms
        events = []
        for term in parsed_data["search_terms"]:
            events.append({
                "case_id": case_id,
                "evidence_id": evidence_id,
                "event_time": term["time"],
                "title": f"Web Search: {term['term']}",
                "description": f"Search engine: {term['engine']}",
                "event_type": "web",
                "importance": "informational",
                "is_confirmed": True,
                "source": "Browser Analysis",
                "tags": ["search", "browser"],
                "raw_data": term,
                "created_by": current_user.id
            })
            
        for susp in parsed_data["suspicious_urls"]:
            # Also generate a Finding
            finding = {
                "case_id": case_id,
                "evidence_id": evidence_id,
                "finding_number": f"FND-BWS-{str(uuid.uuid4())[:8].upper()}",
                "title": "Suspicious URL Accessed",
                "description": f"URL accessed: {susp['url']}. Reason: {susp['reason']}",
                "severity": susp["severity"],
                "category": "browser",
                "status": "open",
                "tags": ["browser", "web"],
                "ioc_indicators": [{"type": "url", "value": susp['url'], "confidence": 90}],
                "analysis_source": "Browser Analysis",
                "created_by": current_user.id
            }
            finding_res = db.table("findings").insert(finding).execute()
            
            if finding_res.data:
                finding_id = finding_res.data[0]["id"]
                events.append({
                    "case_id": case_id,
                    "evidence_id": evidence_id,
                    "finding_id": finding_id,
                    "event_time": parsed_data["history_entries"][0]["visit_time"] if parsed_data["history_entries"] else "now()",
                    "title": "Suspicious URL Accessed",
                    "description": susp['url'],
                    "event_type": "finding",
                    "importance": susp["severity"],
                    "is_confirmed": True,
                    "source": "Browser Analysis",
                    "tags": ["browser", "suspicious"],
                    "raw_data": susp,
                    "created_by": current_user.id
                })
                
        if events:
            db.table("timeline_events").insert(events).execute()
            
        # Update evidence status
        db.table("evidence").update({"processing_status": "analyzed"}).eq("id", evidence_id).execute()
        
        # Trigger correlation engine which will also update risk
        from app.services.correlation_engine import generate_correlations_for_case
        generate_correlations_for_case(case_id, current_user.id)
        
        logger.info(f"Browser artifact analysis completed for {evidence_id}")
            
    except Exception as e:
        logger.error(f"Browser analysis error: {e}")
        db.table("browser_analysis_results").update({
            "analysis_status": "failed",
            "error_message": str(e)
        }).eq("id", record_id).execute()
        db.table("evidence").update({"processing_status": "error"}).eq("id", evidence_id).execute()
    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)


@router.post("/analyze/{evidence_id}")
async def start_browser_analysis(
    evidence_id: str,
    background_tasks: BackgroundTasks,
    current_user: CurrentUser = Depends(get_current_user)
):
    try:
        db = get_supabase_admin()
        res = db.table("evidence").select("case_id, storage_bucket, storage_path").eq("id", evidence_id).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Evidence not found")
            
        case_id = res.data[0]["case_id"]
        
        # Get signed URL
        url_result = db.storage.from_(res.data[0]["storage_bucket"]).create_signed_url(
            path=res.data[0]["storage_path"],
            expires_in=3600
        )
        download_url = url_result.get("signedURL")
        if not download_url:
            raise HTTPException(status_code=500, detail="Failed to generate download URL")
            
        background_tasks.add_task(analyze_browser_artifacts_task, evidence_id, case_id, download_url, current_user)
        return {"message": "Browser analysis started in the background"}
    except Exception as e:
        logger.error(f"Error starting browser analysis: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{evidence_id}", response_model=BrowserAnalysisResult)
async def get_browser_analysis(
    evidence_id: str,
    current_user: CurrentUser = Depends(get_current_user)
):
    try:
        db = get_supabase_admin()
        res = db.table("browser_analysis_results").select("*").eq("evidence_id", evidence_id).order("created_at", desc=True).limit(1).execute()
        
        if not res.data:
            raise HTTPException(status_code=404, detail="No browser analysis found for this evidence")
            
        return res.data[0]
    except Exception as e:
        logger.error(f"Error fetching browser analysis: {e}")
        raise HTTPException(status_code=500, detail=str(e))
