from supabase import create_client, Client
from app.core.config import settings
import logging
from typing import Optional
import re
import supabase._sync.client
import supabase._async.client

# Monkeypatch `re.match` in supabase clients to bypass the strict JWT regex check.
# This prevents "Invalid API key" crashes when using modern Supabase opaque keys (e.g. sb_secret_...).
class MockRe:
    @staticmethod
    def match(pattern, string, flags=0):
        return True

setattr(supabase._sync.client, "re", MockRe)
setattr(supabase._async.client, "re", MockRe)

logger = logging.getLogger(__name__)

_supabase_client: Optional[Client] = None
_supabase_admin_client: Optional[Client] = None


def get_supabase_client() -> Client:
    """Get Supabase client using anon key (respects RLS)."""
    global _supabase_client
    if _supabase_client is None:
        if not settings.supabase_url or not settings.supabase_anon_key:
            raise ValueError(
                "SUPABASE_URL and SUPABASE_ANON_KEY must be set in environment"
            )
        _supabase_client = create_client(
            settings.supabase_url,
            settings.supabase_anon_key,
        )
        logger.info("Supabase client initialized (anon)")
    return _supabase_client


def get_supabase_admin() -> Client:
    """Get Supabase admin client using service role key (bypasses RLS).
    
    Use with caution — only for server-side operations that must bypass RLS.
    """
    global _supabase_admin_client
    if _supabase_admin_client is None:
        if not settings.supabase_url or not settings.supabase_service_role_key:
            raise ValueError(
                "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment"
            )
        _supabase_admin_client = create_client(
            settings.supabase_url,
            settings.supabase_service_role_key,
        )
        logger.info("Supabase admin client initialized (service role)")
    return _supabase_admin_client
