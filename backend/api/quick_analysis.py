from fastapi import APIRouter, UploadFile, File
from fastapi.responses import JSONResponse
import tempfile
import os

from backend.ai.analyze.exercise_prediction import predict_exercise
from backend.ai.analyze.export_quick_keyframes import export_quick_keyframes

app = APIRouter()

@app.post("/quick_exercise_prediction")
async def quick_exercise_prediction(video: UploadFile = File(...)):
    try:
        # ✅ Save video to temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp:
            tmp.write(await video.read())
            tmp_path = tmp.name

        # ✅ Extract keyframes at 15/30/45/60/75/90% and generate collage
        collage_path = export_quick_keyframes(tmp_path)

        # ✅ Run GPT exercise prediction on collage
        prediction = predict_exercise(collage_path)

        # ✅ Return flattened exercise name
        exercise_name = prediction.get("movement", "Unknown")
        return {"exercise_name": exercise_name}

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
