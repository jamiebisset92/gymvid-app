import os
import sys
import json
from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse
import tempfile

# ✅ Add backend directory to path for imports
sys.path.append(os.path.abspath("."))

from backend.ai.analyze.video_analysis import analyze_video
from backend.ai.analyze.rep_detection import run_rep_detection_from_landmark_y

app = FastAPI()

@app.post("/analyze/quick_rep_detection")
async def quick_rep_detection(video: UploadFile = File(...)):
    try:
        # ✅ Save uploaded file to temp
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp:
            tmp.write(await video.read())
            tmp_path = tmp.name

        # ✅ Analyze video
        video_data = analyze_video(tmp_path)
        rep_data = run_rep_detection_from_landmark_y(
            raw_y=video_data["raw_y"],
            fps=video_data["fps"],
            raw_x=video_data.get("raw_x"),
            raw_left_y=video_data.get("raw_left_y"),
            raw_right_y=video_data.get("raw_right_y"),
        )

        # ✅ Filter invalid reps
        valid_reps = []
        for rep in rep_data:
            start = rep.get("start_frame")
            stop = rep.get("stop_frame")
            if start is not None and stop is not None:
                if stop - start >= 2:
                    valid_reps.append(rep)

        return {"rep_count": len(valid_reps)}

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

# ✅ Original CLI support retained
if __name__ == "__main__":
    if len(sys.argv) < 2:
        raise ValueError("No video path provided")

    video_path = sys.argv[1]
    count = quick_rep_detection(video_path)
    print(json.dumps({"rep_count": count}, indent=2))
