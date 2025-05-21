from fastapi import APIRouter, Query, HTTPException
from typing import Optional
import os
from supabase import create_client, Client

router = APIRouter()

# Initialize Supabase client
supabase_url = os.environ.get("SUPABASE_URL") or "https://xwxtsyhlobiyomqlxwti.supabase.co"
supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")  # Should be set in production environment

# Create a single Supabase client to reuse
supabase: Optional[Client] = None
try:
    supabase = create_client(supabase_url, supabase_key)
except Exception as e:
    print(f"Error initializing Supabase client: {e}")

@router.get("/check-username")
async def check_username(username: str = Query(..., description="Username to check availability")):
    """
    Check if a username is available.
    Returns:
        - available: Whether the username is available
        - exists: Whether the username already exists
    """
    try:
        if not username or len(username.strip()) < 3:
            return {
                "available": False,
                "error": "Username must be at least 3 characters long"
            }
            
        # Normalize the username
        normalized_username = username.lower().strip()
        
        # Ensure Supabase client is initialized
        if not supabase:
            raise HTTPException(
                status_code=500, 
                detail="Database client not initialized"
            )
        
        # Query for the username
        response = supabase.table("users") \
            .select("id, username") \
            .ilike("username", normalized_username) \
            .limit(1) \
            .execute()
            
        if hasattr(response, 'error') and response.error:
            raise HTTPException(
                status_code=500,
                detail=f"Database query error: {response.error}"
            )
            
        # Check if username exists
        exists = len(response.data) > 0
        
        # Return the result
        return {
            "username": username,
            "available": not exists,
            "exists": exists
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error checking username '{username}': {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error checking username availability: {str(e)}"
        ) 