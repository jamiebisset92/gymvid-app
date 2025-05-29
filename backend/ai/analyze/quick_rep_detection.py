import os
import sys
import json
import tempfile
from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse

# ✅ Ensure backend modules can be imported
sys.path.append(os.path.abspath("."))

from backend.ai.analyze.video_analysis import analyze_video
from backend.ai.analyze.rep_detection import run_rep_detection_from_landmark_y

app = FastAPI()

@app.post("/analyze/quick_rep_detection")
async def quick_rep_detection(video: UploadFile = File(...)):
    tmp_path = None
    try:
        # ✅ Determine extension and preserve it (e.g., .mov, .webm)
        filename = video.filename or "upload.mp4"
        ext = os.path.splitext(filename)[-1].lower()
        if ext not in [".mp4", ".mov", ".webm"]:
            ext = ".mp4"

        # ✅ Save uploaded file to temp
        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
            contents = await video.read()
            if not contents:
                raise ValueError("Uploaded video file is empty.")
            tmp.write(contents)
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
            if start is not None and stop is not None and stop - start >= 2:
                valid_reps.append(rep)

        return {
            "rep_count": len(valid_reps),
            "reps": valid_reps,
            "fps": video_data.get("fps"),
            "best_landmark": video_data.get("best_landmark")
        }

    except Exception as e:
        import traceback
        return JSONResponse(status_code=500, content={
            "error": str(e),
            "traceback": traceback.format_exc()
        })
    
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)

# ✅ CLI support for dev/debugging
if __name__ == "__main__":
    if len(sys.argv) < 2:
        raise ValueError("No video path provided")

    video_path = sys.argv[1]
    video_data = analyze_video(video_path)
    rep_data = run_rep_detection_from_landmark_y(
        raw_y=video_data["raw_y"],
        fps=video_data["fps"],
        raw_x=video_data.get("raw_x"),
        raw_left_y=video_data.get("raw_left_y"),
        raw_right_y=video_data.get("raw_right_y"),
    )

    valid_reps = [
        rep for rep in rep_data
        if rep.get("start_frame") is not None and
           rep.get("stop_frame") is not None and
           rep["stop_frame"] - rep["start_frame"] >= 2
    ]

    print(json.dumps({"rep_count": len(valid_reps), "reps": valid_reps}, indent=2))
