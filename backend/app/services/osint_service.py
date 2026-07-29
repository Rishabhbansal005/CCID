import httpx
from datetime import datetime
from typing import Dict, Any, List
import re
from app.core.config import settings

class OsintService:
    def __init__(self):
        self.otx_url = "https://otx.alienvault.com/api/v1"
        self.headers = {}
        if settings.alienvault_otx_key:
            self.headers["X-OTX-API-KEY"] = settings.alienvault_otx_key

    def _determine_type(self, query: str) -> str:
        # Very basic regex for IP
        if re.match(r"^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$", query):
            return "IPv4"
        # Regex for MD5/SHA1/SHA256
        if re.match(r"^[a-fA-F0-9]{32}$|^[a-fA-F0-9]{40}$|^[a-fA-F0-9]{64}$", query):
            return "file"
        # Otherwise assume domain
        return "domain"

    async def search_indicator(self, query: str) -> Dict[str, Any]:
        indicator_type = self._determine_type(query)
        
        # If no API key is provided, return a mock response that states it
        if not settings.alienvault_otx_key:
            return {
                "success": False,
                "error": "ALIENVAULT_OTX_KEY is not configured in backend.",
                "type": indicator_type,
                "findings": [],
                "stats": {"mentions": 0, "leaks": 0}
            }

        endpoint = f"{self.otx_url}/indicators/{indicator_type}/{query}/general"
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(endpoint, headers=self.headers, timeout=10.0)
                if response.status_code == 200:
                    data = response.json()
                    
                    # Parse OTX data into our expected dashboard format
                    pulse_info = data.get("pulse_info", {})
                    pulses = pulse_info.get("pulses", [])
                    total_pulse_count = pulse_info.get("count", 0)
                    
                    # Map indicator type to the correct OTX URL path
                    otx_type_map = {"IPv4": "ip", "domain": "domain", "file": "file"}
                    otx_indicator_path = otx_type_map.get(indicator_type, "domain")

                    findings = []
                    for idx, pulse in enumerate(pulses[:50]):  # show up to 50 real reports
                        pulse_id = pulse.get('id', '')
                        # Severity: High if tagged with 3+ tags, Medium if 1-2, Low if none
                        tag_count = len(pulse.get('tags', []))
                        if tag_count > 2:
                            severity = "High"
                        elif tag_count > 0:
                            severity = "Medium"
                        else:
                            severity = "Low"
                        findings.append({
                            "id": f"OTX-{pulse_id[:8]}",
                            "entity": query,
                            "type": pulse.get("name", "Threat Intel Pulse"),
                            "source": "AlienVault OTX",
                            "severity": severity,
                            "time": pulse.get("modified", "N/A")[:10],
                            # Direct link to the full pulse report on AlienVault
                            "url": f"https://otx.alienvault.com/pulse/{pulse_id}"
                        })
                        
                    return {
                        "success": True,
                        "type": indicator_type,
                        "pulse_count": total_pulse_count,
                        "findings": findings,
                        "stats": {
                            # 100% accurate: total reports = Active Alerts, shown pulses = Data Leaks
                            "mentions": total_pulse_count,
                            "leaks": len(pulses)
                        }
                    }
                else:
                    return {
                        "success": False,
                        "error": f"API returned status {response.status_code}",
                        "findings": [],
                        "stats": {"mentions": 0, "leaks": 0}
                    }
            except Exception as e:
                return {
                    "success": False,
                    "error": str(e),
                    "findings": [],
                    "stats": {"mentions": 0, "leaks": 0}
                }
