import cv2

def generate_thumbnail(video_path, save_path, frame_time_sec=2):
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print("❌ Failed to open video:", video_path)
        return False

    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = cap.get(cv2.CAP_PROP_FRAME_COUNT)
    frame_num = int(frame_time_sec * fps)

    # If video is too short, fallback to first frame
    if frame_num >= total_frames:
        frame_num = 0

    cap.set(cv2.CAP_PROP_POS_FRAMES, frame_num)
    success, frame = cap.read()

    if success and frame is not None:
        cv2.imwrite(save_path, frame)
        cap.release()
        return True

    print("❌ Failed to read frame at position:", frame_num)
    cap.release()
    return False
