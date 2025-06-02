from fastapi import APIRouter, UploadFile, File
from fastapi.responses import JSONResponse
import tempfile
import os
import cv2
import numpy as np

BASE_DISK_PATH = "/mnt/data"

from backend.ai.analyze.exercise_prediction import predict_exercise

app = APIRouter()

def simple_export_evenly_spaced_collage(video_path: str, total_frames: int = 4, output_dir: str = os.path.join(BASE_DISK_PATH, "quick_collages")) -> list:
    """
    Simple, robust collage generation using only OpenCV (no ffmpeg or PIL dependencies)
    """
    try:
        os.makedirs(output_dir, exist_ok=True)
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"Unable to open video: {video_path}")

        frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        if frame_count == 0:
            raise ValueError("Video contains no frames")

        # Determine frame size - portrait or landscape
        vid_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        vid_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        
        if vid_height > vid_width:
            frame_size = (192, 256)  # Portrait
        else:
            frame_size = (256, 192)  # Landscape
            
        # Create 2x2 collage
        collage_width = frame_size[0] * 2
        collage_height = frame_size[1] * 2
        collage = np.zeros((collage_height, collage_width, 3), dtype=np.uint8)

        # Extract 4 evenly spaced frames
        for i in range(total_frames):
            frame_index = int(frame_count * ((i + 1) / (total_frames + 1)))
            cap.set(cv2.CAP_PROP_POS_FRAMES, frame_index)
            ret, frame = cap.read()
            if ret:
                resized = cv2.resize(frame, frame_size)
                # Position in 2x2 grid
                row = i // 2
                col = i % 2
                y_start = row * frame_size[1]
                x_start = col * frame_size[0]
                collage[y_start:y_start + frame_size[1], x_start:x_start + frame_size[0]] = resized

        cap.release()
        
        collage_path = os.path.join(output_dir, "quick_collage.jpg")
        success = cv2.imwrite(collage_path, collage, [cv2.IMWRITE_JPEG_QUALITY, 85])
        
        if not success:
            raise ValueError("Failed to save collage image")
            
        return [collage_path]
        
    except Exception as e:
        print(f"❌ Collage generation error: {str(e)}")
        raise e

@app.post("/quick_exercise_prediction")
async def quick_exercise_prediction(video: UploadFile = File(...)):
    tmp_path = None
    collage_path = None
    try:
        print("🎬 === QUICK EXERCISE PREDICTION STARTED ===")
        
        # Validate file upload
        if not video.filename:
            raise ValueError("No filename provided")
            
        filename = video.filename or "upload.mp4"
        ext = os.path.splitext(filename)[-1].lower()
        if ext not in [".mp4", ".mov", ".webm", ".avi"]:
            ext = ".mp4"

        # Save uploaded video
        tmp_path = os.path.join(BASE_DISK_PATH, f"uploaded_video_{video.filename}")
        with open(tmp_path, "wb") as tmp:

            contents = await video.read()
            if not contents:
                raise ValueError("Uploaded video file is empty or could not be read.")
            tmp.write(contents)

        print(f"📼 Saved temp video to: {tmp_path}")
        print(f"📼 Video size: {len(contents)} bytes")

        # Use simple, robust collage generation
        try:
            collage_paths = simple_export_evenly_spaced_collage(tmp_path, total_frames=4)
            collage_path = collage_paths[0]
        except Exception as collage_error:
            print(f"❌ Primary collage generation failed: {str(collage_error)}")
            # Try fallback method using different approach
            try:
                from backend.ai.analyze.export_quick_keyframes import export_evenly_spaced_collage
                collage_paths = export_evenly_spaced_collage(tmp_path, total_frames=4)
                collage_path = collage_paths[0]
                print("✅ Used fallback collage generation method")
            except Exception as fallback_error:
                print(f"❌ Fallback collage generation also failed: {str(fallback_error)}")
                raise ValueError("Failed to generate video collage with both methods")

        # Validate collage was created
        if not os.path.exists(collage_path):
            raise FileNotFoundError(f"Collage not created at {collage_path}")

        collage_size = os.path.getsize(collage_path)
        if collage_size == 0:
            raise ValueError("Collage file is empty")

        print(f"🖼️ Collage generated: {collage_path} ({collage_size} bytes)")

        # Call exercise prediction with error handling
        try:
            prediction = predict_exercise(collage_path, model="gpt-4o")
        except Exception as prediction_error:
            print(f"❌ AI Prediction failed: {str(prediction_error)}")
            return JSONResponse(status_code=502, content={
                "error": f"AI prediction service error: {str(prediction_error)}",
                "exercise_name": "Unable to Detect: Enter Manually",
                "equipment": "Unknown",
                "variation": "",
                "confidence": 0
            })

        # Handle prediction errors
        if "error" in prediction:
            print(f"⚠️ AI Prediction Error: {prediction['error']}")
            return {
                "exercise_name": "Unable to Detect: Enter Manually",
                "equipment": "Unknown", 
                "variation": "",
                "confidence": 0,
                "prediction_details": prediction
            }

        # Ensure safe access to prediction results
        exercise_name = prediction.get("movement") or "Unknown"
        equipment = prediction.get("equipment") or "Unknown"
        variation = prediction.get("variation") or ""
        confidence = prediction.get("confidence", 0)

        print(f"🎯 Predicted: {exercise_name} using {equipment} (variation: {variation}, confidence: {confidence})")

        return {
            "exercise_name": exercise_name,
            "equipment": equipment,
            "variation": variation,
            "confidence": confidence,
            "prediction_details": prediction
        }

    except Exception as e:
        import traceback
        error_msg = str(e)
        print(f"❌ Error in quick_exercise_prediction: {error_msg}")
        print(f"❌ Full traceback: {traceback.format_exc()}")
        
        # Return graceful error response instead of 500
        return JSONResponse(status_code=200, content={
            "exercise_name": "Unable to Detect: Enter Manually",
            "equipment": "Unknown",
            "variation": "",
            "confidence": 0,
            "error": error_msg,
            "prediction_details": {"error": error_msg}
        })

    finally:
        # Cleanup temp files
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
                print(f"🧹 Cleaned up temp file: {tmp_path}")
            except Exception as cleanup_error:
                print(f"⚠️ Failed to cleanup temp file: {cleanup_error}")
        
        if collage_path and os.path.exists(collage_path):
            try:
                # Keep collage for debugging in development, remove in production
                if os.getenv("ENVIRONMENT") == "production":
                    os.remove(collage_path)
                    print(f"🧹 Cleaned up collage: {collage_path}")
            except Exception as cleanup_error:
                print(f"⚠️ Failed to cleanup collage: {cleanup_error}")


@app.post("/test_exercise_prediction")
async def test_exercise_prediction():
    """Test endpoint to verify prediction pipeline using existing collage"""
    try:
        test_collage_path = os.path.join(BASE_DISK_PATH, "quick_collages", "quick_collage.jpg")

        if not os.path.exists(test_collage_path):
            return JSONResponse(status_code=404, content={
                "error": "No test collage found. Run quick_exercise_prediction first."
            })

        prediction = predict_exercise(test_collage_path, model="gpt-4o")

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
