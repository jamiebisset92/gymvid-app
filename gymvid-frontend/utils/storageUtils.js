import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

// Backend API URL - make sure it's the same as what the API router expects
const API_BASE_URL = 'https://gymvid-app.onrender.com';

// Fallback URLs if the backend is not available
const FALLBACK_URLS = [
  'https://randomuser.me/api/portraits/women/44.jpg',
  'https://randomuser.me/api/portraits/men/32.jpg',
  'https://randomuser.me/api/portraits/women/68.jpg',
  'https://randomuser.me/api/portraits/men/17.jpg',
];

/**
 * Check if the backend API is reachable
 * @returns {Promise<boolean>} - True if reachable, false otherwise
 */
const isBackendReachable = async () => {
  try {
    // Try to ping the backend with a simple request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`${API_BASE_URL}/upload/profile-image`, {
      method: 'HEAD',
      signal: controller.signal,
    }).catch(() => ({ ok: false }));
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    console.log('Backend connectivity check failed:', error.message);
    return false;
  }
};

/**
 * Upload a profile image to the backend API
 * @param {string} imageUri - Local URI of the image
 * @param {string} userId - User ID for the image owner
 * @returns {Promise<string>} - URL of the uploaded image
 */
export const uploadProfileImage = async (imageUri, userId) => {
  try {
    // Check if backend is reachable
    const backendAvailable = await isBackendReachable();
    
    if (!backendAvailable) {
      console.warn('Backend API is not reachable. Using fallback image URL.');
      // Use a random fallback URL for testing
      const fallbackUrl = FALLBACK_URLS[Math.floor(Math.random() * FALLBACK_URLS.length)];
      return fallbackUrl;
    }
    
    // Get file info
    const fileExt = imageUri.split('.').pop().toLowerCase();
    const fileName = `${Date.now()}.${fileExt}`;
    
    // Create file object for FormData
    const fileObject = {
      uri: imageUri,
      type: `image/${fileExt}`,
      name: fileName
    };
    
    // Create form data for upload to backend
    const formData = new FormData();
    formData.append('file', fileObject);
    formData.append('user_id', userId);
    
    console.log('Uploading image to backend API:', {
      userId,
      fileName,
      fileType: fileObject.type,
      uri: imageUri.substring(0, 30) + '...' // Truncate URI for logging
    });
    
    // Make sure we're correctly handling the response from the server
    // The server is returning "/static/profiles/{unique_filename}" for the image_url
    // We need to prepend the base URL to form a complete URL
    
    // Configure fetch options with longer timeout
    const fetchOptions = {
      method: 'POST',
      body: formData,
      // 30 second timeout
      timeout: 30000,
    };
    
    // Make the upload request with retry logic
    let attempts = 0;
    const maxAttempts = 3;
    let lastError = null;
    
    while (attempts < maxAttempts) {
      try {
        attempts++;
        console.log(`Upload attempt ${attempts}/${maxAttempts}`);
        
        // Use the full URL to the backend API
        const response = await fetch(`${API_BASE_URL}/upload/profile-image`, fetchOptions);
        
        // Check for HTTP error responses
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Backend error response:', {
            status: response.status,
            statusText: response.statusText,
            body: errorText
          });
          
          throw new Error(`Upload failed with status ${response.status}: ${errorText}`);
        }
        
        // Parse the JSON response
        const data = await response.json();
        console.log('Server response:', data);
        
        if (!data.image_url) {
          console.error('Missing image_url in response:', data);
          throw new Error('No image URL in response');
        }
        
        // Fix the image URL to be a full URL if the server returns a relative path
        let fullImageUrl = data.image_url;
        if (data.image_url.startsWith('/')) {
          fullImageUrl = `${API_BASE_URL}${data.image_url}`;
        }
        
        console.log('Successfully uploaded image:', fullImageUrl);
        return fullImageUrl;
      } catch (error) {
        console.error(`Attempt ${attempts} failed:`, error);
        lastError = error;
        
        // Wait a bit before retrying
        if (attempts < maxAttempts) {
          const delay = 1000 * attempts; // Increase delay with each attempt
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // If all attempts failed, use a fallback URL
    console.warn('All upload attempts failed. Using fallback image URL.');
    const fallbackUrl = FALLBACK_URLS[Math.floor(Math.random() * FALLBACK_URLS.length)];
    return fallbackUrl;
    
  } catch (error) {
    console.error('Error in uploadProfileImage:', error);
    // Return a fallback URL in case of error
    const fallbackUrl = FALLBACK_URLS[Math.floor(Math.random() * FALLBACK_URLS.length)];
    return fallbackUrl;
  }
}; 