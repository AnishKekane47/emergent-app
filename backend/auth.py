from fastapi import HTTPException, Cookie, Header, Request
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorDatabase
import httpx
import logging

logger = logging.getLogger(__name__)

class User(BaseModel):
    id: str
    email: str
    name: str
    picture: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserSession(BaseModel):
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

async def get_user_data_from_emergent(session_id: str) -> dict:
    """Fetch user data from Emergent Auth service"""
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_id},
                timeout=10.0
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"Failed to fetch user data: {e}")
            raise HTTPException(status_code=401, detail="Invalid session")

async def create_or_get_user(db: AsyncIOMotorDatabase, user_data: dict) -> User:
    """Create or retrieve user from database"""
    existing_user = await db.users.find_one({"email": user_data["email"]})
    
    if existing_user:
        existing_user["id"] = str(existing_user["_id"])
        return User(**existing_user)
    
    user = User(
        id=user_data["id"],
        email=user_data["email"],
        name=user_data["name"],
        picture=user_data.get("picture")
    )
    
    user_dict = user.model_dump()
    user_dict["_id"] = user_dict.pop("id")
    user_dict["created_at"] = user_dict["created_at"].isoformat()
    
    await db.users.insert_one(user_dict)
    return user

async def create_session(db: AsyncIOMotorDatabase, user_id: str, session_token: str) -> UserSession:
    """Create a new user session"""
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    session = UserSession(
        user_id=user_id,
        session_token=session_token,
        expires_at=expires_at
    )
    
    session_dict = session.model_dump()
    session_dict["expires_at"] = session_dict["expires_at"].isoformat()
    session_dict["created_at"] = session_dict["created_at"].isoformat()
    
    await db.user_sessions.insert_one(session_dict)
    return session

async def get_current_user(
    db: AsyncIOMotorDatabase,
    request: Request,
    session_token: Optional[str] = Cookie(None),
    authorization: Optional[str] = Header(None)
) -> User:
    """Get current authenticated user from session token"""
    token = session_token
    
    if not token and authorization:
        if authorization.startswith("Bearer "):
            token = authorization.replace("Bearer ", "")
    
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session = await db.user_sessions.find_one({"session_token": token})
    
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    expires_at = datetime.fromisoformat(session["expires_at"]) if isinstance(session["expires_at"], str) else session["expires_at"]
    
    if expires_at < datetime.now(timezone.utc):
        await db.user_sessions.delete_one({"session_token": token})
        raise HTTPException(status_code=401, detail="Session expired")
    
    user_doc = await db.users.find_one({"_id": session["user_id"]})
    
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    user_doc["id"] = str(user_doc["_id"])
    if isinstance(user_doc.get("created_at"), str):
        user_doc["created_at"] = datetime.fromisoformat(user_doc["created_at"])
    
    return User(**user_doc)

async def delete_session(db: AsyncIOMotorDatabase, session_token: str):
    """Delete a user session"""
    await db.user_sessions.delete_one({"session_token": session_token})