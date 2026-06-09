from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.core.security import get_current_user, require_investigator, CurrentUser
from app.core.supabase_client import get_supabase_admin
from app.models.schemas import (
    FindingCreate, FindingUpdate, FindingResponse, MessageResponse
)
import logging

router = APIRouter(prefix="/findings", tags=["Findings"])
logger = logging.getLogger(__name__)


@router.get("/case/{case_id}", response_model=list[FindingResponse])
async def list_findings(
    case_id: str,
    severity: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    current_user: CurrentUser = Depends(get_current_user),
):
    try:
        db = get_supabase_admin()
        query = db.table("findings").select("*").eq("case_id", case_id)
        if severity:
            query = query.eq("severity", severity)
        if status:
            query = query.eq("status", status)
        result = query.order("created_at", desc=True).execute()
        return result.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("", response_model=FindingResponse, status_code=status.HTTP_201_CREATED)
async def create_finding(
    finding_data: FindingCreate,
    current_user: CurrentUser = Depends(require_investigator),
):
    try:
        db = get_supabase_admin()
        payload = finding_data.model_dump(exclude_none=True)
        payload["created_by"] = current_user.id
        # Serialize IOC indicators
        if "ioc_indicators" in payload:
            payload["ioc_indicators"] = [
                ioc if isinstance(ioc, dict) else ioc.model_dump()
                for ioc in payload["ioc_indicators"]
            ]
        result = db.table("findings").insert(payload).execute()
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create finding")
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{finding_id}", response_model=FindingResponse)
async def get_finding(
    finding_id: str,
    current_user: CurrentUser = Depends(get_current_user),
):
    try:
        db = get_supabase_admin()
        result = db.table("findings").select("*").eq("id", finding_id).single().execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Finding not found")
        return result.data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{finding_id}", response_model=FindingResponse)
async def update_finding(
    finding_id: str,
    update_data: FindingUpdate,
    current_user: CurrentUser = Depends(require_investigator),
):
    try:
        db = get_supabase_admin()
        payload = update_data.model_dump(exclude_none=True)
        if "ioc_indicators" in payload:
            payload["ioc_indicators"] = [
                ioc if isinstance(ioc, dict) else ioc.model_dump()
                for ioc in payload["ioc_indicators"]
            ]
        result = db.table("findings").update(payload).eq("id", finding_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Finding not found")
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{finding_id}", response_model=MessageResponse)
async def delete_finding(
    finding_id: str,
    current_user: CurrentUser = Depends(require_investigator),
):
    try:
        db = get_supabase_admin()
        db.table("findings").delete().eq("id", finding_id).execute()
        return MessageResponse(message="Finding deleted")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
