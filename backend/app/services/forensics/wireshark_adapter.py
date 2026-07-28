"""Wireshark / pyshark Network Analysis Adapter"""
import os
import pyshark
import tempfile
import asyncio
from typing import Dict, Any, List, Optional
from collections import defaultdict
import logging

logger = logging.getLogger(__name__)

class WiresharkAdapter:
    """
    Adapter for Wireshark/tshark network capture analysis using pyshark.
    Extracts:
    - Source/Destination IP conversations
    - DNS queries
    - Protocol statistics
    - Suspicious indicators
    """

    def is_available(self) -> bool:
        import shutil
        return shutil.which("tshark") is not None

    async def analyze_pcap(self, pcap_path: str) -> Dict[str, Any]:
        """
        Parse a PCAP file and return full network analysis.
        """
        logger.info(f"Starting PCAP analysis for {pcap_path}")
        
        protocol_stats = defaultdict(int)
        conversations = defaultdict(lambda: {"packets": 0, "bytes": 0})
        dns_queries = []
        suspicious_indicators = []

        try:
            # We run pyshark parsing in a thread to avoid blocking the asyncio loop completely,
            # though pyshark uses its own async loop under the hood.
            def _parse():
                asyncio.set_event_loop(asyncio.new_event_loop())
                
                # Check where tshark is for macOS
                tshark_path = "/Applications/Wireshark.app/Contents/MacOS/tshark"
                if not os.path.exists(tshark_path):
                    import shutil
                    tshark_path = shutil.which("tshark") or "tshark"

                capture = pyshark.FileCapture(pcap_path, keep_packets=False, tshark_path=tshark_path)
                for pkt in capture:
                    # 1. Protocol Stats
                    highest_layer = pkt.highest_layer
                    protocol_stats[highest_layer] += 1

                    # 2. IP Conversations
                    if hasattr(pkt, 'ip'):
                        src = pkt.ip.src
                        dst = pkt.ip.dst
                        length = int(pkt.length)
                        conv_key = tuple(sorted([src, dst]))
                        conversations[conv_key]["packets"] += 1
                        conversations[conv_key]["bytes"] += length

                        # Suspicious IP checks (basic mock logic)
                        # Flag excessive traffic or known bad subnets (mocked)
                    
                    # 3. DNS Queries
                    if hasattr(pkt, 'dns') and hasattr(pkt.dns, 'qry_name'):
                        query = pkt.dns.qry_name
                        if query not in [q["query"] for q in dns_queries]:
                            dns_queries.append({"query": query, "type": pkt.dns.qry_type if hasattr(pkt.dns, 'qry_type') else "Unknown"})
                            
                            # Suspicious indicator: .onion or weird TLDs
                            if query.endswith(".onion"):
                                suspicious_indicators.append({
                                    "type": "domain",
                                    "value": query,
                                    "reason": "TOR Network DNS Request"
                                })

                capture.close()

            await asyncio.to_thread(_parse)

            # Format conversations
            formatted_convs = []
            for (ip1, ip2), stats in conversations.items():
                formatted_convs.append({
                    "ip_a": ip1,
                    "ip_b": ip2,
                    "packets": stats["packets"],
                    "bytes": stats["bytes"]
                })
            
            # Sort top talkers by bytes
            formatted_convs.sort(key=lambda x: x["bytes"], reverse=True)

            return {
                "protocol_stats": dict(protocol_stats),
                "conversations": formatted_convs[:100],  # Limit to top 100
                "dns_queries": dns_queries[:500], # Limit to 500
                "suspicious_indicators": suspicious_indicators
            }

        except Exception as e:
            logger.error(f"Error parsing PCAP: {e}")
            raise
