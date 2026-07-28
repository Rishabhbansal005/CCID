import asyncio
from app.core.config import settings
from supabase import create_client

def test():
    client = create_client(settings.supabase_url, settings.supabase_service_role_key)
    print("Client initialized")
    # try to get an invalid token to see if it says Invalid API key or JWT error
    try:
        user = client.auth.get_user("invalid.token.here")
        print(user)
    except Exception as e:
        print(f"Error: {e}")

test()
