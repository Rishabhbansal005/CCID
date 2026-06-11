import sys
import os

# Add the backend dir to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.supabase_client import get_supabase_admin

supabase = get_supabase_admin()

res = supabase.table("findings").select("id, ioc_indicators").execute()
for f in res.data:
    iocs = f.get("ioc_indicators") or []
    if iocs and isinstance(iocs, list):
        fixed_iocs = []
        needs_fix = False
        for ioc in iocs:
            if "type" not in ioc or "value" not in ioc:
                needs_fix = True
                if "PID" in ioc and "Process" in ioc:
                    fixed_iocs.append({
                        "type": "process",
                        "value": ioc["Process"]
                    })
                else:
                    fixed_iocs.append({
                        "type": "unknown",
                        "value": str(ioc)
                    })
            else:
                fixed_iocs.append(ioc)
        
        if needs_fix:
            print(f"Fixing finding {f['id']}")
            supabase.table("findings").update({"ioc_indicators": fixed_iocs}).eq("id", f["id"]).execute()

print("Done fixing findings!")
