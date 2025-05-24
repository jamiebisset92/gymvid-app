from fastapi import APIRouter, UploadFile, File
from fastapi.responses import JSONResponse
import tempfile
import os

from backend.api.quick_analysis import quick_analyze
from backend.ai.analyze.video_analysis import analyze_video
from backend.ai.analyze.rep_detection import run_rep_detection_from_landmark_y

app = APIRouter()

@app.post("/quick_exercise_prediction")
async def quick_exercise_prediction(video: UploadFile = File(...)):
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp:
            tmp.write(await video.read())
            tmp_path = tmp.name

        result = quick_analyze(tmp_path)
        return JSONResponse(result)

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.post("/quick_rep_detection")
async def quick_rep_detection(video: UploadFile = File(...)):
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp:
            tmp.write(await video.read())
            tmp_path = tmp.name

        video_data = analyze_video(tmp_path)
        rep_data = run_rep_detection_from_landmark_y(
            raw_y=video_data["raw_y"],
            fps=video_data["fps"],
            raw_x=video_data.get("raw_x"),
            raw_left_y=video_data.get("raw_left_y"),
            raw_right_y=video_data.get("raw_right_y"),
        )

        valid_reps = [rep for rep in rep_data if rep.get("start_frame") and rep.get("stop_frame") and rep["stop_frame"] - rep["start_frame"] >= 2]
        return {"rep_count": len(valid_reps)}

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
