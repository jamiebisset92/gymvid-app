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

        if response.error:
            print("❌ Supabase update error:", response.error)
            raise HTTPException(status_code=500, detail=str(response.error))

        print("✅ User record updated successfully")

        return {"success": True, "data": response.data}

    except Exception as e:
        print("❌ Exception in /onboard:", str(e))
        raise HTTPException(status_code=500, detail=str(e))
