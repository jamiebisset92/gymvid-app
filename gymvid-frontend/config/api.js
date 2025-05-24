import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { ENV } from './env';

// Determine the API base URL based on the platform and environment
const getApiBaseUrl = () => {
  if (__DEV__) {
    // Development environment
    
    // 1. If explicitly using local IP (env)
    if (ENV.USE_LOCAL_IP) {
      return `http://${ENV.LOCAL_IP}:${ENV.API_PORT}`;
    }

    // 2. Try to infer local dev server IP from Expo debuggerHost (works for physical devices)
    // debuggerHost is something like '192.168.1.100:19000' in dev mode
    if (Constants?.manifest?.debuggerHost) {
      const hostIp = Constants.manifest.debuggerHost.split(':').shift();
      if (hostIp) {
        return `http://${hostIp}:${ENV.API_PORT}`;
      }
    }
    
    // 3. Platform-specific fallback
    if (Platform.OS === 'ios') {
      return `http://localhost:${ENV.API_PORT}`;
    }
    if (Platform.OS === 'android') {
      return `http://10.0.2.2:${ENV.API_PORT}`;
    }
  }
  // Production URL (replace with real one)
  return 'https://your-api-server.com';
};

// You can also set this to your local machine's IP address for testing on physical devices
// For example: 'http://192.168.1.100:8000'
// To find your IP:
// - Mac: System Preferences > Network > Wi-Fi > Advanced > TCP/IP
// - Windows: ipconfig in command prompt
// - Linux: ifconfig or ip addr

export const API_BASE_URL = getApiBaseUrl();

// API endpoints
export const API_ENDPOINTS = {
  HEALTH: `${API_BASE_URL}/health`,
  PREDICT_EXERCISE: `${API_BASE_URL}/analyze/quick_exercise_prediction`,
  DETECT_REPS: `${API_BASE_URL}/analyze/quick_rep_detection`,
};

// Health check function
export const checkBackendHealth = async () => {
  try {
    const response = await fetch(API_ENDPOINTS.HEALTH, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (response.ok) {
      console.log('✅ Backend is healthy and reachable');
      return true;
    } else {
      console.log('❌ Backend returned status:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Cannot reach backend:', error.message);
    return false;
  }
};

// For debugging
if (__DEV__) {
  console.log('🌐 API Configuration:', {
    platform: Platform.OS,
    isDev: __DEV__,
    baseUrl: API_BASE_URL,
    useLocalIP: ENV.USE_LOCAL_IP,
  });
} 