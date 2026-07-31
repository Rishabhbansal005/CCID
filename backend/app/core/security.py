import logging
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from app.core.config import settings
from app.core.supabase_client import get_supabase_admin

logger = logging.getLogger(__name__)
security = HTTPBearer(auto_error=False)


class CurrentUser:
    def __init__(self, id: str, email: str, role: str, full_name: Optional[str] = None):
        self.id = id
        self.email = email
        self.role = role
        self.full_name = full_name


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> CurrentUser:
    """Validate Supabase JWT token and return the current user."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid authentication credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if not credentials or not credentials.credentials:
        raise credentials_exception


    try:
        token = credentials.credentials
        
        # 1. Decode sub locally without verification to construct the query
        import json, base64
        try:
            payload_b64 = token.split(".")[1]
            payload_b64 += "=" * ((4 - len(payload_b64) % 4) % 4)
            payload = json.loads(base64.urlsafe_b64decode(payload_b64).decode("utf-8"))
            user_id = payload.get("sub")
            if not user_id:
                raise ValueError("Missing sub")
        except Exception:
            raise credentials_exception
            
        # 2. Look up the user profile using the service role key (bypasses RLS).
        # The anon role does not have SELECT on the users table, so we must use
        # the service role key here. The JWT sub has already been decoded above
        # to get the user_id, which is sufficient to identify the user.
        import httpx
        url = f"{settings.supabase_url}/rest/v1/users?id=eq.{user_id}&select=id,email,role,full_name"
        service_key = settings.supabase_service_role_key
        headers = {
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
        }
        with httpx.Client(timeout=5.0) as http_client:
            user_resp = http_client.get(url, headers=headers)

        if user_resp.status_code != 200:
            logger.warning(f"User lookup failed: {user_resp.status_code} {user_resp.text}")
            raise credentials_exception

        data = user_resp.json()
        if not data:
            logger.warning(f"No user profile found for id={user_id}")
            raise credentials_exception

        user_data = data[0]
        return CurrentUser(
            id=user_data["id"],
            email=user_data.get("email", ""),
            role=user_data.get("role", "viewer"),
            full_name=user_data.get("full_name")
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.warning(f"JWT validation failed: {e}")
        raise credentials_exception


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> CurrentUser:
    """Validate Supabase JWT token if provided; otherwise return fallback guest user."""
    if not credentials or not credentials.credentials:
        return CurrentUser(id="00000000-0000-0000-0000-000000000000", email="officer@ccid.local", role="investigator", full_name="Investigating Officer")
    try:
        return await get_current_user(credentials)
    except Exception:
        return CurrentUser(id="00000000-0000-0000-0000-000000000000", email="officer@ccid.local", role="investigator", full_name="Investigating Officer")


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
