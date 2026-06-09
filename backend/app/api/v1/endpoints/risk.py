from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.security import get_current_user, require_investigator, CurrentUser
from app.core.supabase_client import get_supabase_admin
from app.models.schemas import (
    RiskAssessmentCreate, RiskAssessmentUpdate, RiskAssessmentResponse
)
import logging

router = APIRouter(prefix="/risk", tags=["Risk Assessment"])
logger = logging.getLogger(__name__)

RISK_LEVEL_MAP = {
    (1, 4): "low",
    (5, 9): "medium",
    (10, 15): "high",
    (16, 25): "critical",
}


def calculate_risk_level(score: int) -> str:
    if score <= 4:
        return "low"
    elif score <= 9:
        return "medium"
    elif score <= 15:
        return "high"
    else:
        return "critical"


@router.get("/case/{case_id}", response_model=RiskAssessmentResponse)
async def get_risk_assessment(
    case_id: str,
    current_user: CurrentUser = Depends(get_current_user),
):
    try:
        db = get_supabase_admin()
        result = db.table("risk_assessments").select("*").eq("case_id", case_id).single().execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="No risk assessment found for this case")
        return result.data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("", response_model=RiskAssessmentResponse, status_code=status.HTTP_201_CREATED)
async def create_risk_assessment(
    data: RiskAssessmentCreate,
    current_user: CurrentUser = Depends(require_investigator),
):
    try:
        db = get_supabase_admin()
        score = data.likelihood * data.impact
        payload = data.model_dump(exclude_none=True)
        payload["overall_risk_score"] = score
        payload["risk_level"] = calculate_risk_level(score)
        payload["assessed_by"] = current_user.id
        payload["assessed_at"] = datetime.utcnow().isoformat()

        # Serialize lists
        for field in ["threat_actors", "affected_assets", "vulnerabilities", "mitigation_measures"]:
            if field in payload:
                payload[field] = [
                    item if isinstance(item, dict) else item.model_dump()
                    for item in payload[field]
                ]

        result = db.table("risk_assessments").insert(payload).execute()
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create risk assessment")
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/case/{case_id}", response_model=RiskAssessmentResponse)
async def update_risk_assessment(
    case_id: str,
    update_data: RiskAssessmentUpdate,
    current_user: CurrentUser = Depends(require_investigator),
):
    try:
        db = get_supabase_admin()
        payload = update_data.model_dump(exclude_none=True)

        # Recalculate score if likelihood or impact changed
        existing = db.table("risk_assessments").select("likelihood, impact").eq("case_id", case_id).single().execute()
        if existing.data:
            likelihood = payload.get("likelihood", existing.data["likelihood"])
            impact = payload.get("impact", existing.data["impact"])
            score = likelihood * impact
            payload["overall_risk_score"] = score
            payload["risk_level"] = calculate_risk_level(score)

        payload["assessed_by"] = current_user.id
        payload["assessed_at"] = datetime.utcnow().isoformat()

        result = db.table("risk_assessments").update(payload).eq("case_id", case_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Risk assessment not found")
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
