from pathlib import Path

# Define the new main script that glues everything together
analyze_set_script = '''\
import os
import sys
from dotenv import load_dotenv

from backend.ai.analyze.video_analysis import analyze_video
from backend.ai.analyze.rep_detection import detect_reps
from backend.ai.analyze.exercise_prediction import predict_exercise
from backend.ai.analyze.weight_estimator import estimate_weight
from backend.ai.analyze.coaching_feedback import generate_feedback
from backend.ai.analyze.result_packager import package_results

# ✅ Load environment variables
load_dotenv()
IS_SUBPROCESS = os.getenv("GYMVID_MODE") == "subprocess"
COACHING_ENABLED = os.getenv("GYMVID_COACHING") == "true"

def log(msg):
    if not IS_SUBPROCESS:
        print(msg)

# ✅ Get video path
if len(sys.argv) < 2:
    raise ValueError("Missing required video path argument.")
video_path = sys.argv[1]

# ✅ Step 1: Analyze video
log("🔍 Analyzing video...")
video_meta = analyze_video(video_path)

# ✅ Step 2: Detect reps
log("🔁 Detecting reps...")
rep_data = detect_reps(video_path, video_meta)

# ✅ Step 3: Predict exercise
log("🏋️ Predicting exercise...")
exercise_prediction = predict_exercise()

# ✅ Step 4: Estimate weight
log("⚖️ Estimating weight...")
weight_estimation = estimate_weight()

# ✅ Step 5: Optional coaching feedback
coaching_feedback = None
if COACHING_ENABLED:
    log("🎤 Generating coaching feedback...")
    coaching_feedback = generate_feedback(rep_data, exercise_prediction)

# ✅ Step 6: Package results
log("📦 Packaging results...")
final_result = package_results(rep_data, exercise_prediction, weight_estimation, coaching_feedback)

# ✅ Output results
import json
if IS_SUBPROCESS:
    sys.stdout = open(1, 'w')
    print(json.dumps(final_result))
else:
    print(json.dumps(final_result, indent=2))
'''

# Write to a new file
script_path = Path("gymvid-app/backend/ai/analyze/analyze_set.py")
script_path.parent.mkdir(parents=True, exist_ok=True)
script_path.write_text(analyze_set_script)

script_path
