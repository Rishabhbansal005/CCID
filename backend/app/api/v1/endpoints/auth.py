from fastapi import APIRouter, Depends, HTTPException, status
from app.core.security import get_current_user, CurrentUser
from app.core.supabase_client import get_supabase_admin
from app.models.schemas import UserResponse, UserUpdate, MessageResponse
import logging

router = APIRouter(prefix="/auth", tags=["Authentication"])
logger = logging.getLogger(__name__)


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    current_user: CurrentUser = Depends(get_current_user),
):
    """Get the current authenticated user's profile."""
    try:
        db = get_supabase_admin()
        result = db.table("users").select("*").eq("id", current_user.id).single().execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="User profile not found")
        return result.data
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching user profile: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/me", response_model=UserResponse)
async def update_profile(
    update_data: UserUpdate,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Update the current user's profile."""
    try:
        db = get_supabase_admin()
        payload = update_data.model_dump(exclude_none=True)
        result = db.table("users").update(payload).eq("id", current_user.id).execute()
        if not result.data:
            raise HTTPException(status_code=500, detail="Update failed")
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/users", response_model=list[UserResponse])
async def list_users(
    current_user: CurrentUser = Depends(get_current_user),
):
    """List all users (admin only, or returns active investigators for assignment)."""
    try:
        db = get_supabase_admin()
        if current_user.role == "admin":
            result = db.table("users").select("*").order("created_at", desc=True).execute()
        else:
            # Non-admins can only see investigators for case assignment purposes
            result = db.table("users").select("id, full_name, email, role, badge_number").eq("is_active", True).in_("role", ["admin", "investigator"]).execute()
        return result.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
