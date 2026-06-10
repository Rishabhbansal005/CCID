import os
import sys
import json
import asyncio
from dotenv import load_dotenv

sys.path.append("/Users/rishabhbansal/Desktop/CBS/backend")
load_dotenv("/Users/rishabhbansal/Desktop/CBS/backend/.env")

from app.api.v1.endpoints.evidence import verify_evidence_integrity
from app.core.security import CurrentUser
import logging

logging.basicConfig(level=logging.DEBUG)

async def test_verify():
    user = CurrentUser(id="31a52d65-5205-459e-b246-9523855e371a", email="test@test.com", role="admin", full_name="Test User")
    try:
        res = await verify_evidence_integrity("c404c11d-a4e1-470a-b83d-09fdaa370326", current_user=user)
        print("Success:")
        print(res)
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    asyncio.run(test_verify())
