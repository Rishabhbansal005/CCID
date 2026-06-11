import random

def enrich_ioc(ioc: str, ioc_type: str) -> dict:
    """
    Mock Enrichment Provider.
    In the future, this abstraction will connect to VirusTotal, AbuseIPDB, or MISP.
    """
    # Simple deterministic mock based on IOC string
    has_evil = "evil" in ioc.lower() or "mal" in ioc.lower()
    
    if has_evil:
        reputation = random.randint(10, 40)
        category = "Malware C2 / Phishing"
        confidence = "High"
    else:
        reputation = random.randint(60, 100)
        category = "Benign"
        confidence = "Low"
        
    # Some hardcoded specific examples
    if "powershell" in ioc.lower():
        reputation = 50
        category = "Dual-Use Tool"
        confidence = "Medium"
        
    return {
        "reputation_score": reputation,
        "threat_category": category,
        "confidence_level": confidence,
        "provider": "MockIntel",
        "timestamp": "now"
    }
