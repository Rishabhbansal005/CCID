import os
import sys
import json
from dotenv import load_dotenv

# Add backend to path
sys.path.append("/Users/rishabhbansal/Desktop/CBS/backend")
load_dotenv("/Users/rishabhbansal/Desktop/CBS/backend/.env")

from app.core.supabase_client import get_supabase_admin

def check_db():
    db = get_supabase_admin()
    res = db.table("evidence").select("id, original_file_name, hash_md5, hash_sha1, hash_sha256, is_verified, chain_of_custody").execute()
    print(json.dumps(res.data, indent=2))

if __name__ == "__main__":
    check_db()
