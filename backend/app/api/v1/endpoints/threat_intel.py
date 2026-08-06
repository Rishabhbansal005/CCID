from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any
from app.services.threatfox_service import ThreatFoxService
from app.services.urlhaus_service import URLhausService

router = APIRouter()

@router.get("/threatfox/recent", response_model=Dict[str, Any])
async def get_recent_threatfox_iocs():
    """Get recent IOCs from ThreatFox API."""
    service = ThreatFoxService()
    result = await service.get_recent_iocs(days=1)
    
    if not result.get("success"):
        raise HTTPException(status_code=503, detail=result.get("error", "Failed to fetch threat intelligence data"))
        
    return result

@router.get("/urlhaus/recent", response_model=Dict[str, Any])
async def get_recent_urlhaus_urls():
    """Get recent URLs from URLhaus API."""
    service = URLhausService()
    result = await service.get_recent_urls()
    
    if not result.get("success"):
        raise HTTPException(status_code=503, detail=result.get("error", "Failed to fetch threat intelligence data"))
        
    return result
