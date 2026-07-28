import re
import supabase.client
import supabase._sync.client
import supabase._async.client

# Monkeypatch the regex to allow sb_ keys
setattr(supabase._sync.client, "re", type("MockRe", (), {"match": lambda pattern, string: True}))
setattr(supabase._async.client, "re", type("MockRe", (), {"match": lambda pattern, string: True}))

from app.core.config import settings
from supabase import create_client

def test():
    client = create_client(settings.supabase_url, settings.supabase_service_role_key)
    print("Client initialized with patch!")
    try:
        user = client.auth.get_user("invalid.token")
        print(user)
    except Exception as e:
        print(f"Auth error (expected): {e}")

test()
