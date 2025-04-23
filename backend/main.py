from fastapi import FastAPI, UploadFile, File, Form
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
import os
import shutil
import subprocess
import json

# ✅ Load environment variables from .env file
load_dotenv()

# ✅ Initialize FastAPI app
app = FastAPI()

@app.post("/process_set")
async def process_set(
    video: UploadFile = File(...),
    coaching: bool = Form(False)
):
    save_path = f"temp_uploads/{video.filename}"
    os.makedirs("temp_uploads", exist_ok=True)

    with open(save_path, "wb") as buffer:
        shutil.copyfileobj(video.file, buffer)

    # ✅ Add environment variable to signal subprocess mode
    env = os.environ.copy()
    env["GYMVID_MODE"] = "subprocess"

    try:
        result = subprocess.run(
            ["python", "backend/ai/analyze_video.py", save_path],
            capture_output=True,
            text=True,
            check=True,
            env=env
        )

        # ✅ Expect pure JSON on stdout now
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

# ✅ Optional: test if env variables are loading correctly
@app.get("/debug/env")
def debug_env():
    return {
        "openai": os.getenv("OPENAI_API_KEY") is not None,
        "aws": os.getenv("AWS_ACCESS_KEY_ID") is not None,
        "bucket": os.getenv("S3_BUCKET_NAME"),
    }
