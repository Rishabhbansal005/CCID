from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
import logging

from app.core.security import get_current_user, CurrentUser
from app.services.ml_service import ThreatMLService

router = APIRouter(prefix="/ml", tags=["Machine Learning Intelligence"])
logger = logging.getLogger(__name__)

class MLPredictRequest(BaseModel):
    indicator: str
    indicator_type: Optional[str] = "domain"
    otx_data: Optional[Dict[str, Any]] = None

@router.post("/predict-threat")
async def predict_threat_risk(
    req: MLPredictRequest,
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    Predict threat risk score & classification using trained Scikit-Learn Random Forest model.
    """
    if not req.indicator or not req.indicator.strip():
        raise HTTPException(status_code=400, detail="Indicator parameter is required.")

    service = ThreatMLService()
    result = service.predict_indicator_risk(
        indicator=req.indicator,
        indicator_type=req.indicator_type or "domain",
        otx_data=req.otx_data
    )
    return result
