# GymVid Backend (Quick Reference)

AI-powered backend for analyzing workout videos — detects exercises, counts reps, estimates weight, and provides GPT-4o coaching feedback.

---

## ✅ Run Locally

```bash
pip install -r requirements.txt
python main.py

Server will run at:
http://localhost:10000

🔐 Required .env Variables
OPENAI_API_KEY=your-key
GYMVID_AI_MODEL=gpt-4o

SUPABASE_URL=your-url
SUPABASE_SERVICE_ROLE_KEY=your-key

AWS_ACCESS_KEY_ID=your-id
AWS_SECRET_ACCESS_KEY=your-secret
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-bucket

🌐 Key API Endpoints
POST /analyze/log_set
→ Upload + auto-analyze video (predict exercise, count reps, estimate weight)

POST /manual_log
→ Manually log a workout

POST /analyze/feedback
→ Coaching feedback from public video URL

POST /analyze/feedback-file
→ Coaching feedback from uploaded video file

🛠 Stack
FastAPI (Python 3.11)

OpenAI GPT-4o

AWS S3

Supabase

Render (deployment)

🔁 Deploy
Push to GitHub with valid render.yaml to trigger auto-deploy on Render.
