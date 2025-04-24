import sys
import os
import json
import cv2
import numpy as np
from dotenv import load_dotenv
from backend.ai.analyze.video_analysis import analyze_video
from backend.ai.analyze.rep_detection import detect_reps
from backend.ai.analyze.keyframe_exporter import export_keyframes
from backend.ai.analyze.exercise_prediction import predict_exercise
from backend.ai.analyze.weight_estimation import estimate_weight
from backend.ai.analyze.coaching_feedback import generate_feedback
from backend.ai.analyze.result_packager import package_result

# ✅ Load environment
load_dotenv()

# ✅ Parse args
if len(sys.argv) < 2:
    raise ValueError("Video path argument is required")

video_path = sys.argv[1]
IS_SUBPROCESS = os.getenv("GYMVID_MODE") == "subprocess"
INCLUDE_COACHING = os.getenv("GYMVID_COACHING") == "true"

# ✅ Logging helper
def log(msg):
    if not IS_SUBPROCESS:
        print(msg)

# ✅ Step 1: Analyze video
log("🎥 Analyzing video...")
fps, landmark_data = analyze_video(video_path)

# ✅ Step 2: Rep detection
log("🔁 Detecting reps...")
rep_data = detect_reps(landmark_data, fps)

# ✅ Step 3: Export keyframes
log("🖼️ Exporting keyframes...")
keyframe_dir = "keyframes"
keyframes = export_keyframes(video_path, rep_data, keyframe_dir)

# ✅ Step 4: Exercise prediction
log("🤖 Predicting exercise...")
exercise_prediction = predict_exercise(keyframes)

# ✅ Step 5: Estimate weight
log("🏋️ Estimating weight...")
weight_prediction = estimate_weight(keyframes)

# ✅ Step 6 (Optional): Coaching feedback
coaching_feedback = None
if INCLUDE_COACHING:
    log("🗣️ Generating coaching feedback...")
    coaching_feedback = generate_feedback(rep_data, exercise_prediction["exercise"])

# ✅ Step 7: Package result
log("📦 Packaging results...")
final_result = package_result(rep_data, exercise_prediction, weight_prediction, coaching_feedback)

# ✅ Output results
try:
    log("✅ Final output ready, about to print JSON")

    if IS_SUBPROCESS:
        sys.stdout = open(1, 'w')  # subprocess-safe
        print(json.dumps(final_result))
        sys.exit(0)
    else:
        print(json.dumps(final_result, indent=2))

except Exception as e:
    error_output = {
        "success": False,
        "error": f"Failed to serialize final_output: {str(e)}"
    }

    if IS_SUBPROCESS:
        sys.stdout = open(1, 'w')
        print(json.dumps(error_output))
        sys.exit(1)
    else:
        print(json.dumps(error_output, indent=2))
