from fastapi import APIRouter, UploadFile, File
from fastapi.responses import JSONResponse
import tempfile
import os

from backend.ai.analyze.exercise_prediction import predict_exercise
from backend.ai.analyze.export_quick_keyframes import export_evenly_spaced_collage

app = APIRouter()

@app.post("/quick_exercise_prediction")
async def quick_exercise_prediction(video: UploadFile = File(...)):
    try:
        # ✅ Save video to a temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp:
            contents = await video.read()
            if not contents:
                raise ValueError("Uploaded video file is empty or could not be read.")
            tmp.write(contents)
            tmp_path = tmp.name

        print("📼 Temp video saved to:", tmp_path)

        # ✅ Export a collage using 6 evenly spaced frames
        collage_paths = export_evenly_spaced_collage(tmp_path, total_frames=6)

        # ✅ Predict exercise from collage
        prediction = predict_exercise(collage_paths[0])

        # ✅ Flatten prediction name for frontend use
        exercise_name = prediction.get("movement", "Unknown")

        return {"exercise_name": exercise_name}

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
