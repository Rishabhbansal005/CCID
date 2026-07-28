import logging
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from app.core.security import get_current_user, require_investigator, CurrentUser
from app.core.supabase_client import get_supabase_admin
from app.models.schemas import CorrelationResponse, AttackChainResponse, MessageResponse
from app.services.correlation_engine import generate_correlations_for_case

router = APIRouter(prefix="/correlations", tags=["Correlations"])
logger = logging.getLogger(__name__)


@router.get("/case/{case_id}", response_model=List[CorrelationResponse])
async def get_correlations_for_case(
    case_id: str,
    current_user: CurrentUser = Depends(get_current_user)
):
    try:
        db = get_supabase_admin()
        # Project only lightweight columns to avoid Cloudflare 400 on large JSONB payloads
        res = db.table("correlations").select(
            "id, case_id, correlation_type, ioc, ioc_type, confidence_score, "
            "correlation_severity, related_sources, related_evidence, related_findings, "
            "description, updated_at, enrichment_data"
        ).eq("case_id", case_id).order("confidence_score", desc=True).execute()
        return res.data or []
    except Exception as e:
        logger.error(f"Error fetching correlations for case {case_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/case/{case_id}/graph")
async def get_correlation_graph(
    case_id: str,
    current_user: CurrentUser = Depends(get_current_user)
):
    """Returns React Flow optimized nodes and edges from attack chains"""
    try:
        db = get_supabase_admin()
        res = db.table("attack_chains").select("*").eq("case_id", case_id).execute()
        data = res.data
        if not data:
            return {"nodes": [], "edges": []}
            
        # Return the most recent or unified graph
        # For simplicity, returning the first chain
        chain = data[0]
        return {
            "nodes": chain.get("nodes", []),
            "edges": chain.get("edges", [])
        }
    except Exception as e:
        logger.error(f"Error fetching correlation graph for case {case_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/case/{case_id}/run", response_model=MessageResponse)
async def run_correlation_engine(
    case_id: str,
    background_tasks: BackgroundTasks,
    current_user: CurrentUser = Depends(require_investigator)
):
    """Manually trigger the correlation engine for a case"""
    try:
        background_tasks.add_task(generate_correlations_for_case, case_id, current_user.id)
        return {"message": "Correlation engine started"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
