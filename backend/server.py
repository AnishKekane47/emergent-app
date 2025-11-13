from fastapi import FastAPI, APIRouter, HTTPException, Depends, Response, Cookie, Header, Request
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import socketio

# Import our modules
from auth import (
    User, get_user_data_from_emergent, create_or_get_user,
    create_session, get_current_user, delete_session
)
from fraud_engine import FraudEngine
from email_service import EmailService
from websocket_manager import WebSocketManager

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Initialize services
fraud_engine = FraudEngine(db, os.getenv('EMERGENT_LLM_KEY', ''))
email_service = EmailService()
websocket_manager = WebSocketManager()

# Create the main app
app = FastAPI(title="Fraud Detection System")
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Models
class SessionRequest(BaseModel):
    session_id: str

class Transaction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    amount: float
    merchant: str
    location: str
    card_type: str
    device_id: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TransactionCreate(BaseModel):
    amount: float
    merchant: str
    location: str
    card_type: str
    device_id: str

class Alert(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    transaction_id: str
    user_id: str
    total_score: float
    rule_score: float
    ai_score: float
    risk_level: str
    violated_rules: List[str]
    status: str = "pending"  # pending, investigating, resolved, false_positive
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    resolved_at: Optional[datetime] = None
    notes: Optional[str] = None

class AlertUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None

class Rule(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    rule_type: str  # amount, velocity, location, merchant, time
    condition: str
    threshold: float
    weight: float = 0.5
    active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RuleCreate(BaseModel):
    name: str
    description: str
    rule_type: str
    condition: str
    threshold: float
    weight: float = 0.5

class RuleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    threshold: Optional[float] = None
    weight: Optional[float] = None
    active: Optional[bool] = None

# Auth endpoints
@api_router.post("/auth/session")
async def create_auth_session(request: SessionRequest, response: Response):
    """Exchange session_id for session_token"""
    try:
        user_data = await get_user_data_from_emergent(request.session_id)
        user = await create_or_get_user(db, user_data)
        session = await create_session(db, user.id, user_data["session_token"])
        
        response.set_cookie(
            key="session_token",
            value=session.session_token,
            httponly=True,
            secure=True,
            samesite="none",
            max_age=7 * 24 * 60 * 60,
            path="/"
        )
        
        return {
            "user": user.model_dump(),
            "session_token": session.session_token
        }
    except Exception as e:
        logger.error(f"Session creation failed: {e}")
        raise HTTPException(status_code=401, detail=str(e))

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: User = Depends(lambda req, st=Cookie(None), auth=Header(None): get_current_user(db, req, st, auth))):
    """Get current user info"""
    return current_user

@api_router.post("/auth/logout")
async def logout(
    response: Response,
    session_token: Optional[str] = Cookie(None)
):
    """Logout user"""
    if session_token:
        await delete_session(db, session_token)
    
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out successfully"}

# Transaction endpoints
@api_router.post("/transactions", response_model=Transaction)
async def create_transaction(
    transaction_data: TransactionCreate,
    current_user: User = Depends(lambda req, st=Cookie(None), auth=Header(None): get_current_user(db, req, st, auth))
):
    """Create a new transaction and analyze for fraud"""
    transaction = Transaction(
        user_id=current_user.id,
        **transaction_data.model_dump()
    )
    
    # Store transaction
    txn_dict = transaction.model_dump()
    txn_dict["timestamp"] = txn_dict["timestamp"].isoformat()
    await db.transactions.insert_one(txn_dict)
    
    # Analyze for fraud
    analysis = await fraud_engine.analyze_transaction(txn_dict)
    
    # Create alert if score exceeds threshold
    if analysis["total_score"] >= 0.5:  # Threshold for alert
        alert = Alert(
            transaction_id=transaction.id,
            user_id=current_user.id,
            total_score=analysis["total_score"],
            rule_score=analysis["rule_score"],
            ai_score=analysis["ai_score"],
            risk_level=analysis["risk_level"],
            violated_rules=analysis["violated_rules"]
        )
        
        alert_dict = alert.model_dump()
        alert_dict["created_at"] = alert_dict["created_at"].isoformat()
        await db.alerts.insert_one(alert_dict)
        
        # Send notifications
        alert_data = {
            **alert_dict,
            "amount": transaction.amount,
            "merchant": transaction.merchant,
            "location": transaction.location
        }
        
        # Broadcast via WebSocket
        await websocket_manager.broadcast_alert(alert_data)
        
        # Send email notification
        await email_service.send_fraud_alert(alert_data, current_user.email)
        
        logger.info(f"Fraud alert created for transaction {transaction.id}")
    
    return transaction

@api_router.get("/transactions", response_model=List[Transaction])
async def get_transactions(
    limit: int = 50,
    current_user: User = Depends(lambda req, st=Cookie(None), auth=Header(None): get_current_user(db, req, st, auth))
):
    """Get user transactions"""
    transactions = await db.transactions.find(
        {"user_id": current_user.id},
        {"_id": 0}
    ).sort("timestamp", -1).limit(limit).to_list(limit)
    
    for txn in transactions:
        if isinstance(txn["timestamp"], str):
            txn["timestamp"] = datetime.fromisoformat(txn["timestamp"])
    
    return transactions

@api_router.get("/transactions/{transaction_id}", response_model=Transaction)
async def get_transaction(
    transaction_id: str,
    current_user: User = Depends(lambda req, st=Cookie(None), auth=Header(None): get_current_user(db, req, st, auth))
):
    """Get specific transaction"""
    txn = await db.transactions.find_one(
        {"id": transaction_id, "user_id": current_user.id},
        {"_id": 0}
    )
    
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    if isinstance(txn["timestamp"], str):
        txn["timestamp"] = datetime.fromisoformat(txn["timestamp"])
    
    return Transaction(**txn)

# Alert endpoints
@api_router.get("/alerts", response_model=List[Alert])
async def get_alerts(
    status: Optional[str] = None,
    limit: int = 50,
    current_user: User = Depends(lambda req, st=Cookie(None), auth=Header(None): get_current_user(db, req, st, auth))
):
    """Get alerts"""
    query = {}
    if status:
        query["status"] = status
    
    alerts = await db.alerts.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    
    for alert in alerts:
        if isinstance(alert["created_at"], str):
            alert["created_at"] = datetime.fromisoformat(alert["created_at"])
        if alert.get("resolved_at") and isinstance(alert["resolved_at"], str):
            alert["resolved_at"] = datetime.fromisoformat(alert["resolved_at"])
    
    return alerts

@api_router.get("/alerts/{alert_id}", response_model=Alert)
async def get_alert(
    alert_id: str,
    current_user: User = Depends(lambda req, st=Cookie(None), auth=Header(None): get_current_user(db, req, st, auth))
):
    """Get specific alert"""
    alert = await db.alerts.find_one({"id": alert_id}, {"_id": 0})
    
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    if isinstance(alert["created_at"], str):
        alert["created_at"] = datetime.fromisoformat(alert["created_at"])
    if alert.get("resolved_at") and isinstance(alert["resolved_at"], str):
        alert["resolved_at"] = datetime.fromisoformat(alert["resolved_at"])
    
    return Alert(**alert)

@api_router.patch("/alerts/{alert_id}", response_model=Alert)
async def update_alert(
    alert_id: str,
    update_data: AlertUpdate,
    current_user: User = Depends(lambda req, st=Cookie(None), auth=Header(None): get_current_user(db, req, st, auth))
):
    """Update alert status/notes"""
    alert = await db.alerts.find_one({"id": alert_id})
    
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    
    if update_data.status in ["resolved", "false_positive"]:
        update_dict["resolved_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.alerts.update_one({"id": alert_id}, {"$set": update_dict})
    
    updated_alert = await db.alerts.find_one({"id": alert_id}, {"_id": 0})
    
    if isinstance(updated_alert["created_at"], str):
        updated_alert["created_at"] = datetime.fromisoformat(updated_alert["created_at"])
    if updated_alert.get("resolved_at") and isinstance(updated_alert["resolved_at"], str):
        updated_alert["resolved_at"] = datetime.fromisoformat(updated_alert["resolved_at"])
    
    return Alert(**updated_alert)

# Rule endpoints
@api_router.get("/rules", response_model=List[Rule])
async def get_rules(
    active_only: bool = False,
    current_user: User = Depends(lambda req, st=Cookie(None), auth=Header(None): get_current_user(db, req, st, auth))
):
    """Get fraud detection rules"""
    query = {"active": True} if active_only else {}
    rules = await db.rules.find(query, {"_id": 0}).to_list(100)
    
    for rule in rules:
        if isinstance(rule["created_at"], str):
            rule["created_at"] = datetime.fromisoformat(rule["created_at"])
    
    return rules

@api_router.post("/rules", response_model=Rule)
async def create_rule(
    rule_data: RuleCreate,
    current_user: User = Depends(lambda req, st=Cookie(None), auth=Header(None): get_current_user(db, req, st, auth))
):
    """Create a new fraud detection rule"""
    rule = Rule(**rule_data.model_dump())
    
    rule_dict = rule.model_dump()
    rule_dict["created_at"] = rule_dict["created_at"].isoformat()
    
    await db.rules.insert_one(rule_dict)
    return rule

@api_router.patch("/rules/{rule_id}", response_model=Rule)
async def update_rule(
    rule_id: str,
    update_data: RuleUpdate,
    current_user: User = Depends(lambda req, st=Cookie(None), auth=Header(None): get_current_user(db, req, st, auth))
):
    """Update a fraud detection rule"""
    rule = await db.rules.find_one({"id": rule_id})
    
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    await db.rules.update_one({"id": rule_id}, {"$set": update_dict})
    
    updated_rule = await db.rules.find_one({"id": rule_id}, {"_id": 0})
    
    if isinstance(updated_rule["created_at"], str):
        updated_rule["created_at"] = datetime.fromisoformat(updated_rule["created_at"])
    
    return Rule(**updated_rule)

@api_router.delete("/rules/{rule_id}")
async def delete_rule(
    rule_id: str,
    current_user: User = Depends(lambda req, st=Cookie(None), auth=Header(None): get_current_user(db, req, st, auth))
):
    """Delete a fraud detection rule"""
    result = await db.rules.delete_one({"id": rule_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Rule not found")
    
    return {"message": "Rule deleted successfully"}

# Health endpoint
@api_router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "fraud-detection-system",
        "email_mode": "mock" if email_service.mock_mode else "live"
    }

# Include the router in the main app
app.include_router(api_router)

# Mount WebSocket
app.mount("/ws", websocket_manager.get_asgi_app())

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()