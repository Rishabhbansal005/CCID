from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth,
    cases,
    evidence,
    findings,
    timeline,
    risk,
    reports,
    network_analysis,
    memory_analysis
)
from app.services.forensics import VolatilityAdapter, WiresharkAdapter, AutopsyAdapter, FTKAdapter

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth.router)
api_router.include_router(cases.router)
api_router.include_router(evidence.router)
api_router.include_router(findings.router)
api_router.include_router(timeline.router)
api_router.include_router(risk.router)
api_router.include_router(reports.router)
api_router.include_router(network_analysis.router, prefix="/forensics")
api_router.include_router(memory_analysis.router, prefix="/forensics")


@api_router.get("/health", tags=["Health"])
async def health_check():
    """API health check endpoint."""
    return {
        "status": "healthy",
        "version": "1.0.0",
        "service": "CCID Backend API",
    }


@api_router.get("/forensics/tools", tags=["Forensics"])
async def list_forensic_tools():
    """List available forensic tool integrations and their status."""
    tools = [
        VolatilityAdapter().get_status(),
        WiresharkAdapter().get_status(),
        AutopsyAdapter().get_status(),
        FTKAdapter().get_status(),
    ]
    return {
        "tools": tools,
        "available_count": sum(1 for t in tools if t.get("available")),
        "total_count": len(tools),
    }
