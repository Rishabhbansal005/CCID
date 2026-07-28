import logging
from datetime import datetime
from typing import Dict, Any, List
from app.core.supabase_client import get_supabase_admin

logger = logging.getLogger(__name__)

def calculate_risk_level(score: int) -> str:
    if score <= 4:
        return "low"
    elif score <= 9:
        return "medium"
    elif score <= 15:
        return "high"
    else:
        return "critical"

def auto_update_case_risk(case_id: str, system_user_id: str = "system") -> Dict[str, Any]:
    """
    Automatically calculates and updates the risk assessment for a case based on findings and evidence.
    Returns the updated risk assessment record.
    """
    db = get_supabase_admin()
    
    try:
        # 1. Fetch Findings
        findings_res = db.table("findings").select("*").eq("case_id", case_id).execute()
        findings = findings_res.data or []
        
        # 2. Extract Data from Findings
        severity_counts = {"low": 0, "medium": 0, "high": 0, "critical": 0}
        threat_actors = []
        affected_assets = []
        vulnerabilities = []
        mitigation_measures = []
        
        for f in findings:
            sev = f.get("severity", "medium").lower()
            if sev in severity_counts:
                severity_counts[sev] += 1
                
            title = f.get("title", "").lower()
            desc = f.get("description", "").lower()
            
            # Simple heuristic for Threat Actors
            if "apt" in title or "nation-state" in desc:
                if not any(t["name"] == "APT Group" for t in threat_actors):
                    threat_actors.append({"name": "APT Group", "type": "nation-state", "sophistication": "High"})
            elif "ransomware" in title or "ransomware" in desc:
                if not any(t["name"] == "Ransomware Syndicate" for t in threat_actors):
                    threat_actors.append({"name": "Ransomware Syndicate", "type": "criminal", "motivation": "Financial"})
            
            # Simple heuristic for Assets
            if "server" in title or "server" in desc:
                if not any(a["name"] == "Server" for a in affected_assets):
                    affected_assets.append({"name": "Server", "type": "server", "criticality": "high"})
            if "usb" in title or "usb" in desc:
                if not any(a["name"] == "Workstation" for a in affected_assets):
                    affected_assets.append({"name": "Workstation", "type": "workstation", "criticality": "medium"})
            
            # Simple heuristic for Vulnerabilities
            if "cve" in title or "cve" in desc:
                vulnerabilities.append({"name": "Known CVE", "description": f.get("title")})
            elif "injection" in title:
                vulnerabilities.append({"name": "Memory Injection", "description": "Process memory tampering"})
            elif "phishing" in title:
                vulnerabilities.append({"name": "Social Engineering", "description": "Susceptibility to phishing"})
            
            # Mitigations
            if f.get("recommendations"):
                mitigation_measures.append({"name": f"Address {f.get('title')}", "description": f.get("recommendations")})
                
        # Defaults if empty
        if not threat_actors:
            threat_actors.append({"name": "Unknown Threat Actor", "type": "unknown"})
        if not affected_assets:
            affected_assets.append({"name": "Unknown Asset", "type": "unknown", "criticality": "low"})
            
        # Check Correlations
        correlations_res = db.table("correlations").select("*").eq("case_id", case_id).execute()
        correlations = correlations_res.data or []
        
        has_multi_source = False
        has_critical_correlation = False
        
        for c in correlations:
            if len(c.get("related_sources", [])) >= 2:
                has_multi_source = True
            if len(c.get("related_sources", [])) >= 3 or c.get("correlation_severity") == "critical":
                has_critical_correlation = True
                if c.get("enrichment_data", {}).get("threat_category"):
                    tc = c["enrichment_data"]["threat_category"]
                    if not any(t["name"] == tc for t in threat_actors):
                        threat_actors.append({"name": tc, "type": "enriched", "sophistication": "High"})

        # Base likelihood 1. Add based on total findings and threat actor sophistication
        likelihood = 1
        total_findings = len(findings)
        if total_findings > 10:
            likelihood = min(5, likelihood + 3)
        elif total_findings > 5:
            likelihood = min(5, likelihood + 2)
        elif total_findings > 0:
            likelihood = min(5, likelihood + 1)
            
        if any(t.get("type") == "nation-state" for t in threat_actors):
            likelihood = min(5, likelihood + 1)
            
        if has_multi_source:
            likelihood = min(5, likelihood + 1)

        # Base impact 1. Add for critical/high findings
        impact = 1
        if severity_counts["critical"] > 0 or has_critical_correlation:
            impact = 5
        elif severity_counts["high"] > 0 or has_multi_source:
            impact = max(impact, 4)
        elif severity_counts["medium"] > 0:
            impact = max(impact, 3)
        elif severity_counts["low"] > 0:
            impact = max(impact, 2)

        score = likelihood * impact
        risk_level = calculate_risk_level(score)
        
        # 4. Upsert Risk Assessment
        existing = db.table("risk_assessments").select("id").eq("case_id", case_id).execute()
        
        payload = {
            "case_id": case_id,
            "likelihood": likelihood,
            "impact": impact,
            "overall_risk_score": score,
            "risk_level": risk_level,
            "threat_actors": threat_actors,
            "affected_assets": affected_assets,
            "vulnerabilities": vulnerabilities,
            "mitigation_measures": mitigation_measures,
            "assessed_by": system_user_id,
            "assessed_at": datetime.utcnow().isoformat(),
            "analyst_notes": "Auto-generated by system based on case findings."
        }
        
        if existing.data:
            result = db.table("risk_assessments").update(payload).eq("id", existing.data[0]["id"]).execute()
        else:
            result = db.table("risk_assessments").insert(payload).execute()
            
        if result.data:
            logger.info(f"Auto-updated risk for case {case_id}: Score {score} ({risk_level})")
            return result.data[0]
        return None
        
    except Exception as e:
        logger.error(f"Error in auto_update_case_risk: {e}")
        return None
