from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend.utils.supabase_client import supabase
from backend.utils.user_utils import calculate_age_category, calculate_weight_class

router = APIRouter()

class OnboardingPayload(BaseModel):
    user_id: str
    date_of_birth: str   # Format: YYYY-MM-DD
    gender: str
    country: str
    bodyweight: float
    unit_pref: str       # "kg" or "lb"

@router.post("/onboard")
def onboard_user(payload: OnboardingPayload):
    try:
        # Calculate classifications
        age_category = calculate_age_category(payload.date_of_birth)
        weight_class = calculate_weight_class(
            weight=payload.bodyweight,
            gender=payload.gender,
            unit_pref=payload.unit_pref
        )

        # Update Supabase user record
        response = supabase.table("users").update({
            "date_of_birth": payload.date_of_birth,
            "gender": payload.gender,
            "country": payload.country,
            "bodyweight": payload.bodyweight,
            "unit_pref": payload.unit_pref,
            "age_category": age_category,
            "weight_class": weight_class
        }).eq("id", payload.user_id).execute()

        return {"success": True, "data": response.data}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
