import uuid

from datetime import datetime, timezone
from typing import Dict, List, Optional
from uuid import uuid4

import socketio
from fastapi import (
    APIRouter,
    Cookie,
    Depends,
    FastAPI,
    HTTPException,
    Response,
)
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field

# --- Models -----------------------------------------------------------------


class User(BaseModel):
    id: str
    name: str
    email: EmailStr
    picture: Optional[str] = None


class LoginPayload(BaseModel):
    email: EmailStr
    password: str


class RegisterPayload(LoginPayload):
    name: str


class Transaction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
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
    violated_rules: List[str] = Field(default_factory=list)
    status: str = "pending"
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
    rule_type: str
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


# --- In-memory state --------------------------------------------------------

USERS: Dict[str, User] = {}
USER_BY_EMAIL: Dict[str, str] = {}
USER_PASSWORDS: Dict[str, str] = {}
SESSIONS: Dict[str, str] = {}
TRANSACTIONS: List[Transaction] = []
ALERTS: List[Alert] = []
RULES: List[Rule] = []


def seed_data() -> None:
    """Populate deterministic demo data so the frontend has something to render."""
    if USERS:
        return

    demo_user = User(
        id=str(uuid4()),
        name="Jordan Smith",
        email="jordan@example.com",
        picture="https://api.dicebear.com/7.x/initials/svg?seed=Jordan+Smith",
    )
    USERS[demo_user.id] = demo_user
    USER_BY_EMAIL[demo_user.email.lower()] = demo_user.id
    USER_PASSWORDS[demo_user.email.lower()] = "password123"

    sample_rules = [
        Rule(
            name="High Amount Alert",
            description="Flags transactions over $5,000",
            rule_type="amount",
            condition="greater_than",
            threshold=5000,
            weight=0.7,
        ),
        Rule(
            name="Velocity Check",
            description="Multiple transactions in less than a minute",
            rule_type="velocity",
            condition="greater_than",
            threshold=3,
            weight=0.5,
        ),
    ]
    RULES.extend(sample_rules)

    sample_txns = [
        Transaction(
            user_id=demo_user.id,
            amount=249.99,
            merchant="Acme Gadgets",
            location="San Francisco, US",
            card_type="credit",
            device_id="device_alpha",
        ),
        Transaction(
            user_id=demo_user.id,
            amount=7320.10,
            merchant="Luxury Motors",
            location="Los Angeles, US",
            card_type="credit",
            device_id="device_beta",
        ),
    ]
    TRANSACTIONS.extend(sample_txns)

    ALERTS.append(
        Alert(
            transaction_id=sample_txns[1].id,
            user_id=demo_user.id,
            total_score=0.82,
            rule_score=0.65,
            ai_score=0.72,
            risk_level="CRITICAL",
            violated_rules=["High Amount Alert", "Velocity Check"],
        )
    )


seed_data()


# --- Helper utilities -------------------------------------------------------


def _normalize_email(value: str) -> str:
    return value.strip().lower()


def _issue_session(user_id: str) -> str:
    token = str(uuid4())
    SESSIONS[token] = user_id
    return token


def _set_session_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key="session_token",
        value=token,
        httponly=True,
        samesite="lax",
        secure=False,
        max_age=7 * 24 * 60 * 60,
        path="/",
    )


def get_current_user(session_token: Optional[str] = Cookie(None)) -> User:
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    user_id = SESSIONS.get(session_token)
    if not user_id or user_id not in USERS:
        raise HTTPException(status_code=401, detail="Session expired")
    return USERS[user_id]


def _maybe_create_alert(transaction: Transaction, user: User) -> Optional[Alert]:
    """Create a lightweight alert to keep the UI populated."""
    if transaction.amount < 5000:
        return None

    return Alert(
        transaction_id=transaction.id,
        user_id=user.id,
        total_score=0.7,
        rule_score=0.6,
        ai_score=0.4,
        risk_level="HIGH",
        violated_rules=["High Amount Alert"],
    )


# --- FastAPI application ----------------------------------------------------

app = FastAPI(title="Fraud Detection Mock API")
api_router = APIRouter(prefix="/api")


# Authentication -------------------------------------------------------------


@api_router.post("/auth/register")
async def register_user(payload: RegisterPayload, response: Response):
    email_key = _normalize_email(payload.email)
    if email_key in USER_BY_EMAIL:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        id=str(uuid4()),
        name=payload.name.strip() or payload.email.split("@")[0].title(),
        email=payload.email.strip(),
        picture=f"https://api.dicebear.com/7.x/initials/svg?seed={payload.name.strip() or 'User'}",
    )
    USERS[user.id] = user
    USER_BY_EMAIL[email_key] = user.id
    USER_PASSWORDS[email_key] = payload.password

    token = _issue_session(user.id)
    _set_session_cookie(response, token)
    return {"user": user}


@api_router.post("/auth/login")
async def login_user(payload: LoginPayload, response: Response):
    email_key = _normalize_email(payload.email)
    user_id = USER_BY_EMAIL.get(email_key)
    if not user_id or USER_PASSWORDS.get(email_key) != payload.password:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = _issue_session(user_id)
    _set_session_cookie(response, token)
    return {"user": USERS[user_id]}


@api_router.get("/auth/me")
async def auth_me(user: User = Depends(get_current_user)):
    return user


@api_router.post("/auth/logout")
async def logout_user(response: Response, session_token: Optional[str] = Cookie(None)):
    if session_token and session_token in SESSIONS:
        SESSIONS.pop(session_token, None)
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out"}


# Transactions ---------------------------------------------------------------


@api_router.get("/transactions", response_model=List[Transaction])
async def list_transactions(limit: int = 50, user: User = Depends(get_current_user)):
    user_txns = [txn for txn in TRANSACTIONS if txn.user_id == user.id]
    return sorted(user_txns, key=lambda txn: txn.timestamp, reverse=True)[:limit]


@api_router.post("/transactions", response_model=Transaction)
async def create_transaction(
    payload: TransactionCreate,
    user: User = Depends(get_current_user),
):
    txn = Transaction(user_id=user.id, **payload.model_dump())
    TRANSACTIONS.append(txn)

    alert = _maybe_create_alert(txn, user)
    if alert:
        ALERTS.append(alert)
        await sio.emit("alert:new", alert.model_dump())

    return txn


@api_router.get("/transactions/{transaction_id}", response_model=Transaction)
async def get_transaction(transaction_id: str, user: User = Depends(get_current_user)):
    for txn in TRANSACTIONS:
        if txn.id == transaction_id and txn.user_id == user.id:
            return txn
    raise HTTPException(status_code=404, detail="Transaction not found")


# Alerts ---------------------------------------------------------------------


@api_router.get("/alerts", response_model=List[Alert])
async def list_alerts(
    status: Optional[str] = None,
    limit: int = 50,
    user: User = Depends(get_current_user),
):
    filtered = [alert for alert in ALERTS if alert.user_id == user.id]
    if status:
        filtered = [alert for alert in filtered if alert.status == status]
    return sorted(filtered, key=lambda alert: alert.created_at, reverse=True)[:limit]


@api_router.get("/alerts/{alert_id}", response_model=Alert)
async def get_alert(alert_id: str, user: User = Depends(get_current_user)):
    for alert in ALERTS:
        if alert.id == alert_id and alert.user_id == user.id:
            return alert
    raise HTTPException(status_code=404, detail="Alert not found")


@api_router.patch("/alerts/{alert_id}", response_model=Alert)
async def update_alert(
    alert_id: str,
    payload: AlertUpdate,
    user: User = Depends(get_current_user),
):
    for idx, alert in enumerate(ALERTS):
        if alert.id == alert_id and alert.user_id == user.id:
            update_data = payload.model_dump(exclude_unset=True)
            if payload.status in {"resolved", "false_positive"}:
                update_data["resolved_at"] = datetime.now(timezone.utc)
            ALERTS[idx] = alert.model_copy(update=update_data)
            return ALERTS[idx]
    raise HTTPException(status_code=404, detail="Alert not found")


# Rules ----------------------------------------------------------------------


@api_router.get("/rules", response_model=List[Rule])
async def list_rules(active_only: bool = False, user: User = Depends(get_current_user)):
    rules = RULES
    if active_only:
        rules = [rule for rule in RULES if rule.active]
    return sorted(rules, key=lambda rule: rule.created_at, reverse=True)


@api_router.post("/rules", response_model=Rule)
async def create_rule(rule_data: RuleCreate, user: User = Depends(get_current_user)):
    rule = Rule(**rule_data.model_dump())
    RULES.append(rule)
    return rule


@api_router.patch("/rules/{rule_id}", response_model=Rule)
async def update_rule(
    rule_id: str,
    payload: RuleUpdate,
    user: User = Depends(get_current_user),
):
    for idx, rule in enumerate(RULES):
        if rule.id == rule_id:
            RULES[idx] = rule.model_copy(
                update=payload.model_dump(exclude_unset=True)
            )
            return RULES[idx]
    raise HTTPException(status_code=404, detail="Rule not found")


@api_router.delete("/rules/{rule_id}")
async def delete_rule(rule_id: str, user: User = Depends(get_current_user)):
    for idx, rule in enumerate(RULES):
        if rule.id == rule_id:
            RULES.pop(idx)
            return {"message": "Rule deleted"}
    raise HTTPException(status_code=404, detail="Rule not found")


# Misc -----------------------------------------------------------------------


@api_router.get("/health")
async def health_check():
    return {
        "status": "ok",
        "service": "fraud-detection-mock",
        "timestamp": datetime.now(timezone.utc),
    }


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://127.0.0.1:8000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Socket.IO bridge -------------------------------------------------------

sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*")
socket_app = socketio.ASGIApp(sio, socketio_path="socket.io")
app.mount("/ws", socket_app)


@sio.event
async def connect(sid, environ, auth):
    await sio.emit("connected", {"sid": sid}, to=sid)


@sio.event
async def disconnect(sid):
    # Nothing to clean up – sessions are tracked via cookies
    return

@app.get("/")
def root():
    return {"message": "Backend is running!"}
