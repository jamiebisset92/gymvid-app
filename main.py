from fastapi import FastAPI, UploadFile, File, Form
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
import shutil
import subprocess
import json

# ✅ Import your utils and AI modules
from backend.utils.aws_utils import download_file_from_s3
from backend.utils.supabase_client import save_set_to_supabase
from backend.ai.analyze import analyze_set

# ✅ Load environment variables from .env file
load_dotenv()

# ✅ Initialize FastAPI app
app = FastAPI()

# ✅ Optional: Enable CORS (for mobile app or frontend dev)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Change later for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ Process Set (legacy route, subprocess)
@app.post("/process_set")
async def process_set(
    video: UploadFile = File(None),
    s3_key: str = Form(None),
    coaching: bool = Form(False)
):
    os.makedirs("temp_uploads", exist_ok=True)

    if s3_key:
        # ✅ Download from S3
        save_path = f"temp_uploads/{os.path.basename(s3_key)}"
        success = download_file_from_s3(s3_key, save_path)
        if not success:
            return JSONResponse(status_code=500, content={"success": False, "error": "Failed to download video from S3"})
    elif video:
        # ✅ Save uploaded file
        save_path = f"temp_uploads/{video.filename}"
        with open(save_path, "wb") as buffer:
            shutil.copyfileobj(video.file, buffer)
    else:
        return JSONResponse(status_code=400, content={"success": False, "error": "No video file or s3_key provided"})

    # ✅ Set environment variables for subprocess
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

            # ✅ Save to Supabase
            save_set_to_supabase(output)

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

# ✅ New - Log Set (direct function call, better pipeline)
@app.post("/analyze/log_set")
async def log_set(
    video: UploadFile = File(...),
    user_provided_exercise: str = Form(None),
    known_exercise_info: str = Form(None)
):
    os.makedirs("temp_uploads", exist_ok=True)

    # ✅ Save uploaded video temporarily
    temp_video_path = f"temp_uploads/{video.filename}"
    with open(temp_video_path, "wb") as buffer:
        shutil.copyfileobj(video.file, buffer)

    try:
        # ✅ Prepare args list
        args = [temp_video_path]
        if user_provided_exercise:
            args.append(user_provided_exercise)
        if known_exercise_info:
            args.append(known_exercise_info)

        # ✅ Run clean GymVid analysis (no subprocess)
        final_result = analyze_set.run_cli_args(args)

        # ✅ Save to Supabase
        save_set_to_supabase(final_result)

        return JSONResponse({
            "success": True,
            "data": final_result
        })

    finally:
        # ✅ Clean up the temp video no matter what
        if os.path.exists(temp_video_path):
            os.remove(temp_video_path)

# ✅ Debug endpoint for environment (optional)
@app.get("/debug/env")
def debug_env():
    return {
        "openai": os.getenv("OPENAI_API_KEY") is not None,
        "aws": os.getenv("AWS_ACCESS_KEY_ID") is not None,
        "bucket": os.getenv("S3_BUCKET_NAME"),
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=10000)
