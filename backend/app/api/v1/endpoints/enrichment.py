import logging
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Body
from app.core.security import get_current_user, require_investigator, CurrentUser
from app.services.enrichment_provider import enrich_ioc

router = APIRouter(prefix="/enrichment", tags=["Enrichment"])
logger = logging.getLogger(__name__)

@router.post("/ioc", response_model=Dict[str, Any])
async def get_ioc_enrichment(
    ioc: str = Body(..., embed=True),
    ioc_type: str = Body("domain", embed=True),
    current_user: CurrentUser = Depends(get_current_user)
):
    """Get threat intelligence enrichment for an IOC"""
    try:
        return enrich_ioc(ioc, ioc_type)
    except Exception as e:
        logger.error(f"Error enriching IOC {ioc}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
