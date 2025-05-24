# Backend Connection Setup Guide

## Quick Start

### 1. Start Your Backend Server
Make sure your Python backend is running:
```bash
# From the root gymvid-app directory
python main.py
```

The server should start on `http://localhost:8000`

### 2. Configure for Your Environment

#### iOS Simulator (Mac)
No configuration needed! It works out of the box with `localhost`.

#### Android Emulator
No configuration needed! The app automatically uses `10.0.2.2` for Android.

#### Physical Device (iPhone/Android)
You need to use your computer's IP address:

1. Find your computer's IP address:
   - **Mac**: System Preferences → Network → Wi-Fi → Advanced → TCP/IP
   - **Windows**: Run `ipconfig` in Command Prompt
   - **Linux**: Run `ifconfig` or `ip addr`

2. Update `gymvid-frontend/config/env.js`:
   ```javascript
   export const ENV = {
     LOCAL_IP: '192.168.1.100',  // Replace with your IP
     API_PORT: 8000,
     USE_LOCAL_IP: true,          // Set to true
   };
   ```

3. Make sure your phone and computer are on the same Wi-Fi network!

## Troubleshooting

### "Network request failed" Error
1. **Check backend is running**: You should see logs in the terminal where you ran `python main.py`
2. **Check firewall**: Your firewall might be blocking port 8000
3. **Check IP address**: Make sure you're using the correct IP for physical devices

### Test Your Connection
1. Open your browser on the device/emulator
2. Try to access:
   - iOS Simulator: `http://localhost:8000`
   - Android Emulator: `http://10.0.2.2:8000`
   - Physical Device: `http://YOUR_IP:8000`
3. You should see your FastAPI documentation

### Common Issues

**Issue**: Backend works in browser but not in app
- **Solution**: Check that you've configured the correct IP in `env.js`

**Issue**: Works on simulator but not physical device
- **Solution**: Update `LOCAL_IP` and set `USE_LOCAL_IP: true`

**Issue**: Intermittent connection failures
- **Solution**: Check if your computer is going to sleep or changing networks

## API Endpoints

The app uses these endpoints:
- `POST /analyze/quick_exercise_prediction` - Predicts the exercise type from video
- `POST /analyze/quick_rep_detection` - Counts repetitions in the video

Make sure these endpoints are implemented in your backend! 