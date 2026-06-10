import httpx
import json
import base64
from app.core.config import settings

def test():
    # Use invalid token
    token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.invalid"
    
    # 1. Decode sub without verification (just base64 payload)
    payload_b64 = token.split(".")[1]
    # Add padding
    payload_b64 += "=" * ((4 - len(payload_b64) % 4) % 4)
    payload = json.loads(base64.urlsafe_b64decode(payload_b64).decode("utf-8"))
    sub = payload.get("sub")
    print(f"Decoded sub: {sub}")

    # 2. Verify by querying PostgREST
    url = f"{settings.supabase_url}/rest/v1/users?id=eq.{sub}&select=id,email,role"
    headers = {
        "apikey": settings.supabase_anon_key,
        "Authorization": f"Bearer {token}"
    }
    with httpx.Client() as client:
        r = client.get(url, headers=headers)
        print(f"Status: {r.status_code}, Body: {r.text}")

test()
