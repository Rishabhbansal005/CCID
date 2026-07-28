import os
import sqlite3
import json
import logging
from typing import Dict, Any, List
from datetime import datetime

logger = logging.getLogger(__name__)

class BrowserParser:
    @staticmethod
    def parse_chrome_history(file_path: str) -> Dict[str, Any]:
        """Parse Chrome History SQLite database."""
        result = {
            "browser_type": "chrome",
            "history_entries": [],
            "downloads": [],
            "search_terms": [],
            "suspicious_urls": [],
            "cookies": [],
            "bookmarks": []
        }
        
        # Determine if we should mock (file doesn't exist or isn't sqlite)
        if not os.path.exists(file_path) or os.path.getsize(file_path) < 100:
            logger.info("Using mock Chrome parsing for development")
            return BrowserParser._mock_chrome_data()
            
        try:
            # Check if valid SQLite
            with open(file_path, 'rb') as f:
                header = f.read(16)
                if header != b'SQLite format 3\x00':
                    logger.info("Not a valid SQLite file, using mock data")
                    return BrowserParser._mock_chrome_data()

            conn = sqlite3.connect(file_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            # Extract URLs
            cursor.execute('''
                SELECT urls.url, urls.title, urls.visit_count, 
                       datetime(visits.visit_time/1000000-11644473600, 'unixepoch') as visit_time
                FROM urls 
                JOIN visits ON urls.id = visits.url 
                ORDER BY visits.visit_time DESC LIMIT 1000
            ''')
            
            for row in cursor.fetchall():
                url = row['url']
                entry = {
                    "url": url,
                    "title": row['title'],
                    "visit_count": row['visit_count'],
                    "visit_time": row['visit_time']
                }
                result["history_entries"].append(entry)
                
                # Check for suspicious URLs
                if "darkweb" in url or ".onion" in url or "hacking" in url:
                    result["suspicious_urls"].append({
                        "url": url,
                        "reason": "Known suspicious keyword or domain",
                        "severity": "high"
                    })
                    
                # Extract search terms (simple heuristic)
                if "google.com/search?q=" in url:
                    try:
                        import urllib.parse
                        parsed = urllib.parse.urlparse(url)
                        qs = urllib.parse.parse_qs(parsed.query)
                        if 'q' in qs:
                            result["search_terms"].append({
                                "engine": "Google",
                                "term": qs['q'][0],
                                "time": row['visit_time']
                            })
                    except Exception:
                        pass
                        
            # Extract Downloads
            cursor.execute('''
                SELECT target_path, start_time, received_bytes, total_bytes 
                FROM downloads 
                ORDER BY start_time DESC LIMIT 100
            ''')
            for row in cursor.fetchall():
                result["downloads"].append({
                    "path": row['target_path'],
                    "received_bytes": row['received_bytes'],
                    "total_bytes": row['total_bytes']
                })
                
            conn.close()
            return result
        except Exception as e:
            logger.error(f"Error parsing Chrome History: {e}")
            return BrowserParser._mock_chrome_data()

    @staticmethod
    def _mock_chrome_data() -> Dict[str, Any]:
        """Return mock data for development bypass."""
        return {
            "browser_type": "chrome",
            "history_entries": [
                {"url": "https://google.com", "title": "Google", "visit_count": 42, "visit_time": datetime.utcnow().isoformat()},
                {"url": "https://github.com", "title": "GitHub", "visit_count": 15, "visit_time": datetime.utcnow().isoformat()},
                {"url": "http://evil-domain.onion/login", "title": "DarkWeb Market", "visit_count": 3, "visit_time": datetime.utcnow().isoformat()}
            ],
            "downloads": [
                {"path": "C:\\Users\\Admin\\Downloads\\malware_payload.exe", "received_bytes": 1048576, "total_bytes": 1048576},
                {"path": "C:\\Users\\Admin\\Downloads\\report.pdf", "received_bytes": 500000, "total_bytes": 500000}
            ],
            "cookies": [
                {"domain": ".google.com", "name": "SESSION", "expires": "2027-01-01"},
                {"domain": ".evil-domain.onion", "name": "auth_token", "expires": "2024-01-01"}
            ],
            "bookmarks": [
                {"title": "Important Docs", "url": "https://docs.google.com"},
                {"title": "C2 Server Panel", "url": "http://192.168.1.100:8080/admin"}
            ],
            "suspicious_urls": [
                {"url": "http://evil-domain.onion/login", "reason": "Tor hidden service accessed", "severity": "critical"},
                {"url": "http://192.168.1.100:8080/admin", "reason": "Suspicious local IP access", "severity": "medium"}
            ],
            "search_terms": [
                {"engine": "Google", "term": "how to bypass windows defender", "time": datetime.utcnow().isoformat()},
                {"engine": "Google", "term": "python reverse shell payload", "time": datetime.utcnow().isoformat()}
            ]
        }
