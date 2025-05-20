# GymVid App - Profile Image Upload Component

This repository contains a React Native component for handling profile image uploads in the GymVid fitness app.

## Components

### ProfileImageUploader

The `ProfileImageUploader` component provides a streamlined way for users to select and upload profile images.

#### Features:
- Image selection from device gallery
- Image preview
- File validation (size < 3MB, image files only)
- Upload progress indicator
- Error handling
- Direct Supabase upload fallback

#### Props:
- `userId` (string) - The Supabase user ID
- `supabase` - The Supabase client instance
- `onImageUploaded` (function) - Callback function that receives the uploaded image URL

#### Usage:

```jsx
import { supabase } from '../config/supabase';
import ProfileImageUploader from '../components/ProfileImageUploader';

function YourComponent() {
  const userId = 'user-123'; // Get from Supabase auth
  
  const handleImageUploaded = (imageUrl) => {
    console.log('Image uploaded:', imageUrl);
    // Update your UI or state with the new image URL
  };
  
  return (
    <ProfileImageUploader 
      userId={userId}
      supabase={supabase}
      onImageUploaded={handleImageUploaded}
    />
  );
}
```

## Backend Setup

The component works with a FastAPI backend that handles image uploads.

### Endpoint: `/upload/profile-image`

- **Method**: POST
- **Content-Type**: multipart/form-data
- **Parameters**:
  - `file`: The image file to upload
  - `user_id`: The Supabase user ID
- **Response**: JSON with image URL and status

### Running the Backend

1. Install dependencies:
```
pip install fastapi uvicorn python-multipart aiofiles
```

2. Start the server:
```
cd backend
python main.py
```

3. Visit `http://localhost:8000/docs` to see the API documentation.

## Alternative: Direct Supabase Upload

If the FastAPI backend is unavailable, the component includes a fallback mechanism that uploads directly to Supabase Storage. This requires:

1. A configured Supabase project
2. Storage buckets named either "avatars" or "images"
3. Appropriate storage permissions

## Configuration

Customize the component by modifying:
- `MAX_FILE_SIZE` in both frontend and backend (default 3MB)
- Allowed image types
- Backend API URL in the `uploadImage` function 