from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from api.routers import api_router

# Create FastAPI app
app = FastAPI(
    title="GymVid API",
    description="Backend API for GymVid mobile application",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://gymvid-app.vercel.app",  # Production frontend
        "http://localhost:3000",          # Local frontend development
        "http://localhost:19006",         # Expo web development
        "exp://localhost:19000",          # Expo mobile development
        "*"                              # Keep wildcard for development
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api_router, prefix="/api")

# Mount static file directory for uploaded images
os.makedirs("uploads/profiles", exist_ok=True)
app.mount("/static", StaticFiles(directory="uploads"), name="static")

@app.get("/")
async def root():
    return {
        "message": "Welcome to GymVid API",
        "documentation": "/docs",
        "status": "online"
    }

if __name__ == "__main__":
    import uvicorn
    # For development
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True) 