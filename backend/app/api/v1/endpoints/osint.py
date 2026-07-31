from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from fastapi.responses import StreamingResponse
from app.services.osint_service import OsintService
from pydantic import BaseModel
from typing import List
import hashlib
import io
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

router = APIRouter()

class FindingItem(BaseModel):
    entity: str
    type: str
    source: str
    severity: str
    time: str

class ReportRequest(BaseModel):
    findings: List[FindingItem]

@router.get("/search")
async def search_osint(query: str = Query(..., min_length=2, description="IP, Domain, or Hash to search")):
    """
    Query AlienVault OTX for threat intelligence on a given indicator.
    """
    osint_service = OsintService()
    result = await osint_service.search_indicator(query)
    
    if not result.get("success"):
        # We still return 200 with the error message so the frontend can display it cleanly
        return result
        
    return result


@router.get("/cve")
async def lookup_cve(cve_id: str = Query(..., description="CVE identifier, e.g. CVE-2021-44228")):
    """
    Look up CVE details using the cve.circl.lu public API.
    """
    osint_service = OsintService()
    result = await osint_service.get_cve_details(cve_id.strip())
    return result


@router.get("/exploits")
async def search_exploits(query: str = Query(..., min_length=2, description="Keyword to search Exploit DB")):
    """
    Search for known exploits matching a keyword (e.g. 'wordpress', 'log4j', 'ssh').
    """
    osint_service = OsintService()
    result = await osint_service.search_exploits(query.strip())
    return result


@router.get("/domain")
async def check_domain_reputation(domain: str = Query(..., min_length=3, description="Domain name to check")):
    """
    Check domain reputation, WHOIS metadata, and known threat pulses via AlienVault OTX.
    """
    osint_service = OsintService()
    result = await osint_service.check_domain(domain.strip().lower())
    return result


@router.get("/hash")
async def check_file_hash(hash: str = Query(..., min_length=32, description="MD5, SHA1 or SHA256 file hash")):
    """
    Look up a file hash against AlienVault OTX threat intelligence to check for known malware.
    """
    osint_service = OsintService()
    result = await osint_service.check_hash(hash.strip().lower())
    return result


@router.get("/ip-geo")
async def check_ip_geolocation(ip: str = Query(..., description="IPv4 or IPv6 address to geolocate")):
    """
    Get IP geolocation details including country, city, and ISP.
    """
    osint_service = OsintService()
    result = await osint_service.get_ip_geolocation(ip.strip())
    return result


@router.get("/mac")
async def check_mac_address(mac: str = Query(..., description="MAC address to look up (e.g. 00:11:22:33:44:55)")):
    """
    Look up the hardware vendor for a given MAC address.
    """
    osint_service = OsintService()
    result = await osint_service.lookup_mac_address(mac.strip())
    return result


@router.get("/nmap")
async def run_nmap_scan(
    target: str = Query(..., description="Target IP or Domain"),
    scan_type: str = Query("quick", description="Scan type: quick, full, or os")
):
    """Run an Nmap scan against a target."""
    osint_service = OsintService()
    result = await osint_service.run_nmap(target.strip(), scan_type)
    return result


@router.post("/hash/upload")
async def upload_file_hash(file: UploadFile = File(...)):
    """Calculate file hash and look it up."""
    content = await file.read()
    file_hash = hashlib.sha256(content).hexdigest()
    
    osint_service = OsintService()
    result = await osint_service.check_hash(file_hash)
    if "hash" in result:
        result["filename"] = file.filename
    return result


@router.post("/report")
async def generate_pdf_report(request: ReportRequest):
    """Generate PDF report from OSINT findings."""
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    
    c.setFont("Helvetica-Bold", 16)
    c.drawString(50, 750, "CCID OSINT Intelligence Report")
    
    c.setFont("Helvetica", 10)
    y = 700
    for finding in request.findings:
        c.drawString(50, y, f"Entity: {finding.entity}")
        c.drawString(200, y, f"Type: {finding.type}")
        c.drawString(320, y, f"Severity: {finding.severity}")
        c.drawString(420, y, f"Source: {finding.source}")
        y -= 20
        if y < 50:
            c.showPage()
            c.setFont("Helvetica", 10)
            y = 750

    c.save()
    buffer.seek(0)
    
    return StreamingResponse(buffer, media_type="application/pdf", headers={
        "Content-Disposition": "attachment; filename=osint_report.pdf"
    })

@router.get("/breach")
async def check_breach(email: str = Query(..., description="Email address to check for breaches")):
    """Check if an email has been compromised in a data breach."""
    osint_service = OsintService()
    result = await osint_service.check_breach(email.strip().lower())
    return result

@router.get("/whois")
async def lookup_whois(domain: str = Query(..., description="Domain name for WHOIS lookup")):
    """Perform a WHOIS lookup on a domain."""
    osint_service = OsintService()
    result = await osint_service.lookup_whois(domain.strip().lower())
    return result

