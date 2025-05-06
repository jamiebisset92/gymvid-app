from fastapi import FastAPI, UploadFile, File, Form, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from dotenv import load_dotenv
import os
import shutil
import subprocess
import json

# ✅ Import utils, AI modules, and routers
from backend.utils.aws_utils import download_file_from_s3
from backend.utils.save_set_to_supabase import save_set_to_supabase
from backend.ai.analyze import analyze_set
from backend.api.manual_log import router as manual_log_router

# ✅ Load environment variables
load_dotenv()

# ✅ Initialize FastAPI app
app = FastAPI()

# ✅ Add JSON Exception Handlers
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "error": "Validation failed",
            "details": exc.errors(),
        },
    )

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "error": exc.detail},
    )

# ✅ CORS (for frontend or mobile app)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ Mount routers
app.include_router(manual_log_router)

# ✅ Legacy subprocess-based analysis route
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
            output = json.loads(result.stdout.strip())
            return JSONResponse({
                "success": True,
                "data": output,
                "stderr": result.stderr
            })
        except json.JSONDecodeError as e:
            return JSONResponse({
                "success": False,
                "error": f"Failed to parse JSON: {str(e)}",
                "stdout": result.stdout,
                "stderr": result.stderr
            })

    except subprocess.CalledProcessError as e:
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": f"Subprocess failed with exit code {e.returncode}",
                "stdout": e.stdout,
                "stderr": e.stderr
            }
        )

# ✅ Analyze and log a set (AI-based)
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

        # ✅ Save this set to Supabase
        save_set_to_supabase(final_result)

        return JSONResponse({
            "success": True,
            "data": final_result
        })

    finally:
        if os.path.exists(temp_video_path):
            os.remove(temp_video_path)

# ✅ Debug environment
@app.get("/debug/env")
def debug_env():
    return {
        "openai": os.getenv("OPENAI_API_KEY") is not None,
        "aws": os.getenv("AWS_ACCESS_KEY_ID") is not None,
        "bucket": os.getenv("S3_BUCKET_NAME"),
    }

# ✅ Local dev mode
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=10000)
