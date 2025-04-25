import os
import sys
import json
import cv2
import numpy as np
from dotenv import load_dotenv

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
from backend.ai.analyze.keyframe_exporter import export_keyframes

# ✅ Entry point
if len(sys.argv) < 2:
    raise ValueError("No video path provided")

video_path = sys.argv[1]

# ✅ Optional: CLI overrides
user_provided_exercise = None
known_exercise_info = None

if len(sys.argv) >= 3:
    user_provided_exercise = sys.argv[2]  # Example: "Deadlift"
if len(sys.argv) >= 4:
    try:
        known_exercise_info = json.loads(sys.argv[3])  # Should be a JSON string
    except json.JSONDecodeError:
        known_exercise_info = None

# ✅ Run each stage
log("📹 Analyzing video...")
video_data = analyze_video(video_path)

log("🔁 Detecting reps...")
rep_data = detect_reps(video_data)

log("🖼️ Exporting keyframes...")
keyframe_paths = export_keyframes(video_path, rep_data)

# ✅ Decide exercise source
if known_exercise_info:
    log(f"🔒 Using known exercise info from parent exercise: {known_exercise_info}")
    exercise_prediction = known_exercise_info
elif user_provided_exercise:
    log(f"🏋️ Using manually provided exercise: {user_provided_exercise}")
    exercise_prediction = {
        "equipment": "Barbell",  # Assumed default unless specified manually
        "variation": None,        # No variation unless added manually later
        "movement": user_provided_exercise,
        "confidence": 100         # 100% confidence because user manually entered it
    }
else:
    log("🧠 Predicting exercise type...")
    exercise_prediction = predict_exercise("keyframes")

log("⚖️ Estimating weight...")
weight_prediction = estimate_weight("keyframes", exercise_prediction["movement"])

log("📦 Packaging result...")
final_result = package_result(rep_data, exercise_prediction, weight_prediction)

# ✅ Optional: Coaching feedback
if INCLUDE_FEEDBACK:
    log("🗣️ Generating coaching feedback...")
    feedback = generate_feedback(video_data, rep_data)
    final_result["coaching_feedback"] = feedback

# ✅ Output results
if IS_SUBPROCESS:
    sys.stdout = open(1, 'w')
    print(json.dumps(final_result))
else:
    print(json.dumps(final_result, indent=2))
