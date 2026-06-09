"""FTK Imager Disk Imaging Adapter — Placeholder"""
from typing import Dict, Any, List, Optional
from app.core.config import settings


class FTKAdapter:
    """
    Adapter for FTK Imager disk imaging tool.
    
    Capabilities (future):
    - Disk image creation (E01, DD, AFF formats)
    - Image verification
    - Logical evidence container creation
    - Mount and browse disk images
    
    Reference: https://www.exterro.com/ftk-imager
    """

    def __init__(self):
        self.api_url = settings.ftk_api_url

    def is_available(self) -> bool:
        return False

    def get_status(self) -> Dict[str, Any]:
        return {
            "tool": "FTK Imager",
            "available": self.is_available(),
            "capabilities": ["disk_imaging", "image_verification", "logical_evidence_containers", "image_mounting"],
            "status": "not_configured",
            "supported_formats": ["E01", "DD", "AFF", "SMART"],
            "integration_notes": "TODO: FTK Imager does not have a native REST API. Consider using CLI wrapper or FTKAPI middleware.",
        }

    async def create_image(self, source_drive: str, output_path: str, format: str = "E01") -> Dict[str, Any]:
        """Create a forensic disk image. TODO: Implement."""
        raise NotImplementedError("TODO: Wrap FTK CLI or implement via AccessData API")

    async def verify_image(self, image_path: str) -> Dict[str, Any]:
        """Verify disk image integrity. TODO: Implement."""
        raise NotImplementedError("TODO: Use FTK's verify option and parse output")

    async def list_files(self, image_path: str, path: str = "/") -> List[Dict[str, Any]]:
        """Browse files in a disk image. TODO: Implement."""
        raise NotImplementedError("TODO: Mount image and traverse file system tree")
