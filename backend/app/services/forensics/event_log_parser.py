import logging
import json
from datetime import datetime
from typing import Dict, Any, List
try:
    import Evtx.Evtx as evtx
    import Evtx.Views as e_views
    import xml.etree.ElementTree as ET
except ImportError:
    evtx = None

logger = logging.getLogger(__name__)

class EventLogParser:
    @staticmethod
    def parse_evtx(file_path: str, original_file_name: str) -> Dict[str, Any]:
        """Parse Windows EVTX files for critical security events."""
        results = {
            "suspicious_events": [],
            "timeline_events": [],
            "analysis_summary": {
                "total_records_parsed": 0,
                "logins_successful": 0,
                "logins_failed": 0,
                "rdp_events": 0,
                "powershell_events": 0,
            }
        }
        
        if evtx is None:
            logger.error("python-evtx library is not installed.")
            return results
            
        try:
            with evtx.Evtx(file_path) as log:
                for record in log.records():
                    results["analysis_summary"]["total_records_parsed"] += 1
                    xml_str = record.xml()
                    try:
                        # Namespaces can make simple ET parsing annoying, so we strip them or handle them
                        root = ET.fromstring(xml_str)
                        # Find EventID
                        ns = {'ns': 'http://schemas.microsoft.com/win/2004/08/events/event'}
                        event_id_elem = root.find('.//ns:EventID', ns)
                        if event_id_elem is None:
                            continue
                            
                        event_id = int(event_id_elem.text)
                        
                        time_elem = root.find('.//ns:TimeCreated', ns)
                        timestamp = time_elem.attrib.get('SystemTime') if time_elem is not None else datetime.utcnow().isoformat()
                        
                        event_data = {}
                        for data_elem in root.findall('.//ns:EventData/ns:Data', ns):
                            name = data_elem.attrib.get('Name')
                            if name:
                                event_data[name] = data_elem.text
                        
                        EventLogParser._process_event(event_id, timestamp, event_data, results)

                    except ET.ParseError:
                        continue
        except Exception as e:
            logger.error(f"Error parsing EVTX file {file_path}: {e}")
            raise
            
        return results

    @staticmethod
    def _process_event(event_id: int, timestamp: str, event_data: dict, results: dict):
        # 4624: Successful Logon
        if event_id == 4624:
            logon_type = event_data.get("LogonType")
            ip_address = event_data.get("IpAddress", "")
            user = event_data.get("TargetUserName", "Unknown")
            
            results["analysis_summary"]["logins_successful"] += 1
            
            if logon_type == "10": # RDP
                results["analysis_summary"]["rdp_events"] += 1
                results["suspicious_events"].append({
                    "type": "rdp_logon",
                    "timestamp": timestamp,
                    "user": user,
                    "ip_address": ip_address,
                    "severity": "high",
                    "description": f"Successful RDP Logon (Type 10) for user {user} from IP {ip_address}"
                })
            elif logon_type == "9": # NewCredentials (Pass the Hash)
                results["suspicious_events"].append({
                    "type": "pth_logon",
                    "timestamp": timestamp,
                    "user": user,
                    "ip_address": ip_address,
                    "severity": "critical",
                    "description": f"NewCredentials Logon (Type 9) detected for user {user}. This is highly indicative of Pass-the-Hash (Mimikatz) activity."
                })
                
            results["timeline_events"].append({
                "event_type": "login_success",
                "timestamp": timestamp,
                "description": f"Successful Logon (Type {logon_type}) for user {user}",
                "ip_address": ip_address
            })

        # 4625: Failed Logon
        elif event_id == 4625:
            user = event_data.get("TargetUserName", "Unknown")
            ip_address = event_data.get("IpAddress", "")
            results["analysis_summary"]["logins_failed"] += 1
            
            results["suspicious_events"].append({
                "type": "failed_logon",
                "timestamp": timestamp,
                "user": user,
                "ip_address": ip_address,
                "severity": "medium",
                "description": f"Failed Logon for user {user} from IP {ip_address}"
            })
            
            results["timeline_events"].append({
                "event_type": "login_failed",
                "timestamp": timestamp,
                "description": f"Failed Logon for user {user}",
                "ip_address": ip_address
            })

        # 4104: PowerShell Script Block
        elif event_id == 4104:
            script_block = event_data.get("ScriptBlockText", "")
            results["analysis_summary"]["powershell_events"] += 1
            
            is_suspicious = any(k in script_block.lower() for k in ['iex', 'invoke-', 'hidden', 'bypass', 'enc'])
            
            if is_suspicious:
                results["suspicious_events"].append({
                    "type": "malicious_powershell",
                    "timestamp": timestamp,
                    "severity": "critical",
                    "description": f"Suspicious PowerShell execution detected: {script_block[:100]}...",
                    "script_block": script_block
                })
            
            results["timeline_events"].append({
                "event_type": "powershell_execution",
                "timestamp": timestamp,
                "description": f"PowerShell Script Block Logging (Event 4104)",
            })
            
        # 21, 24, 25: TerminalServices-LocalSessionManager
        elif event_id in [21, 24, 25]:
            user = event_data.get("User", "Unknown")
            address = event_data.get("SourceNetworkAddress", "")
            results["analysis_summary"]["rdp_events"] += 1
            
            desc_map = {21: "Logon", 24: "Disconnected", 25: "Reconnected"}
            action = desc_map.get(event_id, "Unknown")
            
            results["timeline_events"].append({
                "event_type": "rdp_session",
                "timestamp": timestamp,
                "description": f"RDP Session {action} for {user} from {address}",
                "ip_address": address
            })
