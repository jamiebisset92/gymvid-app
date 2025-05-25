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
        # ✅ Save video to temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp:
            tmp.write(await video.read())
            tmp_path = tmp.name

        # ✅ Export a collage using 6 evenly spaced frames
        collage_paths = export_evenly_spaced_collage(tmp_path, total_frames=6)
        print("✅ Collage paths:", collage_paths)

        if not collage_paths or not os.path.exists(collage_paths[0]):
            raise FileNotFoundError("Collage image not created or missing.")

        # ✅ Predict exercise from collage
        prediction = predict_exercise(collage_paths[0])

        # ✅ Combine equipment and movement name for frontend use
        equipment = prediction.get("equipment", "")
        movement = prediction.get("movement", "Unknown")
        exercise_name = f"{equipment} {movement}".strip()

        return {"exercise_name": exercise_name}

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
