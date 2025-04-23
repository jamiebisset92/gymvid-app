import os
import sys
import openai
import base64
import json
import subprocess
import re
from dotenv import load_dotenv

# ✅ Load environment variables
load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")

# ✅ Validate input
if len(sys.argv) < 2:
    print("Usage: python process_set.py path/to/video.mov [--coach]")
    sys.exit(1)

video_path = sys.argv[1]
if not os.path.exists(video_path):
    raise FileNotFoundError(f"Video not found: {video_path}")

run_coaching = "--coach" in sys.argv

# ✅ Step 1: Analyze reps and save rep_data.json
print("\n📈 Running rep analysis...")
rep_process = subprocess.run(
    ["python3.10", "ai/analyze_video.py", video_path],
    capture_output=True,
    text=True
)

try:
    rep_data = json.loads(rep_process.stdout)
    print("✅ Rep data extracted:")
    print(json.dumps(rep_data, indent=2))

    os.makedirs("ai/outputs", exist_ok=True)
    with open("ai/outputs/rep_data.json", "w") as f:
        json.dump(rep_data, f, indent=2)

    print("🧠 Saved rep data to ai/outputs/rep_data.json")

except Exception as e:
    print("❌ Failed to parse rep data from analyze_video.py")
    print(rep_process.stdout)
    print(str(e))
    rep_data = []

# ✅ Step 2: Extract keyframes from rep01
print("\n🖼️ Extracting keyframes...")
subprocess.run(["python", "backend/ai/extract_keyframes.py"])

# ✅ Step 3: Select keyframes and send to GPT for classification
keyframes_dir = "outputs/keyframes"
rep1_keyframes = ["rep01_start.jpg", "rep01_peak.jpg", "rep01_stop.jpg"]
valid_images = []

for filename in rep1_keyframes:
    path = os.path.join(keyframes_dir, filename)
    if not os.path.exists(path):
        print(f"❌ Keyframe not found: {filename}")
        continue
    with open(path, "rb") as f:
        b64_img = base64.b64encode(f.read()).decode("utf-8")
        valid_images.append({
            "type": "image_url",
            "image_url": {"url": f"data:image/jpeg;base64,{b64_img}"}
        })

# ✅ Step 4: Ask GPT for classification using structured naming logic
print("\n📌 Identifying exercise and estimating weight...")
exercise = "Unknown"
confidence = 0
estimated_weight = "N/A"
visibility = "N/A"

if valid_images:
    response = openai.chat.completions.create(
        model="gpt-4o",
        temperature=0.2,
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a highly accurate strength training analyst tasked with classifying exercises using a structured naming system.\n\n"
                    "📋 Follow this naming format to ensure consistency:\n\n"
                    "1️⃣ Apparatus — Always start with the equipment used:\n"
                    "   - Barbell, Dumbbell, Kettlebell, Cable, Machine, Bodyweight, Smith Machine, Trap Bar, etc.\n"
                    "\n"
                    "2️⃣ Unilateral Info — Add if applicable:\n"
                    "   - Single Arm, Single Leg\n"
                    "\n"
                    "3️⃣ Modifier/Variation — Only if it clearly applies:\n"
                    "   - Sumo, Deficit, B-Stance, Incline, Seated, Underhand, Wide Grip, etc.\n"
                    "\n"
                    "4️⃣ Base Movement — Always end with the exercise name:\n"
                    "   - Deadlift, Row, Squat, Press, Curl, Raise, Pulldown, Kickback, Lunge, etc.\n"
                    "\n"
                    "🔁 Examples:\n"
                    "- Barbell Conventional Deadlift\n"
                    "- Dumbbell Single Arm Row\n"
                    "- Dumbbell Underhand Bent Over Row\n"
                    "- Cable Single Arm Leaning Lateral Raise\n"
                    "- Machine Chest Press\n\n"
                    "🎯 Classify the exercise using that format only.\n"
                    "If you're unsure of the modifier, leave it out. Never add extra adjectives.\n"
                    "\n"
                    "Also include:\n"
                    "- Estimated total weight being lifted in kg\n"
                    "- Confidence score (0–100) on classification\n"
                    "- Confidence score (0–100) on weight visibility\n\n"
                    "Return ONLY JSON in this format:\n"
                    "{\n"
                    "  \"exercise\": \"Barbell Conventional Deadlift\",\n"
                    "  \"confidence\": 95,\n"
                    "  \"weight_kg\": 260,\n"
                    "  \"weight_visibility\": 90\n"
                    "}"
                )
            },
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "Classify the exercise and estimate weight in kg. Return only JSON."},
                    *valid_images
                ]
            }
        ],
        max_tokens=200
    )

    try:
        content = response.choices[0].message.content.strip()
        match = re.search(r'\{.*\}', content, re.DOTALL)
        content = match.group(0).strip() if match else content
        parsed = json.loads(content)
        exercise = parsed.get("exercise", "Unknown")
        confidence = parsed.get("confidence", 0)
        estimated_weight = parsed.get("weight_kg", "N/A")
        visibility = parsed.get("weight_visibility", "N/A")

    except Exception as e:
        print("❌ Failed to parse exercise classification response.")
        print("Raw content:", content)
        print("Error:", str(e))
        parsed = {
            "exercise": "Unknown",
            "confidence": 0,
            "weight_kg": "N/A",
            "weight_visibility": "N/A"
        }
        exercise = parsed["exercise"]
        confidence = parsed["confidence"]
        estimated_weight = parsed["weight_kg"]
        visibility = parsed["weight_visibility"]

# ✅ Step 5: Show result
print("\n📊 Exercise Prediction Result:")
if confidence < 85:
    print(f"Predicted: [{exercise}] — Confidence: {confidence}% (needs confirmation)")
else:
    print(f"Predicted: {exercise} — Confidence: {confidence}% ✅")
print(f"Estimated Weight: {estimated_weight} kg")
print(f"Weight Visibility Confidence: {visibility}%")

# ✅ Step 6: Run coaching feedback (optional)
if run_coaching:
    print("\n🧠 Generating coach feedback...")
    feedback_result = subprocess.run(
        ["python3.10", "ai/coaching_feedback.py"],
        capture_output=True,
        text=True
    )

    print("\n🤖 Coach Feedback:")
    feedback_output = feedback_result.stdout.strip()
    if feedback_output and not feedback_output.startswith("I'm sorry"):
        print(feedback_output)
    else:
        print("❌ No coach feedback returned. Please check the feedback script.")
else:
    print("\n🧠 Coach feedback skipped (no --coach flag provided).")

# ✅ Done
print("\n✅ Full set processing complete.")
