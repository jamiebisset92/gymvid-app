import os
import requests

def download_video_from_url(url):
    os.makedirs("temp_uploads", exist_ok=True)
    local_path = f"temp_uploads/{os.path.basename(url)}"

    response = requests.get(url, stream=True)
    if response.status_code == 200:
        with open(local_path, "wb") as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        print(f"✅ Video downloaded: {local_path}")
        return local_path
    else:
        raise Exception(f"❌ Failed to download video: {response.status_code}")
