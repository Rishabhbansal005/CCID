import requests
import json

# Try generating a report with an invalid token to see if it reaches the endpoint and returns 401 from OUR updated security.py
try:
    headers = {"Authorization": "Bearer invalid.token.here"}
    data = {
        "case_id": "11111111-1111-1111-1111-111111111111",
        "title": "Test",
        "report_type": "investigation",
        "include_executive_summary": True,
        "include_timeline": True,
        "include_findings": True,
        "include_evidence_list": True,
        "include_risk_assessment": True
    }
    # It should return 401 because the token is invalid, but wait, the log should say "Supabase auth returned 403: ..."
    response = requests.post("http://localhost:8000/api/v1/reports", json=data, headers=headers)
    print(f"Status: {response.status_code}")
    print(f"Data: {response.text}")
except Exception as e:
    print(f"Error: {e}")

