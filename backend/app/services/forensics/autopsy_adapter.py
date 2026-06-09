"""Autopsy Digital Forensics REST API Adapter — Placeholder"""
from typing import Dict, Any, List, Optional
from app.core.config import settings


class AutopsyAdapter:
    """
    Adapter for Autopsy digital forensics platform REST API.
    
    Capabilities (future):
    - Case creation and management via Autopsy REST API
    - Artifact extraction
    - File system analysis
    - Timeline generation
    - Keyword search
    
    Reference: https://www.autopsy.com/support/developer-docs/
    """

    def __init__(self):
        self.api_url = settings.autopsy_api_url

    def is_available(self) -> bool:
        # TODO: Ping Autopsy REST API health endpoint
        return False

    def get_status(self) -> Dict[str, Any]:
        return {
            "tool": "Autopsy",
            "available": self.is_available(),
            "api_url": self.api_url,
            "capabilities": ["case_management", "artifact_extraction", "file_system_analysis", "keyword_search", "timeline_generation"],
            "status": "not_configured",
            "integration_notes": "TODO: Start Autopsy with REST API mode and configure AUTOPSY_API_URL",
        }

    async def create_case(self, case_name: str, case_dir: str) -> Dict[str, Any]:
        """Create an Autopsy case via REST API. TODO: Implement."""
        raise NotImplementedError("TODO: POST to Autopsy REST /cases endpoint")

    async def add_data_source(self, case_id: str, image_path: str) -> Dict[str, Any]:
        """Add a disk image as a data source. TODO: Implement."""
        raise NotImplementedError("TODO: POST to Autopsy REST /cases/{id}/datasources endpoint")

    async def get_artifacts(self, case_id: str, artifact_type: Optional[str] = None) -> List[Dict[str, Any]]:
        """Retrieve extracted artifacts. TODO: Implement."""
        raise NotImplementedError("TODO: GET Autopsy REST /cases/{id}/artifacts endpoint")
