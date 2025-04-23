import os
import json
import cv2

# ✅ Paths (adjust if needed)
rep_data_path = "backend/ai/outputs/rep_data.json"
video_path = "temp_uploads/Jamie_Deadlift.mov"
output_dir = "outputs/keyframes"

# ✅ Check if rep data file exists
if not os.path.exists(rep_data_path):
    print(f"❌ Keyframe extraction skipped — rep data file not found: {rep_data_path}")
    exit(0)

# ✅ Load rep data
with open(rep_data_path, "r") as f:
    rep_data = json.load(f)

# ✅ Convert to dict format if it's a list
if isinstance(rep_data, list):
    rep_data = {"reps": rep_data}

# ✅ Open video file
cap = cv2.VideoCapture(video_path)
fps = cap.get(cv2.CAP_PROP_FPS)
total_frames = cap.get(cv2.CAP_PROP_FRAME_COUNT)
print(f"🎥 Video loaded: {video_path} — FPS: {fps:.2f}, Total Frames: {int(total_frames)}")

# ✅ Ensure output directory exists
os.makedirs(output_dir, exist_ok=True)

# ✅ Extract and save keyframes
for i, rep in enumerate(rep_data.get("reps", [])):
    for key in ["start_frame", "peak_frame", "stop_frame"]:
        frame_num = rep.get(key)
        print(f"\n➡️ Trying to extract frame {frame_num} for rep {i+1} ({key})")

        if frame_num is not None:
            cap.set(cv2.CAP_PROP_POS_FRAMES, frame_num)
            success, frame = cap.read()

            if success and frame is not None:
                filename = f"{output_dir}/rep{i+1:02d}_{key.replace('_frame','')}.jpg"
                cv2.imwrite(filename, frame)
                print(f"✅ Saved: {filename}")
            else:
                print(f"❌ Could not read frame {frame_num} — success={success}, frame={type(frame)}")
        else:
            print(f"⚠️ No frame number provided for rep {i+1} ({key})")

cap.release()
