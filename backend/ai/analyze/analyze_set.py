import os
import sys
import json
import cv2
import numpy as np
from dotenv import load_dotenv
from concurrent.futures import ThreadPoolExecutor

# ✅ Load environment variables
load_dotenv()

# ✅ Set environment flags
IS_SUBPROCESS = os.getenv("GYMVID_MODE") == "subprocess"
INCLUDE_FEEDBACK = os.getenv("GYMVID_COACHING") == "true"

# ✅ Logging
def log(msg):
    if not IS_SUBPROCESS:
        print(msg)

# ✅ Add backend directory to path for imports
sys.path.append(os.path.abspath("."))

# ✅ Import modules
from backend.ai.analyze.video_analysis import analyze_video
from backend.ai.analyze.rep_detection import detect_reps
from backend.ai.analyze.exercise_prediction import predict_exercise
from backend.ai.analyze.weight_estimation import estimate_weight_from_keyframes as estimate_weight
from backend.ai.analyze.coaching_feedback import generate_feedback
from backend.ai.analyze.result_packager import package_result
from backend.ai.analyze.keyframe_collage import export_keyframe_collages

# ✅ Core function to run analysis
def run_cli_args(args):
    if len(args) < 1:
        raise ValueError("No video path provided.")

    video_path = args[0]
    user_provided_exercise = None
    known_exercise_info = None

    if len(args) >= 2:
        user_provided_exercise = args[1]
    if len(args) >= 3 and args[2]:
        try:
            known_exercise_info = json.loads(args[2])
        except (json.JSONDecodeError, TypeError):
            known_exercise_info = None

    # ✅ Run each stage
    log("📹 Analyzing video...")
    video_data = analyze_video(video_path)

    log("🔁 Detecting reps...")
    rep_data = detect_reps(video_data)

    log("🖼️ Creating keyframe collages...")
    collage_paths = export_keyframe_collages(video_path, rep_data)

    # ✅ Decide exercise source
    if known_exercise_info:
        log(f"🔒 Using known exercise info from parent exercise: {known_exercise_info}")
        exercise_prediction = known_exercise_info
        movement_name = exercise_prediction.get("movement")
        weight_prediction = estimate_weight("keyframes", movement_name)
    elif user_provided_exercise:
        log(f"🏋️ Using manually provided exercise: {user_provided_exercise}")
        exercise_prediction = {
            "equipment": "Barbell",
            "variation": None,
            "movement": user_provided_exercise,
            "confidence": 100
        }
        movement_name = user_provided_exercise
        weight_prediction = estimate_weight("keyframes", movement_name)
    else:
        log("🧠 Predicting exercise type and estimating weight in parallel...")
        with ThreadPoolExecutor() as executor:
            future_exercise = executor.submit(predict_exercise, collage_paths[0])
            # temporarily assign placeholder; will extract movement from exercise_prediction
            exercise_prediction = future_exercise.result()

        movement_name = exercise_prediction.get("movement")
        if not movement_name:
            if "error" in exercise_prediction:
                raise ValueError(f"Exercise prediction failed: {exercise_prediction['error']}")
            else:
                raise ValueError(f"Missing 'movement' in exercise prediction output: {exercise_prediction}")

        # run weight estimation after movement is confirmed
        weight_prediction = estimate_weight("keyframes", movement_name)

    log("📦 Packaging result...")
    final_result = package_result(rep_data, exercise_prediction, weight_prediction)
    final_result["collage_paths"] = collage_paths

    # ✅ Optional: Coaching feedback
    if INCLUDE_FEEDBACK:
        log("🗣️ Generating coaching feedback...")
        feedback = generate_feedback(video_data, rep_data, collage_paths)
        final_result["coaching_feedback"] = feedback

    return final_result

# ✅ CLI entry point - only runs if called directly
if __name__ == "__main__":
    if len(sys.argv) < 2:
        raise ValueError("No video path provided")

    video_path = sys.argv[1]
    user_provided_exercise = None
    known_exercise_info = None

    if len(sys.argv) >= 3:
        user_provided_exercise = sys.argv[2]
    if len(sys.argv) >= 4:
        try:
            known_exercise_info = json.loads(sys.argv[3])
        except (json.JSONDecodeError, TypeError):
            known_exercise_info = None

    final_result = run_cli_args([video_path, user_provided_exercise, known_exercise_info])
    print(json.dumps(final_result, indent=2))
