#!/usr/bin/env python3
import requests
import os

# Test the feedback_upload endpoint
def test_feedback_upload():
    url = "https://gymvid-app.onrender.com/analyze/feedback_upload"
    
    # Use a test video file
    test_video_path = "/Users/stephaniesanzo/Documents/Jamie_Deadlift.mov"
    
    if not os.path.exists(test_video_path):
        print(f"Error: Test video not found at {test_video_path}")
        return
    
    # Prepare the multipart form data
    with open(test_video_path, 'rb') as video_file:
        files = {
            'video': ('test_video.mov', video_file, 'video/quicktime')
        }
        data = {
            'user_id': 'test-user-id',
            'movement': 'Barbell Deadlift'
        }
        
        print(f"Testing endpoint: {url}")
        print(f"Video file: {test_video_path}")
        print(f"File size: {os.path.getsize(test_video_path) / 1024 / 1024:.2f} MB")
        
        try:
            response = requests.post(url, files=files, data=data, timeout=60)
            print(f"\nResponse status: {response.status_code}")
            print(f"Response headers: {dict(response.headers)}")
            
            if response.status_code == 200:
                print("\n✅ Success! Response:")
                print(response.json())
            else:
                print(f"\n❌ Error: {response.status_code}")
                print(f"Response text: {response.text}")
                
        except requests.exceptions.RequestException as e:
            print(f"\n❌ Request failed: {e}")

if __name__ == "__main__":
    test_feedback_upload() 