from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any
from app.services.threatfox_service import ThreatFoxService

router = APIRouter()

@router.get("/threatfox/recent", response_model=Dict[str, Any])
async def get_recent_threatfox_iocs():
    """Get recent IOCs from ThreatFox API."""
    service = ThreatFoxService()
    result = await service.get_recent_iocs(days=1)
    
    if not result.get("success"):
        raise HTTPException(status_code=503, detail=result.get("error", "Failed to fetch threat intelligence data"))
        
    return result
