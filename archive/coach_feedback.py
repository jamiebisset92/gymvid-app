import os
import openai
import base64
from dotenv import load_dotenv

# Load API key
load_dotenv()
openai.api_key = os.getenv("OPENAI_API_KEY")

# Collect keyframe paths
keyframes_dir = "outputs/keyframes"
if not os.path.exists(keyframes_dir):
    print("❌ No keyframes found.")
    exit()

image_files = sorted([
    os.path.join(keyframes_dir, f)
    for f in os.listdir(keyframes_dir)
    if f.endswith(".jpg")
])

if not image_files:
    print("❌ No .jpg keyframes in folder.")
    exit()

# Convert images to base64
images_payload = []
for path in image_files:
    with open(path, "rb") as img_file:
        base64_img = base64.b64encode(img_file.read()).decode("utf-8")
        images_payload.append({
            "type": "image_url",
            "image_url": {
                "url": f"data:image/jpeg;base64,{base64_img}"
            }
        })

# Send request to GPT-4o
response = openai.chat.completions.create(
    model="gpt-4o",
    messages=[
        {
            "role": "system",
            "content": (
                "You are an expert lifting coach. Review the athlete’s technique shown across these images. "
                "Identify any significant form issues (not minor nitpicks). "
                "For each issue, give a short cue the athlete can use to improve. "
                "Then give an overall technique score out of 10. "
                "Only comment on the rep number if a major issue is seen in a specific frame. "
                "Reply in this format:\n\n"
                "🏋️‍♂️ Technique Feedback:\n- Concern: ...\n- Cue: ...\n\n\nScore: X/10"
            )
        },
        {
            "role": "user",
            "content": [
                {"type": "text", "text": "Please review the following keyframes for coaching feedback."},
                *images_payload
            ]
        }
    ],
    max_tokens=500
)

# Print output
print(response.choices[0].message.content.strip())
