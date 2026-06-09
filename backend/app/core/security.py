import logging
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from app.core.config import settings
from app.core.supabase_client import get_supabase_admin

logger = logging.getLogger(__name__)
security = HTTPBearer()


class CurrentUser:
    def __init__(self, id: str, email: str, role: str, full_name: Optional[str] = None):
        self.id = id
        self.email = email
        self.role = role
        self.full_name = full_name


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> CurrentUser:
    """Validate Supabase JWT token and return the current user."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid authentication credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        token = credentials.credentials
        # Decode the Supabase JWT — uses HS256 with SUPABASE_JWT_SECRET
        payload = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError as e:
        logger.warning(f"JWT validation failed: {e}")
        raise credentials_exception

    # Fetch user profile from Supabase
    try:
        admin = get_supabase_admin()
        result = admin.table("users").select("*").eq("id", user_id).single().execute()
        if not result.data:
            raise credentials_exception
        user_data = result.data
        return CurrentUser(
            id=user_data["id"],
            email=user_data["email"],
            role=user_data.get("role", "viewer"),
            full_name=user_data.get("full_name"),
        )
    except Exception as e:
        logger.error(f"Failed to fetch user profile: {e}")
        raise credentials_exception


async def require_admin(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    """Require the current user to be an admin."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user


async def require_investigator(
    current_user: CurrentUser = Depends(get_current_user),
) -> CurrentUser:
    """Require the current user to be an investigator or admin."""
    if current_user.role not in ("admin", "investigator"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Investigator or admin access required",
        )
    return current_user
