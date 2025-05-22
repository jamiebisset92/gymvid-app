from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend.utils.supabase_client import supabase
from backend.utils.user_utils import calculate_age_category, calculate_weight_class

router = APIRouter()

# Helper function to safely check for error in Supabase response
def has_error(response):
    """
    Safely check if a Supabase response contains an error.
    Works with different versions of the Supabase Python client.
    """
    # Case 1: Direct error attribute
    if hasattr(response, 'error') and response.error:
        return True
    
    # Case 2: Error in data dictionary
    if hasattr(response, 'data') and isinstance(response.data, dict) and 'error' in response.data:
        return True
    
    # Case 3: Response is itself an error dict
    if isinstance(response, dict) and 'error' in response:
        return True
    
    return False

# Define the onboarding payload model
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
        # 🔍 Debug: show incoming data
        print("✅ Received onboarding payload:", payload.dict())

        # 🧠 Generate classification fields
        age_category = calculate_age_category(payload.date_of_birth)
        weight_class = calculate_weight_class(
            weight=payload.bodyweight,
            gender=payload.gender,
            unit_pref=payload.unit_pref
        )

        # 🔍 Debug: show calculated results
        print("📊 Calculated age_category:", age_category)
        print("📊 Calculated weight_class:", weight_class)

        # 📝 Prepare update object
        update_data = {
            "date_of_birth": payload.date_of_birth,
            "gender": payload.gender,
            "country": payload.country,
            "bodyweight": payload.bodyweight,
            "unit_pref": payload.unit_pref,
            "age_category": age_category,
            "weight_class": weight_class,
            "onboarding_complete": True
        }
        
        print("📤 Final update payload:", update_data)

        # 🔄 Update user record in Supabase
        response = supabase.table("users") \
            .update(update_data) \
            .eq("id", payload.user_id) \
            .execute()

        # Safe error checking
        if has_error(response):
            print("❌ Supabase update error:", response)
            # Include fallback data in the error response so frontend can still use it
            error_detail = {"message": "Supabase update failed", "fallback_data": {
                "age_category": age_category,
                "weight_class": weight_class
            }}
            raise HTTPException(status_code=500, detail=error_detail)
        
        # Return success with the calculated values
        return {
            "success": True,
            "data": {
                "age_category": age_category,
                "weight_class": weight_class,
                "user_id": payload.user_id,
                "onboarding_complete": True
            }
        }
    except Exception as e:
        print("❌ Error in onboarding:", str(e))
        # Always include fallback data in the error response
        return {
            "success": False,
            "error": str(e),
            "fallback_data": {
                "age_category": calculate_age_category(payload.date_of_birth),
                "weight_class": calculate_weight_class(
                    weight=payload.bodyweight,
                    gender=payload.gender,
                    unit_pref=payload.unit_pref
                )
            }
        }

@router.post("/onboard-fallback")
def onboard_user_fallback(payload: OnboardingPayload):
    """
    Fallback endpoint that calculates age_category and weight_class without 
    attempting to update Supabase. This is used as a last resort when the main
    endpoint fails due to Supabase client issues.
    """
    try:
        # 🔍 Debug: show incoming data
        print("✅ [FALLBACK] Received onboarding payload:", payload.dict())

        # 🧠 Generate classification fields
        age_category = calculate_age_category(payload.date_of_birth)
        weight_class = calculate_weight_class(
            weight=payload.bodyweight,
            gender=payload.gender,
            unit_pref=payload.unit_pref
        )

        # 🔍 Debug: show calculated results
        print("📊 [FALLBACK] Calculated age_category:", age_category)
        print("📊 [FALLBACK] Calculated weight_class:", weight_class)

        # Return the calculated values directly without trying to update Supabase
        return {
            "success": True,
            "data": {
                "age_category": age_category,
                "weight_class": weight_class,
                "user_id": payload.user_id,
                "onboarding_complete": True
            }
        }
    except Exception as e:
        print("❌ [FALLBACK] Error in fallback onboarding:", str(e))
        return {
            "success": False,
            "error": str(e)
        }
