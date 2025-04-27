import os
from supabase import create_client
from dotenv import load_dotenv

# ✅ Load environment variables
load_dotenv()

# ✅ Initialize Supabase client
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

# ✅ Save analyzed set into Supabase
def save_set_to_supabase(data):
    try:
        movement = data["exercise_prediction"]["movement"]
        equipment = data["exercise_prediction"]["equipment"]
        weight_kg = data["weight_estimation"]["estimated_weight_kg"]
        reps = len(data["rep_data"])
        effort_metric_type = "RPE"
        effort_metric_value = data["rep_data"][0]["estimated_RPE"] if data["rep_data"] else None

        record = {
            "movement": movement,
            "equipment": equipment,
            "weight_kg": weight_kg,
            "weight_unit": "kg",  # Always kg after conversion
            "effort_metric_type": effort_metric_type,
            "effort_metric_value": effort_metric_value,
            "reps": reps,
            "video_url": None  # No URL in auto logs (unless added later)
        }

        insert_result = supabase.table("logged_sets").insert(record).execute()

        if insert_result.error:
            return {"error": str(insert_result.error)}
        return {"data": insert_result.data[0]}

    except Exception as e:
        return {"error": str(e)}

# ✅ Save manual entry into Supabase
def save_manual_log_to_supabase(data):
    try:
        insert_result = supabase.table("manual_logs").insert(data).execute()

        if insert_result.error:
            return {"error": str(insert_result.error)}
        return {"data": insert_result.data[0]}

    except Exception as e:
        return {"error": str(e)}
