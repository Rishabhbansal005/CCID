import logging
from typing import List, Dict, Any
from datetime import datetime
from app.core.supabase_client import get_supabase_admin
from app.services.enrichment_provider import enrich_ioc

logger = logging.getLogger(__name__)

def generate_correlations_for_case(case_id: str, current_user_id: str):
    """
    Scans all evidence sources for a case, extracts IOCs, matches them,
    and populates the correlations and attack_chains tables.
    Also auto-generates findings if confidence is high.
    """
    db = get_supabase_admin()
    
    # 1. Fetch all forensic results (gracefully skip tables with schema issues)
    findings = []
    memory_results = []
    network_results = []
    browser_results = []
    usb_results = []
    event_log_results = []

    try:
        findings = db.table("findings").select("*").eq("case_id", case_id).execute().data or []
    except Exception as e:
        logger.warning(f"Could not fetch findings: {e}")

    try:
        memory_results = db.table("memory_analysis_results").select("*").eq("case_id", case_id).execute().data or []
    except Exception as e:
        logger.warning(f"Could not fetch memory_analysis_results: {e}")

    try:
        network_results = db.table("network_analysis_results").select("*").eq("case_id", case_id).execute().data or []
    except Exception as e:
        logger.warning(f"Could not fetch network_analysis_results: {e}")

    try:
        browser_results = db.table("browser_analysis_results").select("*").eq("case_id", case_id).execute().data or []
    except Exception as e:
        logger.warning(f"Could not fetch browser_analysis_results: {e}")

    try:
        usb_results = db.table("usb_analysis_results").select("*").eq("case_id", case_id).execute().data or []
    except Exception as e:
        logger.warning(f"Could not fetch usb_analysis_results: {e}")

    try:
        event_log_results = db.table("event_log_analysis_results").select("*").eq("case_id", case_id).execute().data or []
    except Exception as e:
        logger.warning(f"Could not fetch event_log_analysis_results: {e}")
    
    # Structure to hold discovered IOCs
    # Key: (ioc_string, ioc_type)
    # Value: Dict of sources, findings, evidence, severity
    ioc_map: Dict[tuple, Dict[str, set]] = {}
    
    def add_ioc(ioc: str, ioc_type: str, source: str, evidence_id: str = None, finding_id: str = None):
        if not ioc:
            return
        # Normalize IOC
        ioc = str(ioc).strip()
        key = (ioc, ioc_type)
        if key not in ioc_map:
            ioc_map[key] = {
                "sources": set(),
                "evidence_ids": set(),
                "finding_ids": set()
            }
        ioc_map[key]["sources"].add(source)
        if evidence_id:
            ioc_map[key]["evidence_ids"].add(evidence_id)
        if finding_id:
            ioc_map[key]["finding_ids"].add(finding_id)

    # Extract from Findings
    for f in findings:
        for ind in f.get("ioc_indicators", []):
            val = ind.get("value")
            itype = ind.get("type", "unknown")
            add_ioc(val, itype, "findings", f.get("evidence_id"), f["id"])

    # Extract from Network
    for nr in network_results:
        for ind in nr.get("suspicious_indicators", []):
            add_ioc(ind.get("value"), ind.get("type", "domain"), "network", nr.get("evidence_id"))

    # Extract from Memory
    for mr in memory_results:
        for p in mr.get("suspicious_processes", []):
            add_ioc(p.get("process_name"), "process", "memory", mr.get("evidence_id"))

    # Extract from Browser
    for br in browser_results:
        for url in br.get("suspicious_urls", []):
            add_ioc(url.get("domain") or url.get("url"), "domain", "browser", br.get("evidence_id"))

    # Extract from USB
    for ur in usb_results:
        for dev in ur.get("suspicious_devices", []):
            add_ioc(dev.get("serial") or dev.get("vendor"), "usb_serial", "usb", ur.get("evidence_id"))

    # Extract from Event Logs
    for er in event_log_results:
        for ev in er.get("suspicious_events", []):
            if ev.get("ip_address"):
                add_ioc(ev.get("ip_address"), "ip", "event_logs", er.get("evidence_id"))
            if ev.get("script_block"):
                # We could hash it, or just correlate on the fact that powershell ran
                pass

    # 2. Process correlated IOCs (appear in > 1 source type)
    new_correlations = []
    
    # Get existing correlations
    existing_correlations = db.table("correlations").select("*").eq("case_id", case_id).execute().data or []
    existing_map = {(c["ioc"], c["ioc_type"]): c for c in existing_correlations}

    attack_chain_nodes = []
    attack_chain_edges = []
    
    for (ioc, ioc_type), data in ioc_map.items():
        sources = list(data["sources"])
        evidence_ids = list(filter(None, data["evidence_ids"]))
        finding_ids = list(filter(None, data["finding_ids"]))
        
        # Correlate if the IOC appears in >1 source module OR >1 distinct piece of evidence OR >1 distinct finding
        if len(sources) > 1 or len(evidence_ids) > 1 or len(finding_ids) > 1:
            
            enrichment = enrich_ioc(ioc, ioc_type)
            
            # Base confidence 50, +25 per extra source, + enrichment reputation bonus
            confidence = min(100, 50 + (len(sources) - 1) * 20 + int(enrichment.get("reputation_score", 0) / 5))
            
            # Determine correlation_severity based on confidence and threat_category
            severity = "medium"
            if confidence > 80 or enrichment.get("threat_category") in ["Malware C2 / Phishing", "Ransomware"]:
                severity = "critical"
            elif confidence > 65:
                severity = "high"

            description = f"IOC '{ioc}' ({ioc_type}) was correlated across {len(sources)} sources: {', '.join(sources)}."

            payload = {
                "case_id": case_id,
                "correlation_type": "multi_source_ioc",
                "ioc": ioc,
                "ioc_type": ioc_type,
                "confidence_score": confidence,
                "correlation_severity": severity,
                "related_sources": sources,
                "related_evidence": evidence_ids,
                "related_findings": finding_ids,
                "enrichment_data": enrichment,
                "description": description,
                "updated_at": datetime.utcnow().isoformat()
            }

            key = (ioc, ioc_type)
            if key in existing_map:
                # Update
                c_id = existing_map[key]["id"]
                db.table("correlations").update(payload).eq("id", c_id).execute()
                payload["id"] = c_id
            else:
                # Insert
                res = db.table("correlations").insert(payload).execute()
                if res.data:
                    payload["id"] = res.data[0]["id"]
            
            new_correlations.append(payload)

            # --- Graph Nodes / Edges for Attack Chain ---
            # Node for the IOC
            node_id = f"ioc_{payload.get('id', ioc)}"
            attack_chain_nodes.append({
                "id": node_id,
                "type": "iocNode",
                "data": {"label": ioc, "type": ioc_type, "severity": severity, "confidence": confidence}
            })
            
            for ev_id in evidence_ids:
                edge_id = f"edge_{node_id}_{ev_id}"
                attack_chain_edges.append({
                    "id": edge_id,
                    "source": ev_id,
                    "target": node_id,
                    "label": "Observed In",
                    "animated": True
                })

            # Auto-generate a finding if confidence >= 85 and it's not already in findings
            if confidence >= 85 and "findings" not in sources:
                # Create finding
                finding_payload = {
                    "case_id": case_id,
                    "title": f"Highly Confident Multi-Source IOC: {ioc}",
                    "description": f"Automated correlation engine detected {ioc_type} '{ioc}' across multiple independent sources ({', '.join(sources)}). Enrichment: {enrichment.get('threat_category')}.",
                    "severity": "critical",
                    "status": "open",
                    "category": "other",
                    "ioc_indicators": [{"type": ioc_type, "value": ioc}],
                    "analysis_source": "Correlation Engine",
                    "created_by": current_user_id
                }
                new_finding = db.table("findings").insert(finding_payload).execute()
                
                if new_finding.data:
                    f_id = new_finding.data[0]["id"]
                    db.table("timeline_events").insert({
                        "case_id": case_id,
                        "finding_id": f_id,
                        "event_time": datetime.utcnow().isoformat(),
                        "title": finding_payload["title"],
                        "description": finding_payload["description"],
                        "event_type": "finding",
                        "importance": "critical",
                        "created_by": current_user_id
                    }).execute()
                    
                    # Also link it to the graph
                    attack_chain_edges.append({
                        "id": f"edge_{node_id}_{f_id}",
                        "source": node_id,
                        "target": f_id,
                        "label": "Generated Finding",
                        "animated": True
                    })

    # 3. Build / Update Attack Chains
    if new_correlations:
        # Check if an attack chain already exists
        existing_chain = db.table("attack_chains").select("*").eq("case_id", case_id).execute().data
        
        # Build evidence nodes to complete the graph
        all_ev_ids = set()
        for c in new_correlations:
            for e in c.get("related_evidence", []):
                all_ev_ids.add(e)
                
        for ev_id in all_ev_ids:
            attack_chain_nodes.append({
                "id": ev_id,
                "type": "evidenceNode",
                "data": {"label": f"Evidence {ev_id[:8]}"}
            })

        chain_payload = {
            "case_id": case_id,
            "title": f"Automated Case Correlation Chain",
            "description": f"Graph combining {len(new_correlations)} high-confidence correlations.",
            "severity": "critical" if any(c.get("correlation_severity") == "critical" for c in new_correlations) else "high",
            "nodes": attack_chain_nodes,
            "edges": attack_chain_edges,
            "correlations": [c.get("id") for c in new_correlations if c.get("id")],
            "updated_at": datetime.utcnow().isoformat()
        }
        
        if existing_chain:
            db.table("attack_chains").update(chain_payload).eq("id", existing_chain[0]["id"]).execute()
        else:
            db.table("attack_chains").insert(chain_payload).execute()

    # Trigger risk update as correlations affect risk score
    from app.services.risk_service import auto_update_case_risk
    auto_update_case_risk(case_id, current_user_id)
    
    logger.info(f"Correlation engine completed for case {case_id}. Found {len(new_correlations)} correlations.")

    return new_correlations
