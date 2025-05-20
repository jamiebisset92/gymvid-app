from fastapi import APIRouter
from .upload_profile_image import router as upload_router
# Import other routers as needed

# Main API router
api_router = APIRouter()

# Include all route modules
api_router.include_router(upload_router, tags=["uploads"])
# Add other routers here as your app grows

# Export the main router for use in the app entry point 