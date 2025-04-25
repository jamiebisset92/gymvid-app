from fastapi import FastAPI, UploadFile, File, Form
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
import os
import shutil
import subprocess
import json
from backend.utils.aws_utils import download_file_from_s3

# ✅ Load environment variables from .env file
load_dotenv()

# ✅ Initialize FastAPI app
app = FastAPI()

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

    # ✅ Add environment variables to signal subprocess mode
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

# ✅ Debug endpoint for environment
@app.get("/debug/env")
def debug_env():
    return {
        "openai": os.getenv("OPENAI_API_KEY") is not None,
        "aws": os.getenv("AWS_ACCESS_KEY_ID") is not None,
        "bucket": os.getenv("S3_BUCKET_NAME"),
    }
