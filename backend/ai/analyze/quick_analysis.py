import os
import sys
import json
import cv2
import numpy as np
from dotenv import load_dotenv

# ✅ Load environment variables
load_dotenv()

# ✅ Logging
def log(msg):
    print(msg)

# ✅ Add backend directory to path for imports
sys.path.append(os.path.abspath("."))

# ✅ Import necessary core functions
from backend.ai.analyze.video_analysis import analyze_video
from backend.ai.analyze.rep_detection import detect_reps
from backend.ai.analyze.exercise_prediction import predict_exercise
from backend.ai.analyze.keyframe_collage import export_keyframe_collages

# ✅ Core function for ultra-fast onboarding analysis
def quick_analyze(video_path):
    log("📹 Quick analysis started...")

    # ✅ Step 1: Run pose detection (slimmed down if possible)
    video_data = analyze_video(video_path)

    # ✅ Step 2: Basic rep detection only (no RPE, tempo, etc.)
    rep_data = detect_reps(video_data)
    rep_count = len(rep_data)

    # ✅ Step 3: Export keyframe collage (limit to 2 reps for speed)
    collage_paths = export_keyframe_collages(video_path, rep_data[:2])

    # ✅ Step 4: Predict exercise using a single collage image
    prediction = predict_exercise(collage_paths[0])

    # ✅ Flatten prediction to just a name string
    if isinstance(prediction, dict) and "movement" in prediction:
        exercise_name = prediction["movement"]
    elif isinstance(prediction, str):
        exercise_name = prediction
    else:
        exercise_name = "Unknown"

    # ✅ Return trimmed result
    return {
        "exercise_name": exercise_name,
        "rep_count": rep_count
    }

# ✅ CLI entry point
if __name__ == "__main__":
    if len(sys.argv) < 2:
        raise ValueError("No video path provided")

    video_path = sys.argv[1]
    result = quick_analyze(video_path)
    print(json.dumps(result, indent=2))
