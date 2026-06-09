from fastapi import APIRouter, Depends, HTTPException, status
from app.core.security import get_current_user, require_investigator, CurrentUser
from app.core.supabase_client import get_supabase_admin
from app.models.schemas import (
    TimelineEventCreate, TimelineEventUpdate, TimelineEventResponse
)
import logging

router = APIRouter(prefix="/timeline", tags=["Timeline"])
logger = logging.getLogger(__name__)


@router.get("/case/{case_id}", response_model=list[TimelineEventResponse])
async def list_timeline_events(
    case_id: str,
    current_user: CurrentUser = Depends(get_current_user),
):
    try:
        db = get_supabase_admin()
        result = db.table("timeline_events").select("*").eq("case_id", case_id).order("event_time").execute()
        return result.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("", response_model=TimelineEventResponse, status_code=status.HTTP_201_CREATED)
async def create_timeline_event(
    event_data: TimelineEventCreate,
    current_user: CurrentUser = Depends(require_investigator),
):
    try:
        db = get_supabase_admin()
        payload = event_data.model_dump(exclude_none=True)
        payload["created_by"] = current_user.id
        # Serialize event_time
        if "event_time" in payload and hasattr(payload["event_time"], "isoformat"):
            payload["event_time"] = payload["event_time"].isoformat()
        result = db.table("timeline_events").insert(payload).execute()
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create timeline event")
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{event_id}", response_model=TimelineEventResponse)
async def update_timeline_event(
    event_id: str,
    update_data: TimelineEventUpdate,
    current_user: CurrentUser = Depends(require_investigator),
):
    try:
        db = get_supabase_admin()
        payload = update_data.model_dump(exclude_none=True)
        if "event_time" in payload and hasattr(payload["event_time"], "isoformat"):
            payload["event_time"] = payload["event_time"].isoformat()
        result = db.table("timeline_events").update(payload).eq("id", event_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Event not found")
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{event_id}")
async def delete_timeline_event(
    event_id: str,
    current_user: CurrentUser = Depends(require_investigator),
):
    try:
        db = get_supabase_admin()
        db.table("timeline_events").delete().eq("id", event_id).execute()
        return {"message": "Event deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
