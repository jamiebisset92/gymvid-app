from fastapi import FastAPI, UploadFile, File, Form, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from dotenv import load_dotenv
from pydantic import BaseModel
import os
import shutil
import subprocess
import json
import re

# ✅ Import utils and AI modules
from backend.utils.aws_utils import download_file_from_s3
from backend.utils.save_set_to_supabase import save_set_to_supabase
from backend.api.manual_log import router as manual_log_router
from backend.api.upload_profile_image import router as profile_image_router
from backend.api.onboarding import router as onboarding_router
from backend.api.check_username import router as check_username_router
from backend.api.quick_analysis import app as quick_analysis_app
from backend.ai.analyze.feedback_upload import router as feedback_upload_router
from backend.ai.analyze import quick_exercise_prediction
from backend.utils.download_from_s3 import download_video_from_url
from backend.ai.analyze.video_analysis import analyze_video
from backend.ai.analyze.rep_detection import run_rep_detection_from_landmark_y
from backend.ai.analyze.keyframe_exporter import export_keyframes
from backend.ai.analyze.coaching_feedback import generate_feedback
from backend.ai.analyze import analyze_set

# ✅ Load environment variables
load_dotenv()

app = FastAPI()

# ✅ CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ Global error handlers
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={"success": False, "error": "Validation failed", "details": str(exc)}
    )

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(status_code=exc.status_code, content={"success": False, "error": exc.detail})

# ✅ Routers
app.include_router(manual_log_router)
app.include_router(profile_image_router)
app.include_router(onboarding_router)
app.include_router(check_username_router)
app.include_router(quick_analysis_app, prefix="/analyze")
app.include_router(feedback_upload_router, prefix="/analyze")
app.include_router(quick_exercise_prediction.app)

# ✅ AI set analysis
@app.post("/analyze/log_set")
async def log_set(
    video: UploadFile = File(...),
    user_provided_exercise: str = Form(None),
    known_exercise_info: str = Form(None)
):
    os.makedirs("temp_uploads", exist_ok=True)
    temp_video_path = f"temp_uploads/{video.filename}"
    with open(temp_video_path, "wb") as buffer:
        shutil.copyfileobj(video.file, buffer)

    try:
        args = [temp_video_path]
        if user_provided_exercise:
            args.append(user_provided_exercise)
        if known_exercise_info:
            args.append(known_exercise_info)

        final_result = analyze_set.run_cli_args(args)
        save_set_to_supabase(final_result)
        return JSONResponse({"success": True, "data": final_result})
    finally:
        if os.path.exists(temp_video_path):
            os.remove(temp_video_path)

# ✅ Legacy subprocess route
@app.post("/process_set")
async def process_set(
    video: UploadFile = File(None),
    s3_key: str = Form(None),
    coaching: bool = Form(False)
):
    os.makedirs("temp_uploads", exist_ok=True)
    if s3_key:
        save_path = f"temp_uploads/{os.path.basename(s3_key)}"
        success = download_file_from_s3(s3_key, save_path)
        if not success:
            return JSONResponse(status_code=500, content={"success": False, "error": "Failed to download video from S3"})
    elif video:
        save_path = f"temp_uploads/{video.filename}"
        with open(save_path, "wb") as buffer:
            shutil.copyfileobj(video.file, buffer)
    else:
        return JSONResponse(status_code=400, content={"success": False, "error": "No video or S3 key provided"})

    env = os.environ.copy()
    env["GYMVID_MODE"] = "subprocess"
    env["GYMVID_COACHING"] = "true" if coaching else "false"
    env["PYTHONPATH"] = os.path.abspath(".")

    try:
        result = subprocess.run(
            ["python", "backend/ai/analyze/analyze_set.py", save_path],
            capture_output=True,
            text=True,
            check=True,
            env=env
        )
        try:
            match = re.search(r"({.*})", result.stdout.strip(), re.DOTALL)
            if match:
                output = json.loads(match.group(1))
                return JSONResponse({"success": True, "data": output, "stderr": result.stderr})
            else:
                raise ValueError("No valid JSON found in output.")
        except Exception as e:
            return JSONResponse({"success": False, "error": f"Failed to parse JSON: {str(e)}", "stdout": result.stdout, "stderr": result.stderr})
    except subprocess.CalledProcessError as e:
        return JSONResponse(status_code=500, content={"success": False, "error": f"Subprocess failed with exit code {e.returncode}", "stdout": e.stdout, "stderr": e.stderr})

# ✅ Coaching Feedback from video URL
class FeedbackRequest(BaseModel):
    user_id: str
    movement: str
    video_url: str

@app.post("/analyze/feedback")
async def analyze_feedback(request: FeedbackRequest):
    try:
        local_path = download_video_from_url(request.video_url)
        video_data = analyze_video(local_path)
        rep_data = run_rep_detection_from_landmark_y(video_data["raw_y"], video_data["fps"])
        export_keyframes(local_path, rep_data)
        feedback = generate_feedback(
            video_path=local_path,
            user_id=request.user_id,
            video_data={"predicted_exercise": request.movement},
            rep_data=rep_data
        )
        return {"success": True, "feedback": feedback}
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "feedback": {
                "form_rating": 0,
                "observations": [{
                    "observation": "👀 We couldn't process your video.",
                    "tip": "🧠 Try uploading a different angle or clearer rep."
                }],
                "summary": f"👉 Error: {str(e)}"
            }
        }

# ✅ Coaching Feedback from uploaded file
@app.post("/analyze/feedback-file")
async def analyze_feedback_file(
    movement: str = Form(...),
    file: UploadFile = File(...)
):
    os.makedirs("temp_uploads", exist_ok=True)
    temp_path = f"temp_uploads/{file.filename}"
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        video_data = analyze_video(temp_path)
        rep_data = run_rep_detection_from_landmark_y(video_data["raw_y"], video_data["fps"])
        export_keyframes(temp_path, rep_data)
        feedback = generate_feedback(
            video_path=temp_path,
            user_id="anonymous",
            video_data={"predicted_exercise": movement},
            rep_data=rep_data
        )
        return {"success": True, "feedback": feedback}
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "feedback": {
                "form_rating": 0,
                "observations": [{
                    "observation": "👀 We couldn't process your video.",
                    "tip": "🧠 Try uploading a different angle or clearer rep."
                }],
                "summary": f"👉 Error: {str(e)}"
            }
        }
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

# ✅ Debug environment config
@app.get("/debug/env")
def debug_env():
    try:
        import cv2
        opencv_version = cv2.__version__
    except:
        opencv_version = "Not installed"

    try:
        import mediapipe
        mediapipe_version = mediapipe.__version__
    except:
        mediapipe_version = "Not installed"

    return {
        "openai": os.getenv("OPENAI_API_KEY") is not None,
        "aws": os.getenv("AWS_ACCESS_KEY_ID") is not None,
        "bucket": os.getenv("S3_BUCKET_NAME"),
        "opencv_version": opencv_version,
        "mediapipe_version": mediapipe_version,
        "model": os.getenv("GYMVID_AI_MODEL", "gpt-4o"),
    }

# ✅ Run locally
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=10000)
