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

        # ✅ Export a collage using 4 evenly spaced frames (matching the default)
        collage_paths = export_evenly_spaced_collage(tmp_path, total_frames=4)

        # ✅ Predict exercise from collage
        prediction = predict_exercise(collage_paths[0])

        # ✅ Flatten prediction name for frontend use
        exercise_name = prediction.get("movement", "Unknown")
        
        # Log the prediction for debugging
        print(f"🎯 Exercise prediction result: {prediction}")

        return {"exercise_name": exercise_name, "prediction_details": prediction}

    except Exception as e:
        print(f"❌ Error in quick_exercise_prediction: {str(e)}")
        return JSONResponse(status_code=500, content={"error": str(e)})
    finally:
        # Clean up temp file
        if 'tmp_path' in locals() and os.path.exists(tmp_path):
            os.remove(tmp_path)
