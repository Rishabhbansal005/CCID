"""Quick script to verify dashboard data is in the DB"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

from app.core.supabase_client import get_supabase_admin

db = get_supabase_admin()

cases_res = db.table("cases").select("id, status, priority, created_at").execute()
cases = cases_res.data or []
print(f"Total Cases: {len(cases)}")
active = sum(1 for c in cases if c.get("status") in ("investigating", "active"))
open_c = sum(1 for c in cases if c.get("status") == "open")
closed = sum(1 for c in cases if c.get("status") == "closed")
print(f"  open={open_c}, active={active}, closed={closed}")

ev_res = db.table("evidence").select("id", count="exact").execute()
print(f"Evidence: count={ev_res.count}, data_len={len(ev_res.data or [])}")

f_res = db.table("findings").select("id, severity").execute()
findings = f_res.data or []
print(f"Findings: {len(findings)}, critical={sum(1 for f in findings if f.get('severity')=='critical')}")

reports_res = db.table("reports").select("id", count="exact").execute()
print(f"Reports: count={reports_res.count}")

corr_res = db.table("correlations").select("id, correlation_severity").execute()
correlations = corr_res.data or []
print(f"Correlations: {len(correlations)}")

users_res = db.table("users").select("id, email, role").execute()
print(f"Users: {len(users_res.data or [])}")
for u in (users_res.data or [])[:3]:
    print(f"  - {u.get('email')} role={u.get('role')}")
