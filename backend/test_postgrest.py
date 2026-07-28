import httpx
from app.core.config import settings
def test():
    url = f"{settings.supabase_url}/rest/v1/cases?select=id&limit=1"
    # Use invalid token
    headers = {
        "apikey": settings.supabase_anon_key,
        "Authorization": f"Bearer invalid.token.here"
    }
    with httpx.Client() as client:
        r = client.get(url, headers=headers)
        print(f"Status: {r.status_code}, Body: {r.text}")

test()
