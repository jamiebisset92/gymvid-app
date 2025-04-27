import os
from supabase import create_client
from dotenv import load_dotenv

# ✅ Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

def save_set_to_supabase(final_result, video_url=None, workout_id=None):
    if not final_result:
        print("❌ No data to save.")
        return None

    # ✅ Extract pieces from final result
    exercise_prediction = final_result.get("exercise_prediction", {})
    weight_estimation = final_result.get("weight_estimation", {})
    rep_data = final_result.get("rep_data", [])
    coaching_feedback = final_result.get("coaching_feedback", {})

    # ✅ Handle missing fields
    movement = exercise_prediction.get("movement")
    equipment = exercise_prediction.get("equipment")
    exercise_confidence = exercise_prediction.get("confidence")
    weight_kg = weight_estimation.get("estimated_weight_kg")
    weight_confidence = weight_estimation.get("confidence")

    # ✅ Calculate effort (average across reps)
    rpe = None
    rir = None
    tut = None
    rep_count = len(rep_data)

    if rep_count > 0:
        rpe_values = [rep.get("estimated_RPE") for rep in rep_data if rep.get("estimated_RPE") is not None]
        rir_values = [rep.get("estimated_RIR") for rep in rep_data if rep.get("estimated_RIR") is not None]
        tut_values = [rep.get("total_TUT") for rep in rep_data if rep.get("total_TUT") is not None]

        if rpe_values:
            rpe = sum(rpe_values) / len(rpe_values)
        if tut_values:
            tut = sum(tut_values) / len(tut_values)
        
        # RIR is tricky because it's text ("Possibly 1-2 Reps in the Tank")
        # We'll leave rir as NULL for now unless we later want to parse it more deeply.

    # ✅ Build payload
    payload = {
        "exercise": movement,
        "equipment": equipment,
        "weight_kg": weight_kg,
        "weight_confidence": weight_confidence,
        "exercise_confidence": exercise_confidence,
        "rpe": rpe,
        "rir": None,  # Left empty for now
        "tut": tut,
        "rep_count": rep_count,
        "video_url": video_url,
        "landmark_used": "head",  # For now we always use head tracking
        "coach_feedback": coaching_feedback.get("summary") if coaching_feedback else None,
        "workout_id": workout_id,
    }

    print("📦 Saving to Supabase sets table:", payload)

    # ✅ Insert into Supabase
    try:
        result = supabase.table("sets").insert(payload).execute()
        print("✅ Set saved successfully:", result.data)
        return result.data
    except Exception as e:
        print("❌ Error saving set:", str(e))
        return None
