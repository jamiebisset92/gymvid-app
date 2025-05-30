from fastapi import APIRouter, UploadFile, File
from fastapi.responses import JSONResponse
import tempfile
import os

from backend.ai.analyze.exercise_prediction import predict_exercise
from backend.ai.analyze.export_quick_keyframes import export_evenly_spaced_collage

app = APIRouter()

@app.post("/quick_exercise_prediction")
async def quick_exercise_prediction(video: UploadFile = File(...)):
    tmp_path = None
    collage_path = None
    try:
        filename = video.filename or "upload.mp4"
        ext = os.path.splitext(filename)[-1].lower()
        if ext not in [".mp4", ".mov", ".webm"]:
            ext = ".mp4"

        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
            contents = await video.read()
            if not contents:
                raise ValueError("Uploaded video file is empty or could not be read.")
            tmp.write(contents)
            tmp_path = tmp.name

        print("📼 Temp video saved to:", tmp_path)
        print("📼 Video size:", len(contents), "bytes")

        collage_paths = export_evenly_spaced_collage(tmp_path, total_frames=4)
        collage_path = collage_paths[0]
        
        print(f"🖼️ Collage created at: {collage_path}")
        
        if not os.path.exists(collage_path):
            raise ValueError(f"Collage file not created at {collage_path}")
        
        collage_size = os.path.getsize(collage_path)
        print(f"🖼️ Collage size: {collage_size} bytes")
        
        if collage_size == 0:
            raise ValueError("Collage file is empty")

        prediction = predict_exercise(collage_path)

        if "error" in prediction:
            print(f"⚠️ Prediction error: {prediction['error']}")
            return JSONResponse(status_code=502, content={
                "error": prediction["error"],
                "prediction_details": prediction
            })

        exercise_name = prediction.get("movement", "Unknown")

        print(f"🎯 Exercise prediction result: {prediction}")

        return {
            "exercise_name": exercise_name,
            "prediction_details": prediction
        }

    except Exception as e:
        import traceback
        print(f"❌ Error in quick_exercise_prediction: {str(e)}")
        print(f"❌ Traceback: {traceback.format_exc()}")
        return JSONResponse(status_code=500, content={"error": str(e), "traceback": traceback.format_exc()})
    
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)
        # Uncomment if you want to delete the collage as well
        # if collage_path and os.path.exists(collage_path):
        #     os.remove(collage_path)


@app.post("/test_exercise_prediction")
async def test_exercise_prediction():
    """Test endpoint to verify prediction pipeline using existing collage"""
    try:
        test_collage_path = "quick_collages/quick_collage.jpg"
        
        if not os.path.exists(test_collage_path):
            return JSONResponse(status_code=404, content={
                "error": "No test collage found. Please run quick_exercise_prediction first."
            })
        
        prediction = predict_exercise(test_collage_path)
        
        return {
            "test_result": "success",
            "prediction": prediction,
            "collage_path": test_collage_path,
            "collage_exists": os.path.exists(test_collage_path),
            "collage_size": os.path.getsize(test_collage_path)
        }
        
    except Exception as e:
        import traceback
        return JSONResponse(status_code=500, content={
            "error": str(e),
            "traceback": traceback.format_exc()
        })
