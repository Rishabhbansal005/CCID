from fastapi import APIRouter, Depends, HTTPException, Query
from app.services.osint_service import OsintService

router = APIRouter()

@router.get("/search")
async def search_osint(query: str = Query(..., min_length=2, description="IP, Domain, or Hash to search")):
    """
    Query AlienVault OTX for threat intelligence on a given indicator.
    """
    osint_service = OsintService()
    result = await osint_service.search_indicator(query)
    
    if not result.get("success"):
        # We still return 200 with the error message so the frontend can display it cleanly
        return result
        
    return result
