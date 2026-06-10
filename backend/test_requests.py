import httpx
from app.core.config import settings

def verify_token(token: str):
    url = f"{settings.supabase_url}/auth/v1/user"
    headers = {
        "apikey": settings.supabase_service_role_key,
        "Authorization": f"Bearer {token}"
    }
    with httpx.Client() as client:
        response = client.get(url, headers=headers)
    print(f"Status: {response.status_code}")
    print(f"Data: {response.json()}")

verify_token("invalid.token")
