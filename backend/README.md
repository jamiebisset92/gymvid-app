GymVid App (Backend)
GymVid is an AI-powered fitness app that automatically analyzes user workout videos to detect exercises, count reps, estimate weight, and log results.
Built for performance, scalability, and simplicity.

📂 Project Structure
bash
Copy
Edit
gymvid-app/
├── README.md
├── LICENSE
├── main.py
├── .env
├── .gitignore
├── backend/
│   ├── ai/
│   │   ├── analyze/
│   │   │   ├── analyze_set.py
│   │   │   ├── coaching_feedback.py
│   │   │   ├── exercise_prediction.py
│   │   │   ├── keyframe_exporter.py
│   │   │   ├── rep_detection.py
│   │   │   ├── result_packager.py
│   │   │   ├── video_analysis.py
│   │   │   └── weight_estimation.py
│   ├── api/
│   │   ├── manual_log.py
│   │   └── log_set.py
│   └── utils/
│       ├── aws_utils.py
│       ├── save_set_to_supabase.py
│       └── supabase_client.py
├── frontend/
│   └── (frontend app files here)
└── requirements.txt
🚀 How to Run Locally
Install dependencies:

bash
Copy
Edit
pip install -r requirements.txt
Create .env file:

env
Copy
Edit
OPENAI_API_KEY=your-openai-api-key
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
S3_BUCKET_NAME=your-s3-bucket-name
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
Start the server locally:

bash
Copy
Edit
python main.py
Server will run at http://localhost:10000

🌐 API Endpoints
1. Upload and Analyze Automatically
bash
Copy
Edit
POST /analyze/log_set
Required: video (file)

Optional: user_provided_exercise, known_exercise_info

Action: Analyzes uploaded video, predicts exercise, estimates weight, saves to Supabase.

2. Manual Workout Log
bash
Copy
Edit
POST /manual_log
Required:

user_id

movement

equipment

weight

weight_unit (kg or lb)

reps

Optional:

rpe

rir

video (file)

Action: Manually logs a workout into Supabase.

3. Legacy Upload (Subprocess - for testing only)
bash
Copy
Edit
POST /process_set
Required: s3_key or video

Optional: coaching (true/false)

Action: Old method for analyzing via subprocess.

🛠 Technologies Used
FastAPI (Python 3.11)

OpenAI GPT-4o

AWS S3 (video uploads)

Supabase (database + authentication)

Render.com (backend hosting)

📜 License
Distributed under the MIT License. See LICENSE for more information.