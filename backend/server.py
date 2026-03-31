from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from apscheduler.schedulers.asyncio import AsyncIOScheduler
import asyncio
import certifi
import os
import logging
import base64
import json
import random
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, date, timedelta
import io
import jwt
import pyotp
import segno
from passlib.context import CryptContext

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url, tlsCAFile=certifi.where())
db = client[os.environ.get('DB_NAME', 'landlord_os')]

# Create the main app
app = FastAPI(title="Small Landlord Operating System")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()
JWT_SECRET = os.environ.get("JWT_SECRET", "landlord-os-secret-key-2025")
JWT_ALGORITHM = "HS256"

# Background scheduler
scheduler = AsyncIOScheduler()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ===========================
# PYDANTIC MODELS
# ===========================

# Auth Models
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    full_name: str
    phone: Optional[str] = None
    plan: str = "free"
    plan_status: str = "active"
    is_admin: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: User

# Property Models
class PropertyCreate(BaseModel):
    name: str
    address: str
    city: str
    province: str = "QC"
    postal_code: str
    property_type: str = "duplex"  # duplex, triplex, fourplex, etc.
    year_built: Optional[int] = None
    notes: Optional[str] = None
    late_fee_amount: Optional[float] = None  # e.g. 25.00
    late_fee_grace_days: Optional[int] = None  # days after due date before fee applies

class Property(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    address: str
    city: str
    province: str
    postal_code: str
    property_type: str
    year_built: Optional[int] = None
    notes: Optional[str] = None
    late_fee_amount: Optional[float] = None
    late_fee_grace_days: Optional[int] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class PropertyWithStats(Property):
    total_units: int = 0
    occupied_units: int = 0
    vacant_units: int = 0
    rent_collected: float = 0
    rent_expected: float = 0
    total_expenses: float = 0
    net_cash_flow: float = 0
    open_maintenance: int = 0
    next_lease_expiry: Optional[str] = None

# Unit Models
class UnitCreate(BaseModel):
    property_id: str
    unit_number: str
    bedrooms: int = 1
    bathrooms: float = 1.0
    square_feet: Optional[int] = None
    rent_amount: float = 0
    notes: Optional[str] = None

class Unit(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    property_id: str
    unit_number: str
    bedrooms: int
    bathrooms: float
    square_feet: Optional[int] = None
    rent_amount: float
    is_occupied: bool = False
    current_tenant_id: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Tenant Models
class TenantCreate(BaseModel):
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    unit_id: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    notes: Optional[str] = None

class Tenant(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    unit_id: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class TenantWithDetails(Tenant):
    unit_number: Optional[str] = None
    property_name: Optional[str] = None
    lease_end_date: Optional[str] = None
    rent_status: str = "N/A"  # paid, late, pending

# Lease Models
class LeaseCreate(BaseModel):
    tenant_id: str
    unit_id: str
    start_date: str  # YYYY-MM-DD
    end_date: str  # YYYY-MM-DD
    rent_amount: float
    security_deposit: float = 0
    payment_due_day: int = 1  # Day of month rent is due
    notes: Optional[str] = None

class Lease(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    tenant_id: str
    unit_id: str
    start_date: str
    end_date: str
    rent_amount: float
    security_deposit: float
    payment_due_day: int
    is_active: bool = True
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class LeaseWithDetails(Lease):
    tenant_name: Optional[str] = None
    unit_number: Optional[str] = None
    property_name: Optional[str] = None
    days_until_expiry: int = 0

# Rent Payment Models
class RentPaymentCreate(BaseModel):
    lease_id: str
    tenant_id: str
    unit_id: str
    amount: float
    payment_date: str  # YYYY-MM-DD
    payment_method: str = "etransfer"  # etransfer, cheque, cash, other
    month_year: str  # YYYY-MM (the month this payment is for)
    notes: Optional[str] = None

class RentPayment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    lease_id: str
    tenant_id: str
    unit_id: str
    amount: float
    payment_date: str
    payment_method: str
    month_year: str
    status: str = "paid"  # paid, partial, late
    notes: Optional[str] = None
    late_fee_amount: Optional[float] = 0
    late_fee_waived: Optional[bool] = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Expense Models
EXPENSE_CATEGORIES = ["maintenance", "insurance", "property_tax", "utilities", "mortgage", "cleaning", "renovation", "other"]

class ExpenseCreate(BaseModel):
    property_id: str
    unit_id: Optional[str] = None
    title: str
    amount: float
    category: str
    expense_date: str  # YYYY-MM-DD
    notes: Optional[str] = None

class Expense(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    property_id: str
    unit_id: Optional[str] = None
    title: str
    amount: float
    category: str
    expense_date: str
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class PropertyFinancials(BaseModel):
    property_id: str
    property_name: str
    month_year: str
    expected_rent: float
    collected_rent: float
    total_expenses: float
    maintenance_expenses: float
    net_cash_flow: float
    occupancy_rate: float
    expense_ratio: float
    expenses: list

# Maintenance Models
class MaintenanceRequestCreate(BaseModel):
    property_id: str
    unit_id: Optional[str] = None
    title: str
    description: str
    priority: str = "medium"  # low, medium, high, urgent
    reported_by: Optional[str] = None
    photos: Optional[List[str]] = None  # base64-encoded images

class MaintenanceRequest(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    property_id: str
    unit_id: Optional[str] = None
    title: str
    description: str
    priority: str
    status: str = "open"  # open, assigned, in_progress, completed, cancelled
    reported_by: Optional[str] = None
    photos: Optional[List[str]] = None
    cost: Optional[float] = None
    notes: Optional[str] = None
    assigned_contractor_id: Optional[str] = None
    assigned_contractor_name: Optional[str] = None
    assigned_contractor_trade: Optional[str] = None
    assigned_contractor_phone: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None

class MaintenanceRequestWithDetails(MaintenanceRequest):
    property_name: Optional[str] = None
    unit_number: Optional[str] = None

# Reminder Models
class ReminderCreate(BaseModel):
    title: str
    description: Optional[str] = None
    due_date: str  # YYYY-MM-DD
    reminder_type: str = "general"  # lease_expiry, rent_due, maintenance, general
    related_id: Optional[str] = None  # ID of related entity
    property_id: Optional[str] = None
    is_flagged: bool = False

class Reminder(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    description: Optional[str] = None
    due_date: str
    reminder_type: str
    related_id: Optional[str] = None
    property_id: Optional[str] = None
    is_flagged: bool = False
    is_completed: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None

class ReminderUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[str] = None
    property_id: Optional[str] = None
    is_flagged: Optional[bool] = None
    is_completed: Optional[bool] = None

# Asset Models
class AssetCreate(BaseModel):
    name: str
    asset_type: str = "other"  # parking, storage, equipment, other
    identifier: Optional[str] = None  # e.g. "Stall #3"
    unit_id: Optional[str] = None
    notes: Optional[str] = None

class Asset(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    property_id: str
    user_id: str
    name: str
    asset_type: str = "other"
    identifier: Optional[str] = None
    unit_id: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Audit Log Model
class AuditLog(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    property_id: Optional[str] = None
    entity_type: str  # property, unit, tenant, lease, rent_payment
    entity_id: str
    action: str  # created, updated, deleted
    entity_label: Optional[str] = None
    changes: Optional[dict] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

# MFA Models
class MFASetupResponse(BaseModel):
    secret: str
    uri: str
    qr_code_b64: str

class MFAVerifyRequest(BaseModel):
    code: str

class MFAConfirmRequest(BaseModel):
    mfa_token: str
    code: str

class MFADisableRequest(BaseModel):
    current_password: str
    code: str

# Dashboard Models
class DashboardStats(BaseModel):
    total_properties: int = 0
    total_units: int = 0
    total_tenants: int = 0
    occupied_units: int = 0
    vacant_units: int = 0
    occupancy_rate: float = 0
    total_rent_expected: float = 0
    total_rent_collected: float = 0
    monthly_revenue: float = 0
    collected_this_month: float = 0
    pending_rent: float = 0
    collection_rate: float = 0
    open_maintenance: int = 0
    open_maintenance_requests: int = 0
    leases_expiring_soon: int = 0
    overdue_rent_count: int = 0
    current_month: str = ""
    recent_payments: List[dict] = []
    alerts: List[dict] = []

# ===========================
# AUTH HELPERS
# ===========================

def create_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.utcnow() + timedelta(days=30)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def create_mfa_pending_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "type": "mfa_pending",
        "exp": datetime.utcnow() + timedelta(minutes=5)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def log_audit(
    user_id: str,
    entity_type: str,
    entity_id: str,
    action: str,
    property_id: Optional[str] = None,
    entity_label: Optional[str] = None,
    changes: Optional[dict] = None,
):
    entry = AuditLog(
        user_id=user_id,
        property_id=property_id,
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        entity_label=entity_label,
        changes=changes,
    )
    await db.audit_logs.insert_one(entry.model_dump())

def verify_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    token = credentials.credentials
    payload = verify_token(token)
    user = await db.users.find_one({"id": payload["sub"]})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

async def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    if not current_user.get("is_admin", False):
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

# ===========================
# AUTH ROUTES
# ===========================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    # Check if email exists
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    hashed_password = pwd_context.hash(user_data.password)
    user = User(email=user_data.email, full_name=user_data.full_name, plan="free", plan_status="active")
    user_dict = user.model_dump()
    user_dict["hashed_password"] = hashed_password
    
    await db.users.insert_one(user_dict)

    # Send welcome email (fire-and-forget)
    asyncio.create_task(_send_welcome_email(user.email, user.full_name))

    # Create token
    token = create_token(user.id, user.email)

    return TokenResponse(access_token=token, user=user)

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not pwd_context.verify(credentials.password, user.get("hashed_password", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # MFA check
    if user.get("mfa_enabled"):
        mfa_token = create_mfa_pending_token(user["id"], user["email"])
        return {"mfa_required": True, "mfa_token": mfa_token}

    token = create_token(user["id"], user["email"])
    return {
        "access_token": token,
        "token_type": "bearer",
        "mfa_required": False,
        "user": {
            "id": user["id"], "email": user["email"], "full_name": user["full_name"],
            "phone": user.get("phone"),
            "plan": user.get("plan", "free"), "plan_status": user.get("plan_status", "active"),
            "is_admin": user.get("is_admin", False),
            "created_at": user["created_at"].isoformat() if isinstance(user["created_at"], datetime) else user["created_at"],
        }
    }

@api_router.post("/auth/google")
async def auth_google(data: dict):
    """Sign in / sign up via Google Identity Services (id_token / credential)."""
    id_token_str = data.get("credential") or data.get("id_token")
    if not id_token_str:
        raise HTTPException(status_code=400, detail="credential manquant")

    google_client_id = os.environ.get("GOOGLE_CLIENT_ID", "")

    import httpx
    async with httpx.AsyncClient() as hc:
        r = await hc.get(
            f"https://oauth2.googleapis.com/tokeninfo?id_token={id_token_str}",
            timeout=8.0,
        )
    if r.status_code != 200:
        raise HTTPException(status_code=400, detail="Token Google invalide")

    info = r.json()
    if google_client_id and info.get("aud") != google_client_id:
        raise HTTPException(status_code=400, detail="Token Google invalide — mauvais client_id")

    email = info.get("email", "").lower().strip()
    full_name = info.get("name") or info.get("email", "").split("@")[0]
    if not email:
        raise HTTPException(status_code=400, detail="Email introuvable dans le token Google")

    user_doc = await db.users.find_one({"email": email})
    if not user_doc:
        new_user = User(email=email, full_name=full_name, plan="free", plan_status="active")
        ud = new_user.model_dump()
        ud["hashed_password"] = ""
        ud["oauth_provider"] = "google"
        await db.users.insert_one(ud)
        asyncio.create_task(_send_welcome_email(email, full_name))
        user_doc = await db.users.find_one({"email": email})

    token = create_token(user_doc["id"], user_doc["email"])
    return TokenResponse(
        access_token=token,
        user=User(
            id=user_doc["id"], email=user_doc["email"],
            full_name=user_doc.get("full_name", full_name),
            phone=user_doc.get("phone"),
            plan=user_doc.get("plan", "free"),
            plan_status=user_doc.get("plan_status", "active"),
            is_admin=user_doc.get("is_admin", False),
            created_at=user_doc["created_at"],
        )
    )


@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: dict = Depends(get_current_user)):
    return User(**current_user)

class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None

@api_router.patch("/auth/me", response_model=User)
async def update_me(data: UserProfileUpdate, current_user: dict = Depends(get_current_user)):
    update_fields: dict = {}
    if data.full_name is not None:
        update_fields["full_name"] = data.full_name.strip()
    if data.phone is not None:
        update_fields["phone"] = data.phone.strip()
    if data.email is not None:
        new_email = data.email.strip().lower()
        existing = await db.users.find_one({"email": new_email, "id": {"$ne": current_user["id"]}})
        if existing:
            raise HTTPException(status_code=400, detail="Email already in use")
        update_fields["email"] = new_email
    if not update_fields:
        return User(**current_user)
    await db.users.update_one({"id": current_user["id"]}, {"$set": update_fields})
    updated = await db.users.find_one({"id": current_user["id"]})
    return User(**updated)

class AccountDeleteRequest(BaseModel):
    confirmation: str  # Must be "SUPPRIMER" or "DELETE" — required by Law 25 / GDPR right to erasure

@api_router.delete("/auth/me")
async def delete_my_account(
    data: AccountDeleteRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Permanently delete the authenticated user's account and ALL associated data.
    Complies with Quebec Law 25 and GDPR right to erasure (Article 17).
    Requires explicit confirmation token to prevent accidental deletion.
    """
    if data.confirmation not in ("SUPPRIMER", "DELETE"):
        raise HTTPException(
            status_code=400,
            detail="Confirmation invalide. Tapez SUPPRIMER (ou DELETE) pour confirmer la suppression."
        )

    user_id = current_user["id"]

    # Cascade delete all user data across every collection
    COLLECTIONS = [
        db.properties, db.units, db.tenants, db.leases,
        db.rent_payments, db.maintenance_requests, db.expenses,
        db.reminders, db.contractors, db.team_members,
        db.inspections, db.applicants, db.signatures,
        db.notifications, db.documents,
    ]
    for collection in COLLECTIONS:
        try:
            await collection.delete_many({"user_id": user_id})
        except Exception:
            pass  # Collection may not exist in all environments

    # Finally delete the user account itself
    await db.users.delete_one({"id": user_id})

    return {
        "ok": True,
        "message": "Account and all associated personal data have been permanently deleted."
    }


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

@api_router.post("/auth/change-password")
async def change_password(data: ChangePasswordRequest, current_user: dict = Depends(get_current_user)):
    """Change password for authenticated user (requires current password)."""
    if not pwd_context.verify(data.current_password, current_user.get("hashed_password", "")):
        raise HTTPException(status_code=400, detail="Mot de passe actuel incorrect")
    if len(data.new_password) < 8:
        raise HTTPException(status_code=400, detail="Le nouveau mot de passe doit contenir au moins 8 caractères")
    hashed = pwd_context.hash(data.new_password)
    await db.users.update_one({"id": current_user["id"]}, {"$set": {"hashed_password": hashed}})
    return {"ok": True, "message": "Mot de passe mis à jour avec succès."}

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str

@api_router.post("/auth/forgot-password")
async def forgot_password(data: PasswordResetRequest):
    """Generate a time-limited reset token and email it to the user."""
    email = data.email.strip().lower()
    user = await db.users.find_one({"email": email})
    if user:
        token = str(uuid.uuid4())
        expires_at = datetime.utcnow() + timedelta(hours=1)
        await db.password_resets.update_one(
            {"email": email},
            {"$set": {"email": email, "token": token, "expires_at": expires_at}},
            upsert=True,
        )
        app_url = os.getenv("NEXT_PUBLIC_APP_URL", "https://domely.app")
        reset_url = f"{app_url}/reset-password?token={token}"
        resend_key = os.getenv("RESEND_API_KEY")
        if resend_key:
            try:
                import httpx
                async with httpx.AsyncClient() as http:
                    await http.post(
                        "https://api.resend.com/emails",
                        headers={"Authorization": f"Bearer {resend_key}", "Content-Type": "application/json"},
                        json={
                            "from": "Domely <noreply@domely.ca>",
                            "to": email,
                            "subject": "Réinitialisez votre mot de passe Domely",
                            "html": (
                                f"<p>Bonjour,</p>"
                                f"<p>Cliquez sur ce lien pour réinitialiser votre mot de passe. "
                                f"Ce lien expire dans <strong>1 heure</strong>.</p>"
                                f"<p><a href='{reset_url}'>Réinitialiser mon mot de passe</a></p>"
                                f"<p>Si vous n'avez pas fait cette demande, ignorez ce courriel.</p>"
                                f"<p>L'équipe Domely</p>"
                            ),
                        },
                        timeout=8.0,
                    )
            except Exception as e:
                logger.warning("[Auth] Password reset email failed: %s", e)
        else:
            logger.info("[Auth] Dev reset URL for %s: %s", email, reset_url)
    return {"ok": True, "message": "Si cet e-mail est enregistré, un lien a été envoyé."}

@api_router.post("/auth/reset-password")
async def reset_password(data: PasswordResetConfirm):
    """Validate reset token and set new password."""
    record = await db.password_resets.find_one({"token": data.token})
    if not record:
        raise HTTPException(status_code=400, detail="Token invalide ou expiré")
    if datetime.utcnow() > record["expires_at"]:
        await db.password_resets.delete_one({"token": data.token})
        raise HTTPException(status_code=400, detail="Token expiré")
    hashed = pwd_context.hash(data.new_password)
    await db.users.update_one({"email": record["email"]}, {"$set": {"hashed_password": hashed}})
    await db.password_resets.delete_one({"token": data.token})
    return {"ok": True, "message": "Mot de passe mis à jour avec succès."}

# ===========================
# MFA ROUTES
# ===========================

@api_router.post("/auth/mfa/setup", response_model=MFASetupResponse)
async def mfa_setup(current_user: dict = Depends(get_current_user)):
    """Generate a TOTP secret and QR code for MFA enrollment."""
    secret = pyotp.random_base32()
    uri = pyotp.totp.TOTP(secret).provisioning_uri(
        name=current_user["email"],
        issuer_name="Domely"
    )
    qr = segno.make(uri)
    buf = io.BytesIO()
    qr.save(buf, kind="png", scale=5)
    qr_b64 = base64.b64encode(buf.getvalue()).decode()
    # Store secret temporarily (not enabled yet — user must verify)
    await db.users.update_one({"id": current_user["id"]}, {"$set": {"mfa_secret_pending": secret}})
    return MFASetupResponse(secret=secret, uri=uri, qr_code_b64=qr_b64)

@api_router.post("/auth/mfa/verify")
async def mfa_verify(data: MFAVerifyRequest, current_user: dict = Depends(get_current_user)):
    """Confirm TOTP code and activate MFA."""
    secret = current_user.get("mfa_secret_pending") or current_user.get("mfa_secret")
    if not secret:
        raise HTTPException(status_code=400, detail="MFA setup not initiated")
    totp = pyotp.TOTP(secret)
    if not totp.verify(data.code, valid_window=1):
        raise HTTPException(status_code=400, detail="Code invalide")
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"mfa_enabled": True, "mfa_secret": secret}, "$unset": {"mfa_secret_pending": ""}}
    )
    return {"ok": True, "message": "MFA activé avec succès"}

@api_router.post("/auth/mfa/confirm")
async def mfa_confirm(data: MFAConfirmRequest):
    """Exchange mfa_pending token + TOTP code for a full access token."""
    try:
        payload = jwt.decode(data.mfa_token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token invalide ou expiré")
    if payload.get("type") != "mfa_pending":
        raise HTTPException(status_code=401, detail="Token invalide")
    user = await db.users.find_one({"id": payload["sub"]})
    if not user or not user.get("mfa_enabled"):
        raise HTTPException(status_code=401, detail="Utilisateur introuvable")
    totp = pyotp.TOTP(user["mfa_secret"])
    if not totp.verify(data.code, valid_window=1):
        raise HTTPException(status_code=400, detail="Code invalide")
    token = create_token(user["id"], user["email"])
    return {
        "access_token": token,
        "token_type": "bearer",
        "mfa_required": False,
        "user": {
            "id": user["id"], "email": user["email"], "full_name": user["full_name"],
            "phone": user.get("phone"),
            "plan": user.get("plan", "free"), "plan_status": user.get("plan_status", "active"),
            "is_admin": user.get("is_admin", False),
            "created_at": user["created_at"].isoformat() if isinstance(user["created_at"], datetime) else user["created_at"],
        }
    }

@api_router.post("/auth/mfa/disable")
async def mfa_disable(data: MFADisableRequest, current_user: dict = Depends(get_current_user)):
    """Disable MFA (requires password + current TOTP code)."""
    if not pwd_context.verify(data.current_password, current_user.get("hashed_password", "")):
        raise HTTPException(status_code=400, detail="Mot de passe incorrect")
    secret = current_user.get("mfa_secret")
    if not secret:
        raise HTTPException(status_code=400, detail="MFA non activé")
    totp = pyotp.TOTP(secret)
    if not totp.verify(data.code, valid_window=1):
        raise HTTPException(status_code=400, detail="Code invalide")
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"mfa_enabled": False}, "$unset": {"mfa_secret": ""}}
    )
    return {"ok": True, "message": "MFA désactivé"}

@api_router.get("/auth/mfa/status")
async def mfa_status(current_user: dict = Depends(get_current_user)):
    return {"mfa_enabled": current_user.get("mfa_enabled", False)}

# ===========================
# PROPERTY ROUTES
# ===========================

@api_router.post("/properties", response_model=Property)
async def create_property(data: PropertyCreate, current_user: dict = Depends(get_current_user)):
    property_obj = Property(user_id=current_user["id"], **data.model_dump())
    await db.properties.insert_one(property_obj.model_dump())
    await log_audit(current_user["id"], "property", property_obj.id, "created",
                    property_id=property_obj.id, entity_label=property_obj.name)
    # First-property milestone email
    count = await db.properties.count_documents({"user_id": current_user["id"]})
    if count == 1:
        import asyncio
        asyncio.create_task(_on_first_property(current_user, property_obj.name))
    return property_obj

@api_router.get("/properties", response_model=List[PropertyWithStats])
async def get_properties(current_user: dict = Depends(get_current_user)):
    properties = await db.properties.find({"user_id": current_user["id"]}).to_list(100)
    result = []
    
    current_month = datetime.now().strftime("%Y-%m")
    
    for prop in properties:
        # Get units for this property
        units = await db.units.find({"property_id": prop["id"]}).to_list(100)
        total_units = len(units)
        occupied_units = sum(1 for u in units if u.get("is_occupied", False))
        vacant_units = total_units - occupied_units
        
        # Get rent info
        rent_expected = sum(u.get("rent_amount", 0) for u in units if u.get("is_occupied", False))
        
        # Get payments for current month
        unit_ids = [u["id"] for u in units]
        payments = await db.rent_payments.find({
            "unit_id": {"$in": unit_ids},
            "month_year": current_month
        }).to_list(100)
        rent_collected = sum(p.get("amount", 0) for p in payments)
        
        # Get open maintenance count
        open_maintenance = await db.maintenance_requests.count_documents({
            "property_id": prop["id"],
            "status": {"$in": ["open", "in_progress"]}
        })
        
        # Get next lease expiry
        leases = await db.leases.find({
            "unit_id": {"$in": unit_ids},
            "is_active": True
        }).to_list(100)
        
        next_expiry = None
        if leases:
            sorted_leases = sorted(leases, key=lambda x: x["end_date"])
            if sorted_leases:
                next_expiry = sorted_leases[0]["end_date"]
        
        # Get expenses for current month
        month_expenses = await db.expenses.find({
            "property_id": prop["id"],
            "expense_date": {"$regex": f"^{current_month}"}
        }).to_list(200)
        total_expenses = sum(e.get("amount", 0) for e in month_expenses)
        net_cash_flow = rent_collected - total_expenses

        result.append(PropertyWithStats(
            **prop,
            total_units=total_units,
            occupied_units=occupied_units,
            vacant_units=vacant_units,
            rent_collected=rent_collected,
            rent_expected=rent_expected,
            total_expenses=total_expenses,
            net_cash_flow=net_cash_flow,
            open_maintenance=open_maintenance,
            next_lease_expiry=next_expiry
        ))

    return result

@api_router.get("/properties/{property_id}", response_model=PropertyWithStats)
async def get_property(property_id: str, current_user: dict = Depends(get_current_user)):
    prop = await db.properties.find_one({"id": property_id, "user_id": current_user["id"]})
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    
    current_month = datetime.now().strftime("%Y-%m")
    
    units = await db.units.find({"property_id": property_id}).to_list(100)
    total_units = len(units)
    occupied_units = sum(1 for u in units if u.get("is_occupied", False))
    vacant_units = total_units - occupied_units
    
    rent_expected = sum(u.get("rent_amount", 0) for u in units if u.get("is_occupied", False))
    
    unit_ids = [u["id"] for u in units]
    payments = await db.rent_payments.find({
        "unit_id": {"$in": unit_ids},
        "month_year": current_month
    }).to_list(100)
    rent_collected = sum(p.get("amount", 0) for p in payments)
    
    open_maintenance = await db.maintenance_requests.count_documents({
        "property_id": property_id,
        "status": {"$in": ["open", "in_progress"]}
    })
    
    leases = await db.leases.find({
        "unit_id": {"$in": unit_ids},
        "is_active": True
    }).to_list(100)
    
    next_expiry = None
    if leases:
        sorted_leases = sorted(leases, key=lambda x: x["end_date"])
        if sorted_leases:
            next_expiry = sorted_leases[0]["end_date"]

    month_expenses = await db.expenses.find({
        "property_id": property_id,
        "expense_date": {"$regex": f"^{current_month}"}
    }).to_list(200)
    total_expenses = sum(e.get("amount", 0) for e in month_expenses)
    net_cash_flow = rent_collected - total_expenses

    return PropertyWithStats(
        **prop,
        total_units=total_units,
        occupied_units=occupied_units,
        vacant_units=vacant_units,
        rent_collected=rent_collected,
        rent_expected=rent_expected,
        total_expenses=total_expenses,
        net_cash_flow=net_cash_flow,
        open_maintenance=open_maintenance,
        next_lease_expiry=next_expiry
    )

@api_router.put("/properties/{property_id}", response_model=Property)
async def update_property(property_id: str, data: PropertyCreate, current_user: dict = Depends(get_current_user)):
    prop = await db.properties.find_one({"id": property_id, "user_id": current_user["id"]})
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    
    update_data = data.model_dump()
    update_data["updated_at"] = datetime.utcnow()
    
    await db.properties.update_one({"id": property_id}, {"$set": update_data})
    updated = await db.properties.find_one({"id": property_id})
    await log_audit(current_user["id"], "property", property_id, "updated",
                    property_id=property_id, entity_label=data.name)
    return Property(**updated)

@api_router.delete("/properties/{property_id}")
async def delete_property(property_id: str, current_user: dict = Depends(get_current_user)):
    prop = await db.properties.find_one({"id": property_id, "user_id": current_user["id"]})
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    
    await db.properties.delete_one({"id": property_id})
    await db.units.delete_many({"property_id": property_id})
    await db.maintenance_requests.delete_many({"property_id": property_id})
    await db.assets.delete_many({"property_id": property_id})
    await log_audit(current_user["id"], "property", property_id, "deleted",
                    property_id=property_id, entity_label=prop.get("name"))
    return {"message": "Property deleted"}

@api_router.patch("/properties/{property_id}/late-fee-settings")
async def update_late_fee_settings(property_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    prop = await db.properties.find_one({"id": property_id, "user_id": current_user["id"]})
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    body = await request.json()
    update = {}
    if "late_fee_amount" in body:
        update["late_fee_amount"] = float(body["late_fee_amount"])
    if "late_fee_grace_days" in body:
        update["late_fee_grace_days"] = int(body["late_fee_grace_days"])
    if update:
        await db.properties.update_one({"id": property_id}, {"$set": update})
    return {"success": True}

# ── Asset endpoints ────────────────────────────────────────────────────────────

@api_router.get("/properties/{property_id}/assets", response_model=List[Asset])
async def get_assets(property_id: str, current_user: dict = Depends(get_current_user)):
    prop = await db.properties.find_one({"id": property_id, "user_id": current_user["id"]})
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    assets = await db.assets.find({"property_id": property_id}).sort("created_at", 1).to_list(200)
    return [Asset(**a) for a in assets]

@api_router.post("/properties/{property_id}/assets", response_model=Asset)
async def create_asset(property_id: str, data: AssetCreate, current_user: dict = Depends(get_current_user)):
    prop = await db.properties.find_one({"id": property_id, "user_id": current_user["id"]})
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    asset = Asset(property_id=property_id, user_id=current_user["id"], **data.model_dump())
    await db.assets.insert_one(asset.model_dump())
    await log_audit(current_user["id"], "asset", asset.id, "created",
                    property_id=property_id, entity_label=asset.name)
    return asset

@api_router.put("/properties/{property_id}/assets/{asset_id}", response_model=Asset)
async def update_asset(property_id: str, asset_id: str, data: AssetCreate, current_user: dict = Depends(get_current_user)):
    asset = await db.assets.find_one({"id": asset_id, "property_id": property_id, "user_id": current_user["id"]})
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    update_fields = {k: v for k, v in data.model_dump().items() if v is not None}
    await db.assets.update_one({"id": asset_id}, {"$set": update_fields})
    updated = await db.assets.find_one({"id": asset_id})
    await log_audit(current_user["id"], "asset", asset_id, "updated",
                    property_id=property_id, entity_label=data.name)
    return Asset(**updated)

@api_router.delete("/properties/{property_id}/assets/{asset_id}")
async def delete_asset(property_id: str, asset_id: str, current_user: dict = Depends(get_current_user)):
    asset = await db.assets.find_one({"id": asset_id, "property_id": property_id, "user_id": current_user["id"]})
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    await db.assets.delete_one({"id": asset_id})
    await log_audit(current_user["id"], "asset", asset_id, "deleted",
                    property_id=property_id, entity_label=asset.get("name"))
    return {"message": "Asset deleted"}

# ── Audit log endpoint ─────────────────────────────────────────────────────────

@api_router.get("/properties/{property_id}/audit")
async def get_property_audit(property_id: str, current_user: dict = Depends(get_current_user)):
    prop = await db.properties.find_one({"id": property_id, "user_id": current_user["id"]})
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    logs = await db.audit_logs.find(
        {"property_id": property_id, "user_id": current_user["id"]}
    ).sort("created_at", -1).to_list(200)
    for l in logs:
        l.pop("_id", None)
        if isinstance(l.get("created_at"), datetime):
            l["created_at"] = l["created_at"].isoformat()
    return logs


class BulkEmailPayload(BaseModel):
    subject: str
    body: str  # plain text with {{merge_vars}}


@api_router.post("/properties/{property_id}/email-tenants")
async def email_property_tenants(
    property_id: str,
    payload: BulkEmailPayload,
    current_user: dict = Depends(get_current_user),
):
    """Send a bulk email to all active tenants in a property, with merge variable substitution."""
    prop = await db.properties.find_one({"id": property_id, "user_id": current_user["id"]})
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")

    # Fetch units for this property
    units = await db.units.find({"property_id": property_id}).to_list(200)
    unit_map = {u["id"]: u for u in units}

    # Fetch all tenants in these units
    unit_ids = [u["id"] for u in units]
    tenants = await db.tenants.find(
        {"unit_id": {"$in": unit_ids}, "user_id": current_user["id"]}
    ).to_list(200)

    if not tenants:
        raise HTTPException(status_code=404, detail="No tenants found for this property")

    # Find active lease per tenant for merge variable resolution
    leases = await db.leases.find(
        {"unit_id": {"$in": unit_ids}, "status": "active"}
    ).to_list(200)
    lease_by_unit: dict = {}
    for lease in leases:
        lease_by_unit[lease.get("unit_id", "")] = lease

    sent = 0
    skipped = 0
    for tenant in tenants:
        email = tenant.get("email", "").strip()
        if not email:
            skipped += 1
            continue

        first_name = tenant.get("first_name", "")
        last_name  = tenant.get("last_name", "")
        unit       = unit_map.get(tenant.get("unit_id", ""), {})
        lease      = lease_by_unit.get(tenant.get("unit_id", ""), {})

        def _s(d: dict, k: str, default: str = "") -> str:
            return str(d.get(k) or default)

        rent    = f"${float(_s(lease, 'rent_amount', '0')):,.2f}" if lease.get("rent_amount") else ""
        address = f"{_s(prop, 'address')}, {_s(prop, 'city')}".strip(", ")
        start   = _s(lease, "start_date")
        end     = _s(lease, "end_date")

        substituted = (
            payload.body
            .replace("{{prenom}}", first_name)
            .replace("{{nom}}", last_name)
            .replace("{{montant_loyer}}", rent)
            .replace("{{adresse}}", address)
            .replace("{{date_debut_bail}}", start)
            .replace("{{date_fin_bail}}", end)
        )

        html_body = f"""
<div style="font-family:system-ui,-apple-system,sans-serif;max-width:600px;margin:0 auto;color:#111827">
  <div style="background:#0f766e;padding:24px 32px;border-radius:12px 12px 0 0">
    <span style="color:#fff;font-size:18px;font-weight:700">Domely</span>
  </div>
  <div style="background:#fff;padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px">
    <p style="margin:0 0 8px;font-size:13px;color:#6b7280">Message de votre propriétaire</p>
    <h2 style="margin:0 0 24px;font-size:20px;font-weight:700">{payload.subject}</h2>
    <div style="font-size:15px;line-height:1.7;white-space:pre-wrap">{substituted}</div>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0" />
    <p style="margin:0;font-size:12px;color:#9ca3af">Envoyé via Domely · <a href="https://domely.app" style="color:#0f766e;text-decoration:none">domely.app</a></p>
  </div>
</div>
"""
        subject_merged = payload.subject.replace("{{prenom}}", first_name).replace("{{nom}}", last_name)
        asyncio.create_task(_send_auto_email(email, subject_merged, html_body))
        sent += 1

    return {"sent": sent, "skipped": skipped, "total": len(tenants)}


# ─── PROPERTY DOCUMENTS ────────────────────────────────────────────

class PropertyDocumentCreate(BaseModel):
    name: str
    file_type: str  # "pdf", "jpg", "png", etc.
    base64_data: str  # base64 encoded file
    size_kb: Optional[float] = None
    unit_id: Optional[str] = None  # None = property-level

@api_router.get("/properties/{property_id}/documents")
async def get_property_documents(property_id: str, current_user: dict = Depends(get_current_user)):
    prop = await db.properties.find_one({"id": property_id, "user_id": current_user["id"]})
    if not prop:
        raise HTTPException(404, "Property not found")
    docs = await db.property_documents.find({"property_id": property_id, "user_id": current_user["id"]}).sort("uploaded_at", -1).to_list(100)
    for d in docs:
        d.pop("_id", None)
        d.pop("base64_data", None)  # Don't return raw data in listing (too large)
    return docs

@api_router.post("/properties/{property_id}/documents")
async def upload_property_document(property_id: str, doc: PropertyDocumentCreate, current_user: dict = Depends(get_current_user)):
    prop = await db.properties.find_one({"id": property_id, "user_id": current_user["id"]})
    if not prop:
        raise HTTPException(404, "Property not found")
    now = datetime.utcnow().isoformat()
    doc_id = str(uuid.uuid4())
    doc_record = {
        "id": doc_id,
        "property_id": property_id,
        "user_id": current_user["id"],
        "unit_id": doc.unit_id,
        "name": doc.name,
        "file_type": doc.file_type,
        "base64_data": doc.base64_data,
        "size_kb": doc.size_kb,
        "uploaded_at": now,
    }
    await db.property_documents.insert_one(doc_record)
    doc_record.pop("_id", None)
    doc_record.pop("base64_data", None)
    return doc_record

@api_router.get("/properties/{property_id}/documents/{doc_id}/download")
async def download_property_document(property_id: str, doc_id: str, current_user: dict = Depends(get_current_user)):
    from fastapi.responses import StreamingResponse
    import io
    doc = await db.property_documents.find_one({"id": doc_id, "property_id": property_id, "user_id": current_user["id"]})
    if not doc:
        raise HTTPException(404, "Document not found")
    raw = base64.b64decode(doc["base64_data"])
    mt = "application/pdf" if doc.get("file_type") == "pdf" else f"image/{doc.get('file_type', 'jpeg')}"
    return StreamingResponse(
        io.BytesIO(raw),
        media_type=mt,
        headers={"Content-Disposition": f'attachment; filename="{doc["name"]}"'}
    )

@api_router.delete("/properties/{property_id}/documents/{doc_id}")
async def delete_property_document(property_id: str, doc_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.property_documents.delete_one({"id": doc_id, "property_id": property_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(404, "Document not found")
    return {"ok": True}


# ===========================
# UNIT ROUTES
# ===========================

@api_router.post("/units", response_model=Unit)
async def create_unit(data: UnitCreate, current_user: dict = Depends(get_current_user)):
    # Verify property belongs to user
    prop = await db.properties.find_one({"id": data.property_id, "user_id": current_user["id"]})
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    
    unit = Unit(**data.model_dump())
    await db.units.insert_one(unit.model_dump())
    return unit

@api_router.get("/units", response_model=List[Unit])
async def get_units(property_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    # Get user's property IDs
    properties = await db.properties.find({"user_id": current_user["id"]}).to_list(100)
    property_ids = [p["id"] for p in properties]
    
    query = {"property_id": {"$in": property_ids}}
    if property_id:
        if property_id not in property_ids:
            raise HTTPException(status_code=404, detail="Property not found")
        query = {"property_id": property_id}
    
    units = await db.units.find(query).to_list(100)
    return [Unit(**u) for u in units]

@api_router.get("/units/{unit_id}", response_model=Unit)
async def get_unit(unit_id: str, current_user: dict = Depends(get_current_user)):
    unit = await db.units.find_one({"id": unit_id})
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")
    
    # Verify property belongs to user
    prop = await db.properties.find_one({"id": unit["property_id"], "user_id": current_user["id"]})
    if not prop:
        raise HTTPException(status_code=404, detail="Unit not found")
    
    return Unit(**unit)

@api_router.put("/units/{unit_id}", response_model=Unit)
async def update_unit(unit_id: str, data: UnitCreate, current_user: dict = Depends(get_current_user)):
    unit = await db.units.find_one({"id": unit_id})
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")
    
    prop = await db.properties.find_one({"id": unit["property_id"], "user_id": current_user["id"]})
    if not prop:
        raise HTTPException(status_code=404, detail="Unit not found")
    
    await db.units.update_one({"id": unit_id}, {"$set": data.model_dump()})
    updated = await db.units.find_one({"id": unit_id})
    return Unit(**updated)

@api_router.delete("/units/{unit_id}")
async def delete_unit(unit_id: str, current_user: dict = Depends(get_current_user)):
    unit = await db.units.find_one({"id": unit_id})
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")
    
    prop = await db.properties.find_one({"id": unit["property_id"], "user_id": current_user["id"]})
    if not prop:
        raise HTTPException(status_code=404, detail="Unit not found")
    
    await db.units.delete_one({"id": unit_id})
    return {"message": "Unit deleted"}

# ===========================
# TENANT ROUTES
# ===========================

@api_router.post("/tenants", response_model=Tenant)
async def create_tenant(data: TenantCreate, current_user: dict = Depends(get_current_user)):
    tenant = Tenant(user_id=current_user["id"], **data.model_dump())
    await db.tenants.insert_one(tenant.model_dump())

    # If unit_id provided, update unit
    if data.unit_id:
        await db.units.update_one(
            {"id": data.unit_id},
            {"$set": {"is_occupied": True, "current_tenant_id": tenant.id}}
        )

    # First-tenant milestone email
    count = await db.tenants.count_documents({"user_id": current_user["id"]})
    if count == 1:
        import asyncio
        tenant_name = f"{tenant.first_name} {tenant.last_name}".strip()
        asyncio.create_task(_on_first_tenant(current_user, tenant_name))

    return tenant

@api_router.get("/tenants", response_model=List[TenantWithDetails])
async def get_tenants(current_user: dict = Depends(get_current_user)):
    tenants = await db.tenants.find({"user_id": current_user["id"]}).to_list(100)
    result = []
    
    current_month = datetime.now().strftime("%Y-%m")
    
    for tenant in tenants:
        unit_number = None
        property_name = None
        lease_end_date = None
        rent_status = "N/A"
        
        if tenant.get("unit_id"):
            unit = await db.units.find_one({"id": tenant["unit_id"]})
            if unit:
                unit_number = unit.get("unit_number")
                prop = await db.properties.find_one({"id": unit.get("property_id")})
                if prop:
                    property_name = prop.get("name")
            
            # Get active lease
            lease = await db.leases.find_one({
                "tenant_id": tenant["id"],
                "is_active": True
            })
            if lease:
                lease_end_date = lease.get("end_date")
                
                # Check rent status
                payment = await db.rent_payments.find_one({
                    "tenant_id": tenant["id"],
                    "month_year": current_month
                })
                
                if payment:
                    rent_status = "paid"
                else:
                    # Check if rent is due
                    today = datetime.now().day
                    if today > lease.get("payment_due_day", 1):
                        rent_status = "late"
                    else:
                        rent_status = "pending"
        
        result.append(TenantWithDetails(
            **tenant,
            unit_number=unit_number,
            property_name=property_name,
            lease_end_date=lease_end_date,
            rent_status=rent_status
        ))
    
    return result

@api_router.get("/tenants/{tenant_id}", response_model=TenantWithDetails)
async def get_tenant(tenant_id: str, current_user: dict = Depends(get_current_user)):
    tenant = await db.tenants.find_one({"id": tenant_id, "user_id": current_user["id"]})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    unit_number = None
    property_name = None
    lease_end_date = None
    rent_status = "N/A"
    
    current_month = datetime.now().strftime("%Y-%m")
    
    if tenant.get("unit_id"):
        unit = await db.units.find_one({"id": tenant["unit_id"]})
        if unit:
            unit_number = unit.get("unit_number")
            prop = await db.properties.find_one({"id": unit.get("property_id")})
            if prop:
                property_name = prop.get("name")
        
        lease = await db.leases.find_one({
            "tenant_id": tenant["id"],
            "is_active": True
        })
        if lease:
            lease_end_date = lease.get("end_date")
            
            payment = await db.rent_payments.find_one({
                "tenant_id": tenant["id"],
                "month_year": current_month
            })
            
            if payment:
                rent_status = "paid"
            else:
                today = datetime.now().day
                if today > lease.get("payment_due_day", 1):
                    rent_status = "late"
                else:
                    rent_status = "pending"
    
    return TenantWithDetails(
        **tenant,
        unit_number=unit_number,
        property_name=property_name,
        lease_end_date=lease_end_date,
        rent_status=rent_status
    )

@api_router.put("/tenants/{tenant_id}", response_model=Tenant)
async def update_tenant(tenant_id: str, data: TenantCreate, current_user: dict = Depends(get_current_user)):
    tenant = await db.tenants.find_one({"id": tenant_id, "user_id": current_user["id"]})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    # Handle unit change
    old_unit_id = tenant.get("unit_id")
    new_unit_id = data.unit_id
    
    if old_unit_id != new_unit_id:
        if old_unit_id:
            await db.units.update_one(
                {"id": old_unit_id},
                {"$set": {"is_occupied": False, "current_tenant_id": None}}
            )
        if new_unit_id:
            await db.units.update_one(
                {"id": new_unit_id},
                {"$set": {"is_occupied": True, "current_tenant_id": tenant_id}}
            )
    
    await db.tenants.update_one({"id": tenant_id}, {"$set": data.model_dump()})
    updated = await db.tenants.find_one({"id": tenant_id})
    return Tenant(**updated)

@api_router.delete("/tenants/{tenant_id}")
async def delete_tenant(tenant_id: str, current_user: dict = Depends(get_current_user)):
    tenant = await db.tenants.find_one({"id": tenant_id, "user_id": current_user["id"]})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    # Free up unit
    if tenant.get("unit_id"):
        await db.units.update_one(
            {"id": tenant["unit_id"]},
            {"$set": {"is_occupied": False, "current_tenant_id": None}}
        )
    
    # Deactivate leases
    await db.leases.update_many({"tenant_id": tenant_id}, {"$set": {"is_active": False}})
    
    await db.tenants.delete_one({"id": tenant_id})
    return {"message": "Tenant deleted"}


@api_router.get("/tenants/{tenant_id}/payments")
async def get_tenant_payments_landlord(tenant_id: str, current_user: dict = Depends(get_current_user)):
    tenant = await db.tenants.find_one({"id": tenant_id, "user_id": current_user["id"]})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    payments = await db.rent_payments.find({"tenant_id": tenant_id}).sort("month_year", -1).to_list(36)
    result = []
    for p in payments:
        p.pop("_id", None)
        if isinstance(p.get("created_at"), datetime):
            p["created_at"] = p["created_at"].isoformat()
        result.append(p)
    return result


@api_router.get("/tenants/{tenant_id}/maintenance")
async def get_tenant_maintenance_landlord(tenant_id: str, current_user: dict = Depends(get_current_user)):
    tenant = await db.tenants.find_one({"id": tenant_id, "user_id": current_user["id"]})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    requests = await db.maintenance_requests.find(
        {"submitted_by_tenant_id": tenant_id}
    ).sort("created_at", -1).to_list(50)
    result = []
    for r in requests:
        r.pop("_id", None)
        for f in ("created_at", "updated_at"):
            if isinstance(r.get(f), datetime):
                r[f] = r[f].isoformat()
        result.append(r)
    return result


@api_router.get("/tenants/{tenant_id}/documents")
async def get_tenant_documents_landlord(tenant_id: str, current_user: dict = Depends(get_current_user)):
    tenant = await db.tenants.find_one({"id": tenant_id, "user_id": current_user["id"]})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    docs = []
    # Leases
    leases = await db.leases.find({"tenant_id": tenant_id}).sort("start_date", -1).to_list(10)
    for lease in leases:
        sd = lease.get("start_date", "")
        docs.append({
            "id": str(lease.get("id", lease.get("_id", ""))),
            "name": f"Bail — {sd[:7] if sd else 'Sans date'}",
            "type": "lease",
            "date": sd,
            "icon": "document-text-outline",
            "color": "#2563EB",
        })
    # Payment receipts
    payments = await db.rent_payments.find({"tenant_id": tenant_id}).sort("month_year", -1).to_list(36)
    for p in payments:
        created = p.get("created_at", "")
        if isinstance(created, datetime):
            created = created.strftime("%Y-%m-%d")
        docs.append({
            "id": f"receipt_{p.get('id', p.get('_id', ''))}",
            "name": f"Reçu — {p.get('month_year', '')}",
            "type": "receipt",
            "date": p.get("paid_date") or (created[:10] if created else ""),
            "icon": "checkmark-circle-outline",
            "color": "#10B981",
        })
    return docs


# ===========================
# QUEBEC BAIL PDF GENERATOR
# ===========================

# ── Official TAL form cache (in-process) ─────────────────────────────────────
_TAL_PDF_CACHE: bytes | None = None

def _fetch_tal_base_pdf() -> bytes:
    """Download the official TAL 'Bail de logement' Form 5 from LégisQuébec (cached)."""
    global _TAL_PDF_CACHE
    if _TAL_PDF_CACHE is not None:
        return _TAL_PDF_CACHE
    import urllib.request
    url = (
        "https://www.legisquebec.gouv.qc.ca/fr/ressource/rc/"
        "T-15.01R3_FR_005_003.pdf?langCont=fr&cible=FEE9CE4C4DD99734E08B1B34E19B058C"
    )
    req = urllib.request.Request(url, headers={
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Referer":    "https://www.legisquebec.gouv.qc.ca/fr/document/rc/T-15.01,%20r.%203",
    })
    import ssl as _ssl
    try:
        import certifi as _certifi
        _ctx = _ssl.create_default_context(cafile=_certifi.where())
    except Exception:
        _ctx = _ssl.create_default_context()
    with urllib.request.urlopen(req, timeout=20, context=_ctx) as resp:
        data = resp.read()
    if len(data) < 10000 or not data.startswith(b"%PDF"):
        raise ValueError(f"Unexpected response ({len(data)} bytes)")
    _TAL_PDF_CACHE = data
    return _TAL_PDF_CACHE


def _rl_safe(text: str) -> str:
    """Sanitize text for Helvetica (latin-1 only) in reportlab."""
    _repl = str.maketrans({
        '\u2014': '-', '\u2013': '-', '\u2012': '-',
        '\u2018': "'", '\u2019': "'",
        '\u201c': '"', '\u201d': '"',
        '\u2026': '...',
        '\u00a0': ' ',
    })
    t = text.translate(_repl)
    return t.encode('latin-1', errors='replace').decode('latin-1')


def _make_tal_overlay(page_size: tuple, fields: list) -> bytes:
    """
    Build a single-page transparent PDF overlay using reportlab.
    fields: list of:
        ('text',     x, y, text, fontsize)
        ('checkbox', x, y, size)   — filled dark-blue square
    Filled data is rendered in Domely ink-blue (#1A3D9E) so it is
    visually distinct from the pre-printed form text.
    """
    from reportlab.pdfgen import canvas as rl_canvas
    import io
    pw, ph = page_size
    buf = io.BytesIO()
    c = rl_canvas.Canvas(buf, pagesize=(pw, ph))
    # Domely ink-blue: distinguishes filled data from printed form text
    INK_R, INK_G, INK_B = 0.102, 0.239, 0.620   # #1A3D9E
    c.setFillColorRGB(INK_R, INK_G, INK_B)
    for item in fields:
        kind = item[0]
        if kind == 'checkbox':
            _, x, y, sz = item
            c.setFillColorRGB(INK_R, INK_G, INK_B)
            c.rect(x, y, sz, sz, fill=1, stroke=0)
        elif kind == 'text':
            _, x, y, text, fs = item
            if text and str(text).strip():
                c.setFillColorRGB(INK_R, INK_G, INK_B)
                c.setFont("Helvetica-Bold", fs)
                c.drawString(x, y, _rl_safe(str(text).strip())[:80])
        elif kind == 'whitebox':
            _, x, y, w, h = item
            c.setFillColorRGB(1.0, 1.0, 1.0)
            c.rect(x, y, w, h, fill=1, stroke=0)
            c.setFillColorRGB(INK_R, INK_G, INK_B)  # restore ink color
    c.save()
    buf.seek(0)
    return buf.read()


def _fill_tal_form(
    base_pdf: bytes,
    lease: dict, tenant: dict, unit: dict, prop: dict, landlord: dict,
) -> bytes:
    """
    Overlay lease data onto the official TAL Bail de logement PDF (Form 5).
    Page dimensions: 612 × 1080 pt (letter, non-standard height).
    """
    from pypdf import PdfReader, PdfWriter
    import io

    # ── helper ──────────────────────────────────────────────────────────────
    def g(d: dict, *keys):
        for k in keys:
            v = d.get(k)
            if v is not None and str(v).strip():
                return str(v).strip()
        return ""

    # ── Data ────────────────────────────────────────────────────────────────
    land_name    = g(landlord, "full_name", "name")
    land_addr    = g(landlord, "address")
    land_apt     = g(landlord, "unit_number")
    land_city    = g(landlord, "city")
    land_postal  = g(landlord, "postal_code")
    land_phone   = g(landlord, "phone")
    land_email   = g(landlord, "email")

    ten_fname    = g(tenant, "first_name")
    ten_lname    = g(tenant, "last_name")
    ten_name     = f"{ten_fname} {ten_lname}".strip()
    ten_addr     = g(tenant, "address")
    ten_city     = g(tenant, "city")
    ten_postal   = g(tenant, "postal_code")
    ten_phone    = g(tenant, "phone")
    ten_email    = g(tenant, "email")

    unit_no      = g(unit, "unit_number")
    rooms        = g(unit, "bedrooms")
    prop_addr    = g(prop, "address")
    prop_city    = g(prop, "city")
    prop_postal  = g(prop, "postal_code")

    dwelling_addr = f"{prop_addr}, App. {unit_no}" if unit_no else prop_addr

    start_date   = g(lease, "start_date")
    end_date     = g(lease, "end_date")
    is_fixed     = bool(end_date)
    rent_amount  = float(lease.get("rent_amount") or 0)
    due_day      = int(lease.get("payment_due_day") or 1)

    # French number format: 1 250,00
    rent_str = f"{rent_amount:,.2f}".replace(",", "\xa0").replace(".", ",")

    # ── Page dimensions ──────────────────────────────────────────────────────
    PW, PH = 612.0, 1080.0
    FS = 8.5          # standard field font size
    FS_SM = 7.5       # smaller for tight fields

    # ════════════════════════════════════════════════════════════════════════
    # Page 1 — Section A (parties), B (dwelling), C (duration)
    # Y coords from pypdf visitor_text extraction (baseline from bottom, y=0 at page foot).
    # Data placed ~12 pt BELOW each label baseline → lands in the blank writing area.
    #
    # Verified label y positions (page 0):
    #   Section A: Nom=802.3 | No Rue=781.6 | Munic=760.6 | Tel=739.2 | Email=718.8
    #   Section B: No Rue App.=508.6 | Munic/CP/Pièces=487.8
    #   Section C: Du...au / commençant le = 100.0
    # ════════════════════════════════════════════════════════════════════════
    p1 = [
        # ── Section A — Landlord (left column, labels at x=36.3) ──
        # Each label row is ~21 pt tall; data goes 12 pt below label baseline.
        ('text',  40, 790, land_name,                                    FS),
        ('text',  40, 769, f"{land_addr}  {land_apt}".strip(),           FS),
        ('text',  40, 748, land_city,                                    FS),
        ('text', 200, 748, land_postal,                                  FS),
        ('text',  40, 727, land_phone,                                   FS),
        ('text',  40, 706, land_email,                                   FS_SM),

        # ── Section A — Tenant (right column, labels at x=315.1) ──
        ('text', 320, 790, ten_name,                                     FS),
        ('text', 320, 769, ten_addr,                                     FS),
        ('text', 320, 748, ten_city,                                     FS),
        ('text', 468, 748, ten_postal,                                   FS),
        ('text', 320, 727, ten_phone,                                    FS),
        ('text', 320, 706, ten_email,                                    FS_SM),

        # ── Section B — Dwelling ──
        # "Adresse" section label at y=516.6; "No Rue App." field label at y=508.6
        # "Rue" label at x=153.31 (ends ≈x=167); address data starts after it at x=182.
        # "App." label at x=539.81; we embed the apt number in dwelling_addr for simplicity.
        ('text', 182, 508, dwelling_addr,                                FS),
        # "Municipalité Code postal Nombre de pièces" row at y=487.8.
        # This is an INLINE row: each label + blank spans the full page width.
        # Exact label positions from raw PDF content stream (Td operator analysis):
        #   "Municipalité"    label at x=36.31  (ends ≈ x=90)
        #   "Code postal"     label at x=360.31 (= 36.31 + 40.5×8), ends ≈ x=403
        #   "Nombre de pièces" label at x=499.10 (= 360.31 + 17.349×8), ends ≈ x=568
        # Blank areas (where data should go):
        #   Municipalité blank:   x=90  → x=360  (270pt wide) → city at x=95
        #   Code postal blank:    x=403 → x=499  ( 96pt wide) → postal at x=408
        #   Nombre de pièces blank: x=568 → x=612 ( 44pt wide) → rooms at x=572
        ('text',  95, 487, prop_city,                                    FS),
        ('text', 408, 487, prop_postal,                                  FS),
        ('text', 572, 487, rooms,                                        FS),

        # ── Section C — Lease duration ──
        # "Du au" inline at y=100; "commençant le" inline at y=100.
        # Data on the same line, after the printed prefix text.
        ('text',  55, 100, start_date if is_fixed else "",               FS),
        ('text', 175, 100, end_date   if is_fixed else "",               FS),
        ('text', 380, 100, start_date if not is_fixed else "",           FS),
    ]
    # Checkboxes: small filled square to the left of each duration-type label.
    # "BAIL À DURÉE FIXE" at x=36.3, y=137.1 → checkbox at x=27, y=134
    # "BAIL À DURÉE INDÉTERMINÉE" at x=315.1, y=136.8 → checkbox at x=305, y=134
    if is_fixed:
        p1.append(('checkbox', 27.0, 134.0, 5.0))
    else:
        p1.append(('checkbox', 305.0, 134.0, 5.0))

    # ════════════════════════════════════════════════════════════════════════
    # Page 3 (index 2) — Section D: Loyer
    # Positions verified via raw content-stream Tm/Td extraction:
    #
    #   RENT ROW (y=985.25):
    #     "Le loyer est de" at x=36  →  rent amount field blank x≈115..204
    #     Checkbox circle "Par mois"  at x=216, y=986.45 (glyph <0046>)
    #     Checkbox circle "Par semaine" at x=270, y=986.45
    #
    #   DATE ROW (y=846.32):
    #     "Le loyer sera payé le " at x=45 ; period at x=203.
    #     "Jour Mois Année" label below at y=838.19 :
    #       Jour  box  x≈122 – 157
    #       Mois  box  x≈157 – 181
    #       Année box  x≈181 – 203
    #
    #   RECURRING PAYMENT ROW (y=814.32):
    #     Checkbox circle "Du mois"    at x=198, y=815.52
    #     Checkbox circle "De la semaine" at x=252, y=815.52
    # ════════════════════════════════════════════════════════════════════════

    # Split start_date (YYYY-MM-DD) into Jour / Mois / Année components
    try:
        _yr, _mo, _dy = start_date.split('-')
    except Exception:
        _yr, _mo, _dy = start_date, '', ''

    p3 = [
        # Rent amount — placed in the blank between "Le loyer est de " and "$."
        ('text', 115, 985, rent_str, FS),

        # "Par mois" checkbox — circle glyph at x=216, y=986.45;
        # fill with a 5.5pt square offset slightly inward
        ('checkbox', 213.5, 983.0, 5.5),

        # First payment date — split across Jour / Mois / Année sub-boxes
        ('text', 122, 846, _dy, FS),
        ('text', 157, 846, _mo, FS),
        ('text', 181, 846, _yr, FS),

        # Recurring payment: "Du mois" (monthly) — circle at x=198, y=815.52;
        # fill with 5.5pt square centred inside the circle
        ('checkbox', 195.0, 812.5, 5.5),
    ]

    overlays = {0: p1, 2: p3}

    # White box to cover "Reproduction interdite / Reproduction prohibited" header text
    # on every page of the official TAL form (top-right area, y≈1052–1074 on 612×1080 page).
    _REPRO_BOX = [('whitebox', 338, 1050, 274, 26)]

    # ── Merge ────────────────────────────────────────────────────────────────
    reader = PdfReader(io.BytesIO(base_pdf))
    writer = PdfWriter()
    for i, page in enumerate(reader.pages):
        page_fields = list(overlays.get(i, [])) + _REPRO_BOX
        ov_bytes = _make_tal_overlay((PW, PH), page_fields)
        ov_page  = PdfReader(io.BytesIO(ov_bytes)).pages[0]
        page.merge_page(ov_page)
        writer.add_page(page)

    out = io.BytesIO()
    writer.write(out)
    return out.getvalue()


def _append_signature_page(pdf_bytes: bytes, signatures: list) -> bytes:
    """
    Append a professional e-signature certificate page to the bail PDF.
    Shows each party's signature image, name, timestamp and a Domely verification ID.
    """
    from reportlab.pdfgen import canvas as rl_canvas
    from reportlab.lib.utils import ImageReader
    from pypdf import PdfReader, PdfWriter
    import io, base64, hashlib

    W, H = 612, 792   # standard letter pt

    # ── Build signature page ──────────────────────────────────────────────
    buf = io.BytesIO()
    c = rl_canvas.Canvas(buf, pagesize=(W, H))

    # Domely colours
    BLUE_R, BLUE_G, BLUE_B   = 0.102, 0.239, 0.620   # #1A3D9E  (header / accents)
    LIGHT_R, LIGHT_G, LIGHT_B = 0.945, 0.953, 0.984  # #F1F3FB  (box background)

    # ── Header bar ────────────────────────────────────────────────────────
    c.setFillColorRGB(BLUE_R, BLUE_G, BLUE_B)
    c.rect(0, H - 72, W, 72, fill=1, stroke=0)

    c.setFillColorRGB(1, 1, 1)
    c.setFont("Helvetica-Bold", 17)
    c.drawString(36, H - 32, "SIGNATURES \xc9LECTRONIQUES")
    c.setFont("Helvetica", 9)
    c.drawString(36, H - 50, "Bail de logement \u2014 Certifi\xe9 par Domely")

    sig_ids = [s.get("id", "") for s in signatures]
    ver_id  = hashlib.sha256("|".join(sig_ids).encode()).hexdigest()[:16].upper()
    c.setFont("Helvetica", 7.5)
    c.setFillColorRGB(0.8, 0.85, 1.0)
    c.drawRightString(W - 36, H - 50, f"ID : {ver_id}")

    # ── Signature panels ──────────────────────────────────────────────────
    landlord_sig = next((s for s in signatures if s.get("signer_type") == "landlord"), None)
    tenant_sig   = next((s for s in signatures if s.get("signer_type") == "tenant"),   None)

    panels = [
        ("LOCATEUR",   landlord_sig, 36),
        ("LOCATAIRE",  tenant_sig,   318),
    ]

    for label, sig, x_left in panels:
        box_w = 258
        box_h = 170
        y_box = H - 92 - box_h

        # Role label
        c.setFillColorRGB(BLUE_R, BLUE_G, BLUE_B)
        c.setFont("Helvetica-Bold", 8)
        c.drawString(x_left, H - 85, label)

        # Box background
        c.setFillColorRGB(LIGHT_R, LIGHT_G, LIGHT_B)
        c.setStrokeColorRGB(0.78, 0.82, 0.92)
        c.rect(x_left, y_box, box_w, box_h, fill=1, stroke=1)

        if sig and sig.get("signature_data"):
            raw = sig["signature_data"]
            if raw.startswith("data:"):
                raw = raw.split(",", 1)[1]
            try:
                img_bytes  = base64.b64decode(raw)
                img_reader = ImageReader(io.BytesIO(img_bytes))
                c.drawImage(
                    img_reader,
                    x_left + 8, y_box + 8,
                    width=box_w - 16, height=box_h - 16,
                    preserveAspectRatio=True, mask="auto",
                )
            except Exception:
                pass   # silently skip if image decode fails
        else:
            c.setFillColorRGB(0.72, 0.72, 0.72)
            c.setFont("Helvetica", 10)
            c.drawCentredString(x_left + box_w / 2, y_box + box_h / 2 - 5, "Non sign\xe9")

        # Name
        c.setFillColorRGB(0.10, 0.10, 0.10)
        c.setFont("Helvetica-Bold", 9)
        c.drawString(x_left, y_box - 14, sig.get("signer_name", "\u2014") if sig else "\u2014")

        # Timestamp
        if sig and sig.get("signed_at"):
            signed_str = sig["signed_at"][:19].replace("T", " ")
            c.setFont("Helvetica", 8)
            c.setFillColorRGB(0.45, 0.45, 0.45)
            c.drawString(x_left, y_box - 26, f"Sign\xe9 le {signed_str} UTC")

        # Checkmark badge if signed
        if sig:
            c.setFillColorRGB(0.06, 0.72, 0.42)
            c.circle(x_left + box_w - 10, H - 88, 7, fill=1, stroke=0)
            c.setFillColorRGB(1, 1, 1)
            c.setFont("Helvetica-Bold", 9)
            c.drawCentredString(x_left + box_w - 10, H - 90.5, "\u2713")

    # ── Divider ───────────────────────────────────────────────────────────
    y_div = H - 92 - 170 - 50
    c.setStrokeColorRGB(0.82, 0.86, 0.94)
    c.setLineWidth(0.5)
    c.line(36, y_div, W - 36, y_div)

    # ── Certificate footer ────────────────────────────────────────────────
    c.setFillColorRGB(BLUE_R, BLUE_G, BLUE_B)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(36, y_div - 18, "\u2713  Document certifi\xe9 \xe9lectroniquement via Domely")

    c.setFillColorRGB(0.38, 0.38, 0.38)
    c.setFont("Helvetica", 7.5)
    legal_lines = [
        "Les parties ont consenti \xe0 la signature \xe9lectronique de ce bail conform\xe9ment \xe0 la Loi concernant le cadre",
        "juridique des technologies de l\u2019information (L.R.Q., c. C-1.1). Ce document a valeur l\xe9gale.",
        f"ID de v\xe9rification : {ver_id}  \u2014  domely.ca",
    ]
    for i, line in enumerate(legal_lines):
        c.drawString(36, y_div - 32 - (i * 11), line)

    c.save()
    buf.seek(0)

    # ── Append page to bail PDF ───────────────────────────────────────────
    reader = PdfReader(io.BytesIO(pdf_bytes))
    writer = PdfWriter()
    for page in reader.pages:
        writer.add_page(page)
    sig_reader = PdfReader(io.BytesIO(buf.read()))
    writer.add_page(sig_reader.pages[0])
    out = io.BytesIO()
    writer.write(out)
    return out.getvalue()


def _make_bail_cover_page(lease: dict, tenant: dict, unit: dict, prop: dict, landlord: dict) -> bytes:
    """
    Generate a full-colour Domely-branded cover page (Letter, portrait) for the bail PDF.
    Prepended as page 1 before the official TAL form pages.
    """
    from reportlab.pdfgen import canvas as rl_canvas
    from reportlab.lib.colors import HexColor
    import io

    W, H = 612.0, 792.0   # standard letter pt
    buf  = io.BytesIO()
    c    = rl_canvas.Canvas(buf, pagesize=(W, H))

    # ── Colours ──────────────────────────────────────────────────────────────
    TEAL_DARK  = HexColor("#1E7A6E")   # Domely primary
    TEAL_MID   = HexColor("#3FAF86")   # Domely accent
    INK_BLUE   = HexColor("#1A3D9E")   # Domely blue
    OFF_WHITE  = HexColor("#F8FAFB")
    GRAY_LIGHT = HexColor("#E5E7EB")
    GRAY_MID   = HexColor("#6B7280")
    GRAY_DARK  = HexColor("#1F2937")
    WHITE      = HexColor("#FFFFFF")

    # ── Full-bleed teal gradient header (top 30 %) ───────────────────────────
    header_h = 236
    # Gradient simulation: draw two overlapping rects
    c.setFillColor(TEAL_DARK)
    c.rect(0, H - header_h, W, header_h, fill=1, stroke=0)
    c.setFillColor(TEAL_MID)
    # Right-side accent strip for depth
    c.rect(W * 0.6, H - header_h, W * 0.4, header_h, fill=1, stroke=0)
    c.setFillColor(TEAL_DARK)
    c.rect(W * 0.6, H - header_h, W * 0.4, header_h, fill=0, stroke=0)

    # Decorative circle elements
    c.setFillColor(HexColor("#FFFFFF"))
    c.setFillAlpha(0.06)
    c.circle(W - 80, H - 40, 130, fill=1, stroke=0)
    c.circle(W - 30, H - header_h + 30, 80, fill=1, stroke=0)
    c.setFillAlpha(1.0)

    # Domely wordmark in header
    c.setFillColor(WHITE)
    c.setFont("Helvetica-Bold", 22)
    c.drawString(44, H - 56, "Domely")
    c.setFont("Helvetica", 10)
    c.setFillColor(HexColor("#A7F3D0"))  # light teal
    c.drawString(44, H - 74, "Plateforme de gestion locative")

    # "BAIL DE LOGEMENT" title
    c.setFillColor(WHITE)
    c.setFont("Helvetica-Bold", 36)
    c.drawString(44, H - 130, "BAIL DE LOGEMENT")
    c.setFont("Helvetica", 13)
    c.setFillColor(HexColor("#D1FAE5"))
    c.drawString(44, H - 152, "Tribunal administratif du logement \u2014 Formulaire officiel")

    # TAL compliance badge
    badge_x = 44
    badge_y = H - 200
    c.setFillColor(HexColor("#065F46"))
    c.roundRect(badge_x, badge_y, 180, 22, 4, fill=1, stroke=0)
    c.setFillColor(HexColor("#6EE7B7"))
    c.setFont("Helvetica-Bold", 8)
    c.drawString(badge_x + 8, badge_y + 7, "\u2713  CONFORME TAL  \u2014  LOI CONCERNANT LE LOGEMENT")

    # ── Off-white body area ───────────────────────────────────────────────────
    c.setFillColor(OFF_WHITE)
    c.rect(0, 0, W, H - header_h, fill=1, stroke=0)

    # ── Info cards ───────────────────────────────────────────────────────────
    def draw_card(x: float, y: float, w: float, h_card: float, title: str, lines: list):
        """Draw a labelled info card."""
        c.setFillColor(WHITE)
        c.setStrokeColor(GRAY_LIGHT)
        c.setLineWidth(0.5)
        c.roundRect(x, y, w, h_card, 6, fill=1, stroke=1)
        # Title strip
        c.setFillColor(INK_BLUE)
        c.setFont("Helvetica-Bold", 8)
        c.drawString(x + 10, y + h_card - 14, title.upper())
        # Separator
        c.setStrokeColor(GRAY_LIGHT)
        c.line(x + 10, y + h_card - 18, x + w - 10, y + h_card - 18)
        # Content lines
        c.setFillColor(GRAY_DARK)
        c.setFont("Helvetica-Bold", 9)
        ly = y + h_card - 30
        for i, (label, value) in enumerate(lines):
            c.setFillColor(GRAY_MID)
            c.setFont("Helvetica", 7.5)
            c.drawString(x + 10, ly, label)
            c.setFillColor(GRAY_DARK)
            c.setFont("Helvetica-Bold", 9)
            c.drawString(x + 10, ly - 11, _rl_safe(str(value))[:50] if value else "\u2014")
            ly -= 26

    # ── Gather values ─────────────────────────────────────────────────────────
    def g(d: dict, *keys):
        for k in keys:
            v = d.get(k)
            if v is not None and str(v).strip():
                return str(v).strip()
        return ""

    ten_name  = f"{g(tenant, 'first_name')} {g(tenant, 'last_name')}".strip() or "\u2014"
    land_name = g(landlord, "full_name", "name") or "\u2014"
    unit_no   = g(unit, "unit_number")
    prop_addr = g(prop, "address")
    dwelling  = f"{prop_addr}, App. {unit_no}" if unit_no else prop_addr or "\u2014"
    start     = g(lease, "start_date") or "\u2014"
    end       = g(lease, "end_date") or "Ind\xe9termin\xe9"
    rent_raw  = float(lease.get("rent_amount") or 0)
    rent_str  = f"{rent_raw:,.2f}".replace(",", "\xa0").replace(".", ",") + " $/mois"
    due_day   = str(lease.get("payment_due_day") or 1)
    from datetime import date as _date
    tax_year  = str(_date.today().year)

    # ── Two-column cards layout ──────────────────────────────────────────────
    card_top   = H - header_h - 30   # 526 pt from bottom
    card_h     = 120
    col1_x     = 44
    col2_x     = 330
    card_w     = 238

    draw_card(col1_x, card_top - card_h, card_w, card_h, "Locataire",
              [("Nom complet", ten_name),
               ("Courriel", g(tenant, "email") or "\u2014"),
               ("T\xe9l\xe9phone", g(tenant, "phone") or "\u2014")])

    draw_card(col2_x, card_top - card_h, card_w, card_h, "Locateur",
              [("Nom complet", land_name),
               ("Courriel", g(landlord, "email") or "\u2014"),
               ("T\xe9l\xe9phone", g(landlord, "phone") or "\u2014")])

    # Full-width logement card
    card_h2 = 100
    y2 = card_top - card_h - 16 - card_h2
    draw_card(col1_x, y2, W - 88, card_h2, "Logement",
              [("Adresse", dwelling),
               ("Municipalit\xe9 / Ville", g(prop, "city") or "\u2014")])

    # Conditions card
    card_h3 = 110
    y3 = y2 - 16 - card_h3
    draw_card(col1_x, y3, W - 88, card_h3, "Conditions du bail",
              [("Date de d\xe9but", start),
               ("Date de fin", end),
               ("Loyer mensuel", rent_str),
               ("Paiement le", f"{due_day} de chaque mois")])

    # ── Footer ───────────────────────────────────────────────────────────────
    footer_y = 42
    c.setStrokeColor(GRAY_LIGHT)
    c.setLineWidth(0.5)
    c.line(44, footer_y + 12, W - 44, footer_y + 12)
    c.setFillColor(GRAY_MID)
    c.setFont("Helvetica", 7)
    c.drawString(44, footer_y, f"G\xe9n\xe9r\xe9 par Domely \u2014 domely.ca  \u00b7  Ann\xe9e fiscale {tax_year}  \u00b7  Ce document accompagne le formulaire officiel du TAL")
    c.setFillColor(INK_BLUE)
    c.setFont("Helvetica-Bold", 7)
    c.drawRightString(W - 44, footer_y, "Page de couverture \u2014 1")

    c.save()
    buf.seek(0)
    return buf.read()


def generate_quebec_bail_pdf(lease: dict, tenant: dict, unit: dict, prop: dict, landlord: dict) -> bytes:
    """
    Generate a Quebec Bail de logement PDF.
    Primary path: download the official TAL Form 5 from LégisQuébec and
    overlay the lease data onto it using reportlab + pypdf merge.
    Fallback: custom fpdf2 generator if the TAL form is unreachable.
    Prepends a Domely-branded colour cover page in all cases.
    """
    from pypdf import PdfReader, PdfWriter
    import io

    def _prepend_cover(main_pdf: bytes) -> bytes:
        cover_bytes = _make_bail_cover_page(lease, tenant, unit, prop, landlord)
        reader_cover = PdfReader(io.BytesIO(cover_bytes))
        reader_main  = PdfReader(io.BytesIO(main_pdf))
        writer = PdfWriter()
        writer.add_page(reader_cover.pages[0])
        for page in reader_main.pages:
            writer.add_page(page)
        out = io.BytesIO()
        writer.write(out)
        return out.getvalue()

    try:
        base_pdf = _fetch_tal_base_pdf()
        bail_pdf = _fill_tal_form(base_pdf, lease, tenant, unit, prop, landlord)
    except Exception as e:
        logger.warning("[PDF] Official TAL form unavailable (%s) — using fallback generator", e)
        bail_pdf = _generate_legacy_bail_pdf(lease, tenant, unit, prop, landlord)

    return _prepend_cover(bail_pdf)


def _generate_legacy_bail_pdf(lease: dict, tenant: dict, unit: dict, prop: dict, landlord: dict) -> bytes:
    """
    Generate a Quebec Bail de logement PDF faithfully reproducing the TAL mandatory form
    (Tribunal administratif du logement — sections A through I).
    Layout, colours, legal text and structure match the official form.
    Uses latin-1-safe characters for Helvetica compatibility.
    """
    from fpdf import FPDF

    # ── Dimensions & constants ────────────────────────────────────────────
    PW   = 216           # Letter width  mm (8.5 in)
    PH   = 279           # Letter height mm (11 in)
    LM   = 10
    RM   = 10
    TM   = 10
    W    = PW - LM - RM  # 196 mm usable
    HALF = W / 2
    THIRD = W / 3
    ROW  = 6.2           # standard data-row height
    HDR  = 5.8           # section-header height
    SHDR = 5.0           # sub-header height

    # Quebec government colour palette
    QBLUE  = (0,   51,  102)   # Navy blue  — section headers
    LBLUE  = (224, 233, 244)   # Light blue — sub-header / label bg
    VLIGHT = (247, 249, 251)   # Very light — field label bg
    WHITE  = (255, 255, 255)
    BLK    = (0,   0,   0)
    MID    = (90,  90,  90)
    LGRAY  = (180, 180, 180)
    RED    = (180, 0,   0)

    today_str = datetime.now().strftime("%d %B %Y")

    pdf = FPDF(orientation="P", unit="mm", format=(PW, PH))
    pdf.set_margins(LM, TM, RM)
    pdf.set_auto_page_break(auto=True, margin=12)
    pdf.set_draw_color(*LGRAY)
    pdf.set_line_width(0.25)
    pdf.add_page()

    # ── Latin-1 sanitizer (Helvetica only supports chars < 256) ─────────
    _REPL = str.maketrans({
        '\u2014': '-', '\u2013': '-', '\u2012': '-',
        '\u2018': "'", '\u2019': "'",
        '\u201c': '"', '\u201d': '"',
        '\u2026': '...',
    })
    def clean(t: str) -> str:
        t = t.translate(_REPL)
        return ''.join(c if ord(c) < 256 else '?' for c in t)

    # ── Font helpers ──────────────────────────────────────────────────────
    def sf(style: str = "", size: float = 8):
        pdf.set_font("Helvetica", style, size)

    def tc(*rgb):
        pdf.set_text_color(*rgb)

    def fc(*rgb):
        pdf.set_fill_color(*rgb)

    def dc(*rgb):
        pdf.set_draw_color(*rgb)

    # ── Core row helpers ──────────────────────────────────────────────────
    def section_header(letter: str, title_fr: str, title_en: str = ""):
        fc(*QBLUE); tc(*WHITE); sf("B", 8)
        label = clean(f"  {letter}.   {title_fr}" + (f"  /  {title_en}" if title_en else ""))
        pdf.cell(W, HDR, label, border=0, fill=True, new_x="LMARGIN", new_y="NEXT")
        fc(*WHITE); tc(*BLK); dc(*LGRAY)

    def sub_band(text_fr: str, text_en: str = ""):
        fc(*LBLUE); tc(*BLK); sf("BI", 7)
        label = clean(f"  {text_fr}" + (f"  /  {text_en}" if text_en else ""))
        pdf.cell(W, SHDR, label, border="1", fill=True, new_x="LMARGIN", new_y="NEXT")
        fc(*WHITE); sf("", 8)

    def lbl_cell(text: str, w: float, h: float = ROW, border: str = "LTB"):
        fc(*VLIGHT); sf("B", 7)
        pdf.cell(w, h, clean(f"  {text}"), border=border, fill=True)
        fc(*WHITE); sf("", 8)

    def val_cell(text: str, w: float, h: float = ROW, border: str = "RTB", newline: bool = False):
        nx = "LMARGIN" if newline else "RIGHT"
        ny = "NEXT"    if newline else "TOP"
        pdf.cell(w, h, clean(f"  {text}"), border=border, new_x=nx, new_y=ny)

    def field_row(lbl: str, val: str, lw: float = 60, total_w: float = W):
        lbl_cell(lbl, lw)
        val_cell(val, total_w - lw, newline=True)

    def two_col(lbl1: str, v1: str, lbl2: str, v2: str,
                lw1: float = 30, lw2: float = 30):
        hw = W / 2
        lbl_cell(lbl1, lw1)
        pdf.cell(hw - lw1, ROW, clean(f"  {v1}"), border="LTB")
        lbl_cell(lbl2, lw2, border="LTB")
        val_cell(v2, hw - lw2, newline=True)

    def three_col(lbl1: str, v1: str, lbl2: str, v2: str, lbl3: str, v3: str,
                  lw: float = 22):
        t = THIRD
        lbl_cell(lbl1, lw); pdf.cell(t - lw, ROW, clean(f"  {v1}"), border="LTB")
        lbl_cell(lbl2, lw, border="LTB"); pdf.cell(t - lw, ROW, clean(f"  {v2}"), border="LTB")
        lbl_cell(lbl3, lw, border="LTB")
        val_cell(v3, t - lw, newline=True)

    def chk(x: float, y: float, checked: bool = False, sz: float = 3.0):
        dc(*BLK)
        pdf.rect(x, y, sz, sz)
        if checked:
            pdf.line(x + 0.3, y + 0.3, x + sz - 0.3, y + sz - 0.3)
            pdf.line(x + sz - 0.3, y + 0.3, x + 0.3, y + sz - 0.3)
        dc(*LGRAY)

    def chk_label(label: str, checked: bool, x: float, y: float):
        chk(x, y + 1.5, checked)
        pdf.set_xy(x + 4.0, y)
        sf("", 7.5)
        tc(*BLK)
        pdf.cell(len(label) * 1.8 + 2, ROW, label)

    def blank_write_lines(n: int = 3, h: float = 7.0):
        for _ in range(n):
            sf("", 8)
            dc(*LGRAY)
            pdf.cell(W, h, "", border="B", new_x="LMARGIN", new_y="NEXT")

    def gap(mm: float = 1.5):
        pdf.ln(mm)

    # ── Data extraction ───────────────────────────────────────────────────
    def s(d: dict, *keys, default=""):
        for k in keys:
            v = d.get(k)
            if v is not None and str(v).strip():
                return clean(str(v).strip())
        return default

    landlord_name  = s(landlord, "full_name", "name")
    landlord_addr  = s(landlord, "address")
    landlord_city  = s(landlord, "city")
    landlord_prov  = s(landlord, "province", default="Quebec")
    landlord_postal= s(landlord, "postal_code")
    landlord_phone = s(landlord, "phone")
    landlord_email = s(landlord, "email")

    tenant_name    = f"{s(tenant,'first_name')} {s(tenant,'last_name')}".strip()
    tenant_addr    = s(tenant, "address")
    tenant_city    = s(tenant, "city")
    tenant_prov    = s(tenant, "province", default="Quebec")
    tenant_postal  = s(tenant, "postal_code")
    tenant_phone   = s(tenant, "phone")
    tenant_email   = s(tenant, "email")

    prop_addr      = s(prop, "address")
    prop_city      = s(prop, "city")
    prop_prov      = s(prop, "province", default="QC")
    prop_postal    = s(prop, "postal_code")
    unit_no        = s(unit, "unit_number")
    bedrooms       = s(unit, "bedrooms")
    bathrooms      = s(unit, "bathrooms")
    sq_ft          = s(unit, "square_feet")

    start_date     = s(lease, "start_date")
    end_date       = s(lease, "end_date")
    is_fixed       = bool(end_date)
    rent_amount    = float(lease.get("rent_amount") or 0)
    due_day        = int(lease.get("payment_due_day") or 1)
    deposit        = float(lease.get("security_deposit") or 0)
    notes          = (lease.get("notes") or "").strip()

    # formatted address for the unit
    unit_addr = prop_addr
    if unit_no:
        unit_addr = f"{prop_addr}, App. {unit_no}"

    # ══════════════════════════════════════════════════════════════════════
    # PAGE HEADER  —  mimics the government crown + title block
    # ══════════════════════════════════════════════════════════════════════

    # Blue top stripe
    fc(*QBLUE); dc(*QBLUE)
    pdf.rect(LM, TM, W, 8, style="F")

    # Crown area (left): Gouvernement du Quebec
    tc(*WHITE); sf("B", 6.5)
    pdf.set_xy(LM + 1, TM + 0.8)
    pdf.cell(50, 4, "Gouvernement du Quebec")
    pdf.set_xy(LM + 1, TM + 4.5)
    sf("", 6)
    pdf.cell(50, 3, "Tribunal administratif du logement")

    # Form number (right): obligatoire
    sf("B", 6)
    pdf.set_xy(LM + W - 54, TM + 1)
    pdf.cell(54, 3, "Formulaire obligatoire - Mandatory form", align="R")
    sf("", 5.5)
    pdf.set_xy(LM + W - 54, TM + 4.5)
    pdf.cell(54, 3, f"RLRQ, c. T-15.01, r. 3  |  Genere le {today_str}", align="R")

    pdf.set_xy(LM, TM + 9)
    fc(*WHITE); dc(*LGRAY); tc(*BLK)

    # Title
    gap(2)
    sf("B", 17)
    tc(*QBLUE)
    pdf.cell(W, 9, "BAIL D'UN LOGEMENT", align="C", new_x="LMARGIN", new_y="NEXT")
    tc(*BLK)
    sf("", 7)
    tc(*MID)
    pdf.cell(W, 4, "Bail residentiels au Quebec - Art. 1851 et suivants du Code civil du Quebec", align="C", new_x="LMARGIN", new_y="NEXT")
    tc(*BLK)
    gap(1)

    # Notice box
    fc(255, 245, 220); dc(200, 150, 0)
    pdf.set_line_width(0.5)
    pdf.rect(LM, pdf.get_y(), W, 8, style="FD")
    pdf.set_line_width(0.25); dc(*LGRAY)
    sf("B", 7); tc(120, 80, 0)
    pdf.set_xy(LM + 2, pdf.get_y() + 1)
    pdf.cell(W - 4, 3.5, "AVIS IMPORTANT / IMPORTANT NOTICE")
    pdf.set_xy(LM + 2, pdf.get_y() + 3.5)
    sf("", 6.5)
    pdf.cell(W - 4, 3.5,
        "Ce bail est obligatoire pour tout logement au Quebec. Remplir en double exemplaire - un exemplaire pour chaque partie.")
    pdf.set_xy(LM, pdf.get_y() + 4)
    fc(*WHITE); tc(*BLK)
    gap(2)

    # ══════════════════════════════════════════════════════════════════════
    # A — LOCATEUR  (BAILLEUR / PROPRIETAIRE)  /  LANDLORD
    # ══════════════════════════════════════════════════════════════════════
    section_header("A", "LOCATEUR (BAILLEUR / PROPRIETAIRE)", "LANDLORD (LESSOR)")
    field_row("Nom et prenom(s) ou raison sociale / Name or company :", landlord_name, lw=88)
    two_col("Adresse / Address :", landlord_addr, "Ville / City :", landlord_city, lw1=35, lw2=28)
    three_col("Province :", landlord_prov, "Code postal / Postal :", landlord_postal, "Pays / Country :", "Canada")
    two_col("Telephone / Phone :", landlord_phone, "Courriel / Email :", landlord_email, lw1=35, lw2=28)
    gap()

    # ══════════════════════════════════════════════════════════════════════
    # B — LOCATAIRE(S)  /  TENANT(S)
    # ══════════════════════════════════════════════════════════════════════
    section_header("B", "LOCATAIRE(S)", "TENANT(S)")
    field_row("Nom et prenom(s) / Name(s) :", tenant_name, lw=70)
    two_col("Adresse actuelle / Current address :", tenant_addr, "Ville / City :", tenant_city, lw1=55, lw2=28)
    three_col("Province :", tenant_prov, "Code postal / Postal :", tenant_postal, "Telephone / Phone :", tenant_phone)
    field_row("Courriel / Email :", tenant_email, lw=45)
    gap()

    # ══════════════════════════════════════════════════════════════════════
    # C — LOGEMENT LOUE  /  DWELLING RENTED
    # ══════════════════════════════════════════════════════════════════════
    section_header("C", "LOGEMENT LOUE", "DWELLING RENTED")

    field_row("Adresse du logement / Address of dwelling :", unit_addr, lw=75)
    three_col("Ville / City :", prop_city, "Province :", prop_prov, "Code postal / Postal :", prop_postal)

    # Type + furnished
    y0 = pdf.get_y()
    lbl_cell("Type de logement / Type of dwelling :", 70)
    pdf.cell(W - 70, ROW, "", border="RTB", new_x="LMARGIN", new_y="NEXT")
    chk_label("Chambre / Room",         False,  LM + 72,       y0)
    chk_label("Appartement / Apt",      True,   LM + 108,      y0)
    chk_label("Maison / House",         False,  LM + 148,      y0)

    y0 = pdf.get_y()
    lbl_cell("Logement meuble / Furnished :", 55)
    pdf.cell(W - 55, ROW, "", border="RTB", new_x="LMARGIN", new_y="NEXT")
    chk_label("Oui / Yes", False, LM + 57, y0)
    chk_label("Non / No",  True,  LM + 85, y0)

    # Rooms
    rooms_val = ""
    if bedrooms:
        rooms_val += f"{bedrooms} chambre(s)"
    if bathrooms:
        rooms_val += f"  |  {bathrooms} salle(s) de bain"
    if sq_ft:
        rooms_val += f"  |  {sq_ft} pi2"
    two_col("Nb de pieces / Rooms :", bedrooms, "Description :", rooms_val, lw1=38, lw2=28)

    # Parking
    y0 = pdf.get_y()
    hw = W / 2
    lbl_cell("Stationnement / Parking :", 45); pdf.cell(hw - 45, ROW, "", border="LTB")
    lbl_cell("Rangement / Storage :", 40, border="LTB"); pdf.cell(hw - 40, ROW, "", border="RTB", new_x="LMARGIN", new_y="NEXT")
    chk_label("Inclus / Included",     False, LM + 47,      y0)
    chk_label("Non inclus / Excluded", False, LM + 83,      y0)
    chk_label("Inclus / Included",     False, LM + hw + 42, y0)
    chk_label("Non inclus / Excluded", False, LM + hw + 74, y0)
    gap()

    # ══════════════════════════════════════════════════════════════════════
    # D — DUREE DU BAIL  /  TERM OF LEASE
    # ══════════════════════════════════════════════════════════════════════
    section_header("D", "DUREE DU BAIL", "TERM OF LEASE")

    y0 = pdf.get_y()
    lbl_cell("Type de bail / Type of lease :", 50)
    pdf.cell(W - 50, ROW, "", border="RTB", new_x="LMARGIN", new_y="NEXT")
    chk_label("A duree fixe / Fixed term",          is_fixed,      LM + 52, y0)
    chk_label("A duree indeterminee / Month-to-month", not is_fixed, LM + 120, y0)

    two_col("Du / From :", start_date,
            "Au / To :", end_date if is_fixed else "Duree indeterminee / Indefinite",
            lw1=22, lw2=18)

    # Notice to quit
    sf("I", 6.5); tc(*MID)
    pdf.multi_cell(W, 4,
        "  Avis de non-renouvellement : 3 mois avant l'echeance pour un bail a duree fixe d'un an ou plus (art. 1946 C.c.Q.)  /  "
        "Notice of non-renewal: 3 months before expiry for a fixed-term lease of 1 year or more.", border="LRB")
    tc(*BLK)
    gap()

    # ══════════════════════════════════════════════════════════════════════
    # E — LOYER  /  RENT
    # ══════════════════════════════════════════════════════════════════════
    section_header("E", "LOYER", "RENT")

    two_col("Loyer mensuel / Monthly rent :",
            f"${rent_amount:,.2f}",
            "Payable le / Due on :",
            f"Le {due_day} de chaque mois / The {due_day}th of each month",
            lw1=52, lw2=36)

    two_col("Depot de garantie / Security deposit :",
            f"${deposit:,.2f}" if deposit else "Aucun / None",
            "Mode de paiement / Payment method :", "",
            lw1=60, lw2=52)

    # Services
    sub_band("Services et conditions inclus dans le loyer (cochez ce qui s'applique)",
             "Services included in rent (check all that apply)")

    services = [
        ("Eau chaude / Hot water",       False),
        ("Chauffage / Heating",          False),
        ("Electricite / Electricity",    False),
        ("Air climatise / A/C",          False),
        ("Stationnement int. / Indoor parking", False),
        ("Stationnement ext. / Outdoor parking",False),
        ("Rangement / Storage",          False),
        ("Cablodistribution / Cable TV", False),
        ("Internet",                     False),
        ("Eau / Water",                  False),
        ("Eclairage / Lighting",         False),
        ("Autre / Other",                False),
    ]
    col_w = W / 3
    rows_svc = [services[i:i+3] for i in range(0, len(services), 3)]
    for row_items in rows_svc:
        y0 = pdf.get_y()
        sf("", 7.5)
        for ci, (lbl, chkd) in enumerate(row_items):
            x0 = LM + ci * col_w
            brd = "LRB"
            pdf.set_xy(x0, y0)
            fc(*WHITE)
            pdf.cell(col_w, ROW, "", border=brd, fill=True)
            chk_label(lbl, chkd, x0 + 2, y0)
        pdf.set_xy(LM, y0 + ROW)

    field_row("Autre condition / Other condition :", "", lw=60)
    gap()

    # ══════════════════════════════════════════════════════════════════════
    # F — TRAVAUX  /  WORK TO BE DONE
    # ══════════════════════════════════════════════════════════════════════
    section_header("F", "TRAVAUX A EFFECTUER AVANT L'ENTREE DANS LES LIEUX",
                   "WORK TO BE DONE BEFORE OCCUPANCY")
    sf("I", 6.5); tc(*MID)
    pdf.cell(W, 4,
        "  Le locateur s'engage a effectuer les travaux suivants avant la prise de possession / "
        "Landlord undertakes to complete the following before occupancy :", new_x="LMARGIN", new_y="NEXT")
    tc(*BLK)
    blank_write_lines(2, h=7.5)
    gap()

    # ══════════════════════════════════════════════════════════════════════
    # G — AVIS : IMMEUBLE NOUVEAU  /  NEW BUILDING NOTICE
    # ══════════════════════════════════════════════════════════════════════
    section_header("G", "AVIS : IMMEUBLE NOUVEAU OU CHANGEMENT D'AFFECTATION",
                   "NOTICE: NEW BUILDING OR CHANGE OF USE")

    y0 = pdf.get_y()
    lbl_cell("Applicable :", 28)
    pdf.cell(W - 28, ROW, "", border="RTB", new_x="LMARGIN", new_y="NEXT")
    chk_label("Oui / Yes", False, LM + 30, y0)
    chk_label("Non / No",  False, LM + 58, y0)

    sf("I", 6.5); tc(*MID)
    pdf.multi_cell(W, 4,
        "  Si applicable : le logement est situe dans un immeuble nouvellement bati ou dont l'affectation "
        "a ete changee. Le loyer n'est pas fixe par le tribunal pour la 1re periode de location (art. 1955 C.c.Q.).", border=0)
    tc(*BLK)
    gap()

    # ══════════════════════════════════════════════════════════════════════
    # H — LOYER ANTERIEUR  /  PREVIOUS RENT
    # ══════════════════════════════════════════════════════════════════════
    section_header("H", "LOYER DU LOGEMENT AU COURS DES 12 MOIS PRECEDANT LE BAIL",
                   "RENT CHARGED IN THE 12 MONTHS PRECEDING THIS LEASE")
    sf("I", 6.5); tc(*MID)
    pdf.cell(W, 4,
        "  Obligation du locateur de declarer le dernier loyer mensuel paye - art. 1896 C.c.Q.  /  "
        "Landlord must disclose the last rent paid - art. 1896 C.c.Q.", new_x="LMARGIN", new_y="NEXT")
    tc(*BLK)
    two_col("Dernier loyer mensuel / Last monthly rent :", "$",
            "Date de fin de ce loyer / End date of that rent :", "",
            lw1=70, lw2=70)
    gap()

    # ══════════════════════════════════════════════════════════════════════
    # I — CLAUSES PARTICULIERES  /  SPECIAL CONDITIONS
    # ══════════════════════════════════════════════════════════════════════
    section_header("I", "CLAUSES PARTICULIERES", "SPECIAL CONDITIONS")
    sf("I", 6.5); tc(*MID)
    pdf.cell(W, 4,
        "  Toute clause contraire aux droits du locataire ou a la loi est nulle de plein droit (art. 1893 C.c.Q.).",
        new_x="LMARGIN", new_y="NEXT")
    tc(*BLK)
    if notes:
        sf("", 8)
        pdf.multi_cell(W, ROW, clean(f"  {notes}"), border="1")
    else:
        blank_write_lines(5, h=7.0)
    gap(2)

    # ══════════════════════════════════════════════════════════════════════
    # SIGNATURES
    # ══════════════════════════════════════════════════════════════════════
    fc(*QBLUE); tc(*WHITE); sf("B", 7.5)
    pdf.cell(W, 5.5, "  SIGNATURES DES PARTIES  /  SIGNATURES OF THE PARTIES",
             fill=True, new_x="LMARGIN", new_y="NEXT")
    fc(*WHITE); tc(*BLK)
    gap(2)

    sig_col = HALF - 6

    def sig_block(name: str, role_fr: str, role_en: str, x: float, y: float):
        pdf.set_xy(x, y)
        sf("B", 7.5)
        pdf.cell(sig_col, 4.5, f"{role_fr} / {role_en}")
        pdf.set_xy(x, y + 5.5)
        sf("", 7)
        tc(*MID)
        pdf.cell(sig_col, 3.5, "Signature :")
        tc(*BLK)
        # Signature box
        dc(*LGRAY)
        pdf.set_line_width(0.4)
        pdf.rect(x, y + 9.5, sig_col, 12)
        pdf.set_line_width(0.25)
        # Nom imprime
        pdf.set_xy(x, y + 22.5)
        sf("", 6.5); tc(*MID)
        pdf.cell(sig_col, 3.5, f"Nom imprime / Printed name :  {name}")
        # Date
        pdf.set_xy(x, y + 26.5)
        pdf.cell(sig_col, 3.5, "Date (JJ/MM/AAAA) :")
        dc(*LGRAY)
        pdf.line(x + 38, y + 30, x + sig_col, y + 30)
        tc(*BLK)

    y_sig = pdf.get_y()
    sig_block(landlord_name, "LOCATEUR / BAILLEUR", "LANDLORD / LESSOR",   LM,              y_sig)
    sig_block(tenant_name,   "LOCATAIRE",           "TENANT",              LM + HALF + 6,   y_sig)

    pdf.set_y(y_sig + 36)
    gap(2)

    # ── Second tenant signature line ──────────────────────────────────────
    sf("", 7); tc(*MID)
    pdf.cell(W, 4,
        "  Locataire supplementaire / Additional tenant (si applicable / if applicable) :", new_x="LMARGIN", new_y="NEXT")
    blank_write_lines(1, h=10)
    tc(*BLK)
    gap(1)

    # ── Pied de page ─────────────────────────────────────────────────────
    pdf.set_auto_page_break(auto=False)   # prevent footer from spilling to a new page
    pdf.set_y(PH - TM - 8)
    dc(*LGRAY); pdf.set_line_width(0.4)
    pdf.line(LM, pdf.get_y(), LM + W, pdf.get_y())
    pdf.set_line_width(0.25)
    pdf.ln(1.5)
    sf("I", 6); tc(*MID)
    pdf.cell(W * 0.55, 4,
        "Bail genere par Domely (domely.app) - Pour usage informatif.")
    pdf.cell(W * 0.45, 4,
        "Formulaire conforme au TAL - tal.gouv.qc.ca", align="R",
        new_x="LMARGIN", new_y="NEXT")
    tc(*BLK)
    pdf.set_auto_page_break(auto=True, margin=12)

    return bytes(pdf.output())


# ===========================
# LEASE ROUTES
# ===========================

@api_router.post("/leases", response_model=Lease)
async def create_lease(data: LeaseCreate, current_user: dict = Depends(get_current_user)):
    # Verify tenant belongs to user
    tenant = await db.tenants.find_one({"id": data.tenant_id, "user_id": current_user["id"]})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    # Deactivate any existing leases for this unit
    await db.leases.update_many(
        {"unit_id": data.unit_id, "is_active": True},
        {"$set": {"is_active": False}}
    )
    
    lease = Lease(user_id=current_user["id"], **data.model_dump())
    await db.leases.insert_one(lease.model_dump())
    
    # Update tenant's unit
    await db.tenants.update_one({"id": data.tenant_id}, {"$set": {"unit_id": data.unit_id}})
    
    # Update unit
    await db.units.update_one(
        {"id": data.unit_id},
        {"$set": {
            "is_occupied": True,
            "current_tenant_id": data.tenant_id,
            "rent_amount": data.rent_amount
        }}
    )

    # ── Auto-generate and email bail PDF ─────────────────────────────────────
    if RESEND_API_KEY:
        try:
            unit_doc = await db.units.find_one({"id": data.unit_id})
            prop_doc = await db.properties.find_one({"id": unit_doc["property_id"]}) if unit_doc else None
            if tenant and unit_doc and prop_doc:
                pdf_bytes = generate_quebec_bail_pdf(
                    lease=lease.model_dump(),
                    tenant=tenant,
                    unit=unit_doc,
                    prop=prop_doc,
                    landlord=current_user,
                )
                pdf_b64 = base64.b64encode(pdf_bytes).decode("utf-8")
                landlord_email = current_user.get("email", "")
                tenant_email   = tenant.get("email", "")
                recipients = [r for r in [landlord_email, tenant_email] if r]
                if recipients:
                    import httpx as _httpx
                    async with _httpx.AsyncClient() as _hc:
                        await _hc.post(
                            "https://api.resend.com/emails",
                            headers={"Authorization": f"Bearer {RESEND_API_KEY}", "Content-Type": "application/json"},
                            json={
                                "from": "Domely <noreply@domely.ca>",
                                "to": recipients,
                                "subject": "Domely — Votre bail de logement",
                                "html": f"""
                                <h2 style="color:#1E7A6E">Bail de logement généré</h2>
                                <p>Votre bail a été créé dans Domely. Vous trouverez le document en pièce jointe.</p>
                                <p style="color:#999;font-size:12px">Gérez votre bail dans l'application Domely · <a href="https://domely.app">domely.app</a></p>
                                """,
                                "attachments": [{"filename": f"bail-{lease.id[:8]}.pdf", "content": pdf_b64}],
                            },
                            timeout=15,
                        )
                    logger.info("[Lease] Bail PDF emailed to %s", recipients)
        except Exception as e:
            logger.warning("[Lease] Bail PDF email failed: %s", e)

    # First-lease milestone email (landlord only)
    lease_count = await db.leases.count_documents({"user_id": current_user["id"]})
    if lease_count == 1:
        import asyncio
        prop_doc = await db.properties.find_one({"id": lease.property_id}) if lease.property_id else None
        prop_name = prop_doc.get("name", "votre propriété") if prop_doc else "votre propriété"
        asyncio.create_task(_on_first_lease(current_user, prop_name))

    return lease

@api_router.get("/leases", response_model=List[LeaseWithDetails])
async def get_leases(active_only: bool = True, current_user: dict = Depends(get_current_user)):
    query = {"user_id": current_user["id"]}
    if active_only:
        query["is_active"] = True
    
    leases = await db.leases.find(query).to_list(100)
    result = []
    
    today = datetime.now().date()
    
    for lease in leases:
        tenant_name = None
        unit_number = None
        property_name = None
        
        tenant = await db.tenants.find_one({"id": lease["tenant_id"]})
        if tenant:
            tenant_name = f"{tenant.get('first_name', '')} {tenant.get('last_name', '')}"
        
        unit = await db.units.find_one({"id": lease["unit_id"]})
        if unit:
            unit_number = unit.get("unit_number")
            prop = await db.properties.find_one({"id": unit.get("property_id")})
            if prop:
                property_name = prop.get("name")
        
        end_date = datetime.strptime(lease["end_date"], "%Y-%m-%d").date()
        days_until_expiry = (end_date - today).days
        
        result.append(LeaseWithDetails(
            **lease,
            tenant_name=tenant_name,
            unit_number=unit_number,
            property_name=property_name,
            days_until_expiry=days_until_expiry
        ))
    
    return result

@api_router.get("/leases/{lease_id}", response_model=LeaseWithDetails)
async def get_lease(lease_id: str, current_user: dict = Depends(get_current_user)):
    lease = await db.leases.find_one({"id": lease_id, "user_id": current_user["id"]})
    if not lease:
        raise HTTPException(status_code=404, detail="Lease not found")
    
    tenant_name = None
    unit_number = None
    property_name = None
    
    tenant = await db.tenants.find_one({"id": lease["tenant_id"]})
    if tenant:
        tenant_name = f"{tenant.get('first_name', '')} {tenant.get('last_name', '')}"
    
    unit = await db.units.find_one({"id": lease["unit_id"]})
    if unit:
        unit_number = unit.get("unit_number")
        prop = await db.properties.find_one({"id": unit.get("property_id")})
        if prop:
            property_name = prop.get("name")
    
    today = datetime.now().date()
    end_date = datetime.strptime(lease["end_date"], "%Y-%m-%d").date()
    days_until_expiry = (end_date - today).days
    
    return LeaseWithDetails(
        **lease,
        tenant_name=tenant_name,
        unit_number=unit_number,
        property_name=property_name,
        days_until_expiry=days_until_expiry
    )

@api_router.put("/leases/{lease_id}", response_model=Lease)
async def update_lease(lease_id: str, data: LeaseCreate, current_user: dict = Depends(get_current_user)):
    lease = await db.leases.find_one({"id": lease_id, "user_id": current_user["id"]})
    if not lease:
        raise HTTPException(status_code=404, detail="Lease not found")
    
    await db.leases.update_one({"id": lease_id}, {"$set": data.model_dump()})
    updated = await db.leases.find_one({"id": lease_id})
    return Lease(**updated)

@api_router.delete("/leases/{lease_id}")
async def delete_lease(lease_id: str, current_user: dict = Depends(get_current_user)):
    lease = await db.leases.find_one({"id": lease_id, "user_id": current_user["id"]})
    if not lease:
        raise HTTPException(status_code=404, detail="Lease not found")

    await db.leases.delete_one({"id": lease_id})
    return {"message": "Lease deleted"}

@api_router.get("/leases/{lease_id}/generate-bail")
async def generate_bail_endpoint(lease_id: str, current_user: dict = Depends(get_current_user)):
    """Generate and stream the official Quebec Bail de logement PDF for a lease."""
    from fastapi.responses import StreamingResponse

    lease = await db.leases.find_one({"id": lease_id, "user_id": current_user["id"]})
    if not lease:
        raise HTTPException(status_code=404, detail="Lease not found")

    tenant = await db.tenants.find_one({"id": lease.get("tenant_id")}) if lease.get("tenant_id") else None
    unit   = await db.units.find_one({"id": lease.get("unit_id")}) if lease.get("unit_id") else None
    prop   = await db.properties.find_one({"id": unit["property_id"]}) if unit and unit.get("property_id") else None

    # Fall back to property_id on the lease if unit lookup didn't resolve a property
    if not prop and lease.get("property_id"):
        prop = await db.properties.find_one({"id": lease["property_id"]})

    # Build synthetic stubs so the PDF always generates even with missing relations
    if tenant is None:
        tenant = {"first_name": lease.get("tenant_name", ""), "last_name": "", "email": "", "phone": ""}
    if unit is None:
        unit = {
            "unit_number": lease.get("unit_number", ""),
            "bedrooms": "",
            "bathrooms": "",
            "property_id": lease.get("property_id", ""),
        }
    if prop is None:
        prop = {
            "address": lease.get("property_address", ""),
            "city": lease.get("property_city", ""),
            "province": "QC",
            "postal_code": "",
            "name": lease.get("property_name", ""),
        }

    try:
        pdf_bytes = generate_quebec_bail_pdf(
            lease=lease,
            tenant=tenant,
            unit=unit,
            prop=prop,
            landlord=current_user,
        )
        # If signatures exist, append the certificate page
        sigs = await db.signatures.find({"lease_id": lease_id}).to_list(10)
        for s in sigs:
            s.pop("_id", None)
        if sigs:
            pdf_bytes = _append_signature_page(pdf_bytes, sigs)
    except Exception as e:
        logger.error("[Bail PDF] Generation failed: %s", e)
        raise HTTPException(status_code=500, detail="Erreur lors de la génération du PDF.")

    filename = f"bail-{lease_id[:8]}.pdf"
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

# ===========================
# RL-31 TAX SLIP GENERATOR
# ===========================

def _generate_rl31_pdf(lease: dict, tenant: dict, prop: dict, landlord: dict, tax_year: int) -> bytes:
    """
    Generate a Quebec RL-31 (Relevé 31 — Renseignements sur l'occupation d'un logement)
    tax slip PDF.  Two slip copies on one Letter page: Copy 1 for the tenant (original),
    Copy 2 for Revenu Québec (or landlord records).
    Based on Revenu Québec RL-31 form structure.
    """
    from reportlab.pdfgen import canvas as rl_canvas
    from reportlab.lib.colors import HexColor
    import io

    W, H = 612.0, 792.0
    buf  = io.BytesIO()
    c    = rl_canvas.Canvas(buf, pagesize=(W, H))

    # ── Colours ───────────────────────────────────────────────────────────────
    RQ_BLUE    = HexColor("#003DA5")   # Revenu Québec blue
    RQ_LBLUE   = HexColor("#D6E4FF")   # Light blue — box fills
    TEAL_DARK  = HexColor("#1E7A6E")   # Domely accent
    GRAY_LIGHT = HexColor("#E5E7EB")
    GRAY_MID   = HexColor("#6B7280")
    GRAY_DARK  = HexColor("#1F2937")
    WHITE      = HexColor("#FFFFFF")
    RED        = HexColor("#DC2626")

    # ── Helpers ───────────────────────────────────────────────────────────────
    def safe(text) -> str:
        return _rl_safe(str(text).strip()) if text and str(text).strip() else ""

    def g(d: dict, *keys) -> str:
        for k in keys:
            v = d.get(k)
            if v is not None and str(v).strip():
                return str(v).strip()
        return ""

    # ── Computed values ────────────────────────────────────────────────────────
    ten_name    = f"{g(tenant, 'first_name')} {g(tenant, 'last_name')}".strip()
    ten_addr    = g(tenant, "address") or g(prop, "address")
    ten_city    = g(tenant, "city") or g(prop, "city")
    ten_postal  = g(tenant, "postal_code") or g(prop, "postal_code")
    ten_full_addr = f"{ten_addr}, {ten_city}  {ten_postal}".strip(", ")

    land_name   = g(landlord, "full_name", "name")
    land_addr   = g(landlord, "address")
    land_city   = g(landlord, "city")
    land_postal = g(landlord, "postal_code")
    land_full_addr = f"{land_addr}, {land_city}  {land_postal}".strip(", ")

    prop_addr   = g(prop, "address")
    unit_no     = g(lease, "unit_number")
    logement    = f"{prop_addr}, App. {unit_no}" if unit_no else prop_addr

    # Gross rent = monthly_rent * 12 (full year; real-world: adjust for partial years)
    monthly_rent = float(lease.get("rent_amount") or 0)
    gross_rent   = monthly_rent * 12
    rent_str     = f"{gross_rent:,.2f}".replace(",", "\xa0").replace(".", ",")

    # ── Draw ONE slip (called twice: top half and bottom half) ─────────────────
    def draw_slip(y_top: float, copy_label: str):
        """
        Draw a complete RL-31 slip with its top-left corner at y_top (bottom of rect = y_top - slip_h).
        """
        slip_h = 370
        slip_w = W - 60
        x0 = 30
        y0 = y_top - slip_h

        # Outer border
        c.setStrokeColor(RQ_BLUE)
        c.setLineWidth(1.2)
        c.roundRect(x0, y0, slip_w, slip_h, 4, fill=0, stroke=1)

        # ── Header bar ──────────────────────────────────────────────────────
        hdr_h = 46
        c.setFillColor(RQ_BLUE)
        c.roundRect(x0, y_top - hdr_h, slip_w, hdr_h, 4, fill=1, stroke=0)
        # Clip top-left round corners (fill lower rectangle to square them)
        c.rect(x0, y_top - hdr_h, slip_w, hdr_h / 2, fill=1, stroke=0)

        c.setFillColor(WHITE)
        c.setFont("Helvetica-Bold", 15)
        c.drawString(x0 + 12, y_top - 28, "Relevé 31")
        c.setFont("Helvetica", 9)
        c.drawString(x0 + 12, y_top - 40, "Renseignements sur l'occupation d'un logement")

        # Tax year pill
        c.setFillColor(HexColor("#FFD700"))
        c.roundRect(x0 + slip_w - 80, y_top - 38, 68, 22, 3, fill=1, stroke=0)
        c.setFillColor(RQ_BLUE)
        c.setFont("Helvetica-Bold", 11)
        c.drawCentredString(x0 + slip_w - 46, y_top - 29, str(tax_year))

        # Copy label
        c.setFillColor(HexColor("#A5B4FC"))
        c.setFont("Helvetica-Bold", 7)
        c.drawString(x0 + slip_w - 80, y_top - 50, copy_label)

        # ── Info rows ────────────────────────────────────────────────────────
        def info_row(y: float, label: str, value: str, label_w: float = 130):
            c.setFillColor(RQ_LBLUE)
            c.rect(x0 + 8, y - 14, label_w, 14, fill=1, stroke=0)
            c.setFillColor(GRAY_DARK)
            c.setFont("Helvetica-Bold", 7)
            c.drawString(x0 + 11, y - 10, label.upper())
            c.setFillColor(GRAY_DARK)
            c.setFont("Helvetica", 9)
            c.drawString(x0 + 11 + label_w + 4, y - 10, safe(value)[:70])
            c.setStrokeColor(GRAY_LIGHT)
            c.setLineWidth(0.3)
            c.line(x0 + 8, y - 14, x0 + slip_w - 8, y - 14)

        row_h = 20
        row_y = y_top - hdr_h - 8
        info_row(row_y,           "Locataire",            ten_name)
        info_row(row_y - row_h,   "Adresse du locataire", ten_full_addr)
        info_row(row_y - row_h*2, "Adresse du logement",  logement)
        info_row(row_y - row_h*3, "Locateur / Bailleur",  land_name)
        info_row(row_y - row_h*4, "Adresse du locateur",  land_full_addr)

        # ── Boxes ────────────────────────────────────────────────────────────
        boxes_y = y_top - hdr_h - row_h * 5 - 20

        def draw_box(bx: float, by: float, bw: float, bh: float,
                     code: str, title_fr: str, value: str, highlight: bool = False):
            fill_col = HexColor("#EFF6FF") if highlight else WHITE
            c.setFillColor(fill_col)
            c.setStrokeColor(RQ_BLUE if highlight else GRAY_LIGHT)
            c.setLineWidth(0.8 if highlight else 0.4)
            c.rect(bx, by, bw, bh, fill=1, stroke=1)
            # Code label (top-left)
            c.setFillColor(RQ_BLUE)
            c.setFont("Helvetica-Bold", 8)
            c.drawString(bx + 4, by + bh - 10, code)
            # Title (top-right)
            c.setFillColor(GRAY_MID)
            c.setFont("Helvetica", 7)
            c.drawString(bx + 20, by + bh - 10, title_fr)
            # Value
            c.setFillColor(GRAY_DARK)
            c.setFont("Helvetica-Bold", 13 if highlight else 11)
            c.drawString(bx + 4, by + 6, safe(value)[:25] if value else "\u2014")

        box_h  = 44
        box_w1 = 120
        box_w2 = 90
        gutter = 10
        bx0    = x0 + 8

        draw_box(bx0,                            boxes_y, box_w1, box_h, "A",
                 "Loyer brut (ann\xe9e)", f"{rent_str} $", highlight=True)
        draw_box(bx0 + box_w1 + gutter,          boxes_y, box_w2, box_h, "B",
                 "Aide directe", "\u2014")
        draw_box(bx0 + box_w1 + gutter + box_w2 + gutter, boxes_y, box_w2, box_h, "J",
                 "Code indice", "1")

        # ── Legal footer line ─────────────────────────────────────────────────
        footer_y_slip = y0 + 12
        c.setStrokeColor(GRAY_LIGHT)
        c.setLineWidth(0.3)
        c.line(x0 + 8, footer_y_slip + 10, x0 + slip_w - 8, footer_y_slip + 10)
        c.setFillColor(GRAY_MID)
        c.setFont("Helvetica", 6.5)
        c.drawString(x0 + 8, footer_y_slip, "Formulaire prescrit par Revenu Qu\xe9bec (RL-31)  \u2014  G\xe9n\xe9r\xe9 par Domely  \u2014  domely.ca")
        c.setFillColor(TEAL_DARK)
        c.setFont("Helvetica-Bold", 6.5)
        c.drawRightString(x0 + slip_w - 8, footer_y_slip, f"Ann\xe9e d'imposition : {tax_year}")

    # ── Draw both copies ──────────────────────────────────────────────────────
    draw_slip(H - 20,            "Copie 1 \u2014 Locataire (exemplaire original)")
    # Dashed separator
    mid_y = H / 2
    c.setStrokeColor(GRAY_MID)
    c.setLineWidth(0.5)
    c.setDash([4, 4])
    c.line(30, mid_y, W - 30, mid_y)
    c.setDash([])
    c.setFillColor(GRAY_MID)
    c.setFont("Helvetica", 7)
    c.drawCentredString(W / 2, mid_y + 4, "\u2702  Découpez ici — Cut here")

    draw_slip(mid_y - 8,         "Copie 2 \u2014 Revenu Québec / Locateur")

    c.save()
    buf.seek(0)
    return buf.read()


@api_router.get("/leases/{lease_id}/generate-rl31")
async def generate_rl31_endpoint(
    lease_id: str,
    year: int | None = None,
    current_user: dict = Depends(get_current_user),
):
    """Generate and stream the Quebec RL-31 tax slip PDF for a lease."""
    from fastapi.responses import StreamingResponse
    from datetime import date as _date

    lease = await db.leases.find_one({"id": lease_id, "user_id": current_user["id"]})
    if not lease:
        raise HTTPException(status_code=404, detail="Lease not found")

    tenant = await db.tenants.find_one({"id": lease.get("tenant_id")}) if lease.get("tenant_id") else None
    unit   = await db.units.find_one({"id": lease.get("unit_id")}) if lease.get("unit_id") else None
    prop   = await db.properties.find_one({"id": unit["property_id"]}) if unit and unit.get("property_id") else None

    if not prop and lease.get("property_id"):
        prop = await db.properties.find_one({"id": lease["property_id"]})

    if tenant is None:
        tenant = {"first_name": lease.get("tenant_name", ""), "last_name": "", "email": "", "phone": ""}
    if prop is None:
        prop = {
            "address": lease.get("property_address", ""),
            "city": lease.get("property_city", ""),
            "postal_code": "",
        }

    tax_year = year or (_date.today().year - 1)  # default: prior year (fiscal year just ended)

    try:
        pdf_bytes = _generate_rl31_pdf(
            lease=lease,
            tenant=tenant,
            prop=prop,
            landlord=current_user,
            tax_year=tax_year,
        )
    except Exception as e:
        logger.error("[RL-31 PDF] Generation failed: %s", e)
        raise HTTPException(status_code=500, detail="Erreur lors de la génération du RL-31.")

    filename = f"RL-31_{tax_year}_{lease_id[:8]}.pdf"
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ===========================
# RENT PAYMENT ROUTES
# ===========================

@api_router.post("/rent-payments", response_model=RentPayment)
async def create_rent_payment(data: RentPaymentCreate, current_user: dict = Depends(get_current_user)):
    # Verify tenant belongs to user
    tenant = await db.tenants.find_one({"id": data.tenant_id, "user_id": current_user["id"]})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    payment = RentPayment(user_id=current_user["id"], **data.model_dump())
    await db.rent_payments.insert_one(payment.model_dump())
    return payment

@api_router.get("/rent-payments", response_model=List[RentPayment])
async def get_rent_payments(
    month_year: Optional[str] = None,
    tenant_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {"user_id": current_user["id"]}
    if month_year:
        query["month_year"] = month_year
    if tenant_id:
        query["tenant_id"] = tenant_id
    
    payments = await db.rent_payments.find(query).sort("payment_date", -1).to_list(100)
    return [RentPayment(**p) for p in payments]

@api_router.get("/rent-payments/{payment_id}", response_model=RentPayment)
async def get_rent_payment(payment_id: str, current_user: dict = Depends(get_current_user)):
    payment = await db.rent_payments.find_one({"id": payment_id, "user_id": current_user["id"]})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    return RentPayment(**payment)

@api_router.put("/rent-payments/{payment_id}")
async def update_rent_payment(payment_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    payment = await db.rent_payments.find_one({"id": payment_id, "user_id": current_user["id"]})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    # Only allow updating safe fields
    allowed = {"amount", "payment_date", "payment_method", "month_year", "status", "notes",
               "lease_id", "tenant_id", "unit_id", "due_date"}
    update = {k: v for k, v in data.items() if k in allowed}
    if not update:
        raise HTTPException(status_code=400, detail="No valid fields to update")

    prev_status = payment.get("status", "")
    await db.rent_payments.update_one({"id": payment_id}, {"$set": update})
    updated = await db.rent_payments.find_one({"id": payment_id})

    # ── Notify tenant when landlord confirms a pending payment ─────────────
    new_status = update.get("status", prev_status)
    if prev_status == "pending_confirmation" and new_status == "paid":
        asyncio.create_task(_notify_tenant_payment_confirmed(updated))

    return updated


async def _notify_tenant_payment_confirmed(payment: dict):
    """Email the tenant when their manually declared rent payment is confirmed by the landlord."""
    tenant_id = payment.get("tenant_id")
    if not tenant_id:
        return
    tenant = await db.tenants.find_one({"id": tenant_id})
    if not tenant or not tenant.get("email"):
        return

    tenant_email = tenant["email"]
    tenant_first = (tenant.get("first_name") or "").split()[0] or "là"
    amount = float(payment.get("amount") or 0)
    amount_str = f"{amount:,.2f}".replace(",", " ")
    month_year = payment.get("month_year", "")
    try:
        from datetime import datetime as _dt
        month_display = _dt.strptime(month_year, "%Y-%m").strftime("%B %Y")
    except Exception:
        month_display = month_year

    html = f"""<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 16px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 8px rgba(0,0,0,0.06);">
        <tr><td style="background:linear-gradient(135deg,#1E7A6E,#3FAF86);padding:28px 36px;">
          <div style="font-size:22px;font-weight:800;color:#fff;">Domely</div>
        </td></tr>
        <tr><td style="padding:36px;">
          <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111827;">
            ✅ Paiement confirmé, {tenant_first} !
          </h2>
          <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">
            Votre propriétaire a confirmé la réception de votre paiement de loyer pour <strong>{month_display}</strong>.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:12px;margin-bottom:24px;">
            <tr><td style="padding:20px 24px;">
              <table width="100%" cellpadding="4">
                <tr>
                  <td style="font-size:13px;color:#6b7280;width:40%;">Montant</td>
                  <td style="font-size:13px;font-weight:600;color:#111827;">{amount_str} $</td>
                </tr>
                <tr>
                  <td style="font-size:13px;color:#6b7280;">Période</td>
                  <td style="font-size:13px;font-weight:600;color:#111827;">{month_display}</td>
                </tr>
                <tr>
                  <td style="font-size:13px;color:#6b7280;">Statut</td>
                  <td style="font-size:13px;font-weight:700;color:#059669;">Payé ✓</td>
                </tr>
              </table>
            </td></tr>
          </table>
          <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">
            Merci pour votre paiement. Consultez votre historique dans le portail locataire.
          </p>
        </td></tr>
        <tr><td style="padding:20px 36px;border-top:1px solid #f3f4f6;text-align:center;">
          <p style="margin:0;font-size:11px;color:#9ca3af;">Domely · <a href="https://domely.ca" style="color:#1E7A6E;text-decoration:none;">domely.ca</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>"""
    await _send_auto_email(
        tenant_email,
        f"Domely — Votre loyer de {month_display} a été confirmé ✓",
        html,
    )

@api_router.delete("/rent-payments/{payment_id}")
async def delete_rent_payment(payment_id: str, current_user: dict = Depends(get_current_user)):
    payment = await db.rent_payments.find_one({"id": payment_id, "user_id": current_user["id"]})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    await db.rent_payments.delete_one({"id": payment_id})
    return {"message": "Payment deleted"}


@api_router.post("/rent-payments/{payment_id}/waive-late-fee")
async def waive_late_fee(payment_id: str, current_user: dict = Depends(get_current_user)):
    """Waive the late fee on a rent payment (landlord only)."""
    payment = await db.rent_payments.find_one({"id": payment_id, "user_id": current_user["id"]})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    await db.rent_payments.update_one(
        {"id": payment_id},
        {"$set": {"late_fee_waived": True, "late_fee_amount": 0}}
    )
    updated = await db.rent_payments.find_one({"id": payment_id})
    return RentPayment(**updated)


@api_router.post("/rent-payments/{payment_id}/send-receipt")
async def send_payment_receipt(payment_id: str, current_user: dict = Depends(get_current_user)):
    """Generate a PDF receipt and email it to the tenant."""
    payment = await db.rent_payments.find_one({"id": payment_id, "user_id": current_user["id"]})
    if not payment:
        raise HTTPException(status_code=404, detail="Paiement introuvable")

    tenant_id = payment.get("tenant_id")
    tenant = await db.tenants.find_one({"id": tenant_id}) if tenant_id else None
    if not tenant or not tenant.get("email"):
        raise HTTPException(status_code=400, detail="Adresse email du locataire introuvable")

    tenant_email = tenant["email"]
    tenant_name  = f"{tenant.get('first_name', '')} {tenant.get('last_name', '')}".strip() or tenant_email
    amount       = float(payment.get("amount") or 0)
    month_year   = payment.get("month_year", "")
    pay_date     = payment.get("payment_date") or payment.get("paid_date") or ""
    method       = payment.get("payment_method") or ""
    receipt_no   = (payment.get("id") or "")[:8].upper()

    try:
        from datetime import datetime as _dt
        month_display = _dt.strptime(month_year, "%Y-%m").strftime("%B %Y")
    except Exception:
        month_display = month_year

    try:
        pay_display = _dt.strptime(pay_date[:10], "%Y-%m-%d").strftime("%d %B %Y") if pay_date else "—"
    except Exception:
        pay_display = pay_date or "—"

    method_labels = {
        "cheque": "Chèque", "virement": "Virement bancaire", "interac": "Interac",
        "cash": "Comptant", "credit_card": "Carte de crédit", "pre_auth": "Prélèvement automatique",
    }
    method_display = method_labels.get(method, method or "—")
    amount_str = f"{amount:,.2f}".replace(",", "\xa0").replace(".", ",")

    # Generate PDF receipt with reportlab
    from reportlab.pdfgen import canvas as rl_canvas
    import base64

    W, H = 612, 792
    buf = io.BytesIO()
    c = rl_canvas.Canvas(buf, pagesize=(W, H))

    # Header teal bar
    c.setFillColorRGB(0.118, 0.478, 0.431)   # teal-600
    c.rect(0, H - 90, W, 90, fill=1, stroke=0)
    c.setFillColorRGB(1, 1, 1)
    c.setFont("Helvetica-Bold", 22)
    c.drawString(36, H - 42, "Domely")
    c.setFont("Helvetica-Bold", 15)
    c.drawString(36, H - 66, "Reçu de paiement")
    c.setFont("Helvetica", 9)
    c.drawRightString(W - 36, H - 50, f"Reçu n° {receipt_no}")
    c.drawRightString(W - 36, H - 65, month_display)

    # Amount hero
    c.setFillColorRGB(0.067, 0.067, 0.067)
    c.setFont("Helvetica-Bold", 32)
    c.drawString(36, H - 140, f"{amount_str} $")
    c.setFillColorRGB(0.157, 0.502, 0.408)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(36, H - 158, "PAYÉ ✓")

    # Divider
    c.setStrokeColorRGB(0.9, 0.9, 0.9)
    c.setLineWidth(1)
    c.line(36, H - 172, W - 36, H - 172)

    # Details table
    rows = [
        ("Locataire",        tenant_name),
        ("Période",          month_display),
        ("Date de paiement", pay_display),
        ("Mode de paiement", method_display),
        ("Statut",           "Payé"),
    ]
    y = H - 198
    for label, value in rows:
        c.setFillColorRGB(0.5, 0.5, 0.5)
        c.setFont("Helvetica", 9)
        c.drawString(36, y, label.upper())
        c.setFillColorRGB(0.1, 0.1, 0.1)
        c.setFont("Helvetica-Bold", 11)
        c.drawString(200, y, _rl_safe(value))
        y -= 28

    # Footer
    c.setStrokeColorRGB(0.9, 0.9, 0.9)
    c.line(36, 60, W - 36, 60)
    c.setFillColorRGB(0.6, 0.6, 0.6)
    c.setFont("Helvetica", 8)
    c.drawString(36, 44, "Ce reçu a été généré automatiquement par Domely · domely.ca")
    c.drawRightString(W - 36, 44, _dt.utcnow().strftime("%d %B %Y"))

    c.save()
    buf.seek(0)
    pdf_bytes = buf.read()
    pdf_b64 = base64.b64encode(pdf_bytes).decode()

    # Send email with PDF attachment
    if not RESEND_API_KEY:
        return {"ok": True, "note": "RESEND_API_KEY non configuré — email non envoyé"}

    html = f"""<!DOCTYPE html><html lang="fr"><body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 16px;">
  <tr><td align="center">
    <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;">
      <tr><td style="background:linear-gradient(135deg,#1E7A6E,#3FAF86);padding:28px 36px;">
        <div style="font-size:22px;font-weight:800;color:#fff;">Domely</div>
        <div style="font-size:13px;color:#a7f3d0;margin-top:4px;">Reçu de paiement</div>
      </td></tr>
      <tr><td style="padding:32px 36px;">
        <h2 style="margin:0 0 6px;font-size:20px;font-weight:700;color:#111827;">Bonjour {tenant_name.split()[0]} !</h2>
        <p style="margin:0 0 24px;font-size:14px;color:#6b7280;">Voici votre reçu de paiement pour <strong>{month_display}</strong>. Le document PDF est joint à ce courriel.</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:12px;margin-bottom:24px;">
          <tr><td style="padding:20px 24px;">
            <table width="100%" cellpadding="4">
              <tr><td style="font-size:13px;color:#6b7280;width:40%;">Montant</td><td style="font-size:15px;font-weight:700;color:#111827;">{amount_str} $</td></tr>
              <tr><td style="font-size:13px;color:#6b7280;">Période</td><td style="font-size:13px;font-weight:600;color:#111827;">{month_display}</td></tr>
              <tr><td style="font-size:13px;color:#6b7280;">Date</td><td style="font-size:13px;font-weight:600;color:#111827;">{pay_display}</td></tr>
              <tr><td style="font-size:13px;color:#6b7280;">Mode</td><td style="font-size:13px;font-weight:600;color:#111827;">{method_display}</td></tr>
              <tr><td style="font-size:13px;color:#6b7280;">Statut</td><td style="font-size:13px;font-weight:700;color:#059669;">Payé ✓</td></tr>
            </table>
          </td></tr>
        </table>
      </td></tr>
      <tr><td style="padding:16px 36px;border-top:1px solid #f3f4f6;text-align:center;">
        <p style="margin:0;font-size:11px;color:#9ca3af;">Domely · <a href="https://domely.ca" style="color:#1E7A6E;text-decoration:none;">domely.ca</a></p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>"""

    import httpx
    async with httpx.AsyncClient() as hc:
        resp = await hc.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {RESEND_API_KEY}", "Content-Type": "application/json"},
            json={
                "from": "Domely <noreply@domely.ca>",
                "to": tenant_email,
                "subject": f"Domely — Reçu de loyer {month_display}",
                "html": html,
                "attachments": [{"filename": f"recu-loyer-{month_year}.pdf", "content": pdf_b64}],
            },
            timeout=12.0,
        )
    if resp.status_code not in (200, 201):
        raise HTTPException(status_code=502, detail="Erreur envoi email")

    return {"ok": True, "sent_to": tenant_email}


def _build_receipt_pdf(payment: dict, tenant, prop) -> bytes:
    """Generate a rent receipt PDF using reportlab and return raw bytes."""
    from reportlab.pdfgen import canvas as rl_canvas
    from datetime import datetime as _dt

    tenant_name = (
        f"{tenant.get('first_name', '')} {tenant.get('last_name', '')}".strip()
        if tenant
        else payment.get("tenant_id", "—")
    )
    prop_addr = prop.get("address", "—") if prop else payment.get("property_id", "—")
    amount = float(payment.get("amount") or 0)
    month_year = payment.get("month_year", "")
    pay_date = payment.get("payment_date") or payment.get("paid_date") or ""
    method = payment.get("payment_method") or payment.get("method") or ""
    receipt_no = (payment.get("id") or "")[:8].upper()

    try:
        month_display = _dt.strptime(month_year, "%Y-%m").strftime("%B %Y")
    except Exception:
        month_display = month_year or "—"

    try:
        pay_display = _dt.strptime(pay_date[:10], "%Y-%m-%d").strftime("%d %B %Y") if pay_date else "—"
    except Exception:
        pay_display = pay_date or "—"

    method_labels = {
        "cheque": "Cheque", "virement": "Virement bancaire", "interac": "Interac",
        "cash": "Comptant", "credit_card": "Carte de credit", "pre_auth": "Prelevement automatique",
        "etransfer": "Virement Interac",
    }
    method_display = method_labels.get(method, method or "—")
    amount_str = f"{amount:,.2f}".replace(",", "\xa0").replace(".", ",")

    W, H = 612, 792
    buf = io.BytesIO()
    c = rl_canvas.Canvas(buf, pagesize=(W, H))

    # Header teal bar
    c.setFillColorRGB(0.118, 0.478, 0.431)
    c.rect(0, H - 90, W, 90, fill=1, stroke=0)
    c.setFillColorRGB(1, 1, 1)
    c.setFont("Helvetica-Bold", 22)
    c.drawString(36, H - 42, "Domely")
    c.setFont("Helvetica-Bold", 15)
    c.drawString(36, H - 66, "Recu de paiement")
    c.setFont("Helvetica", 9)
    c.drawRightString(W - 36, H - 50, f"Recu n {receipt_no}")
    c.drawRightString(W - 36, H - 65, _rl_safe(month_display))

    # Amount hero
    c.setFillColorRGB(0.067, 0.067, 0.067)
    c.setFont("Helvetica-Bold", 32)
    c.drawString(36, H - 140, f"{amount_str} $")
    c.setFillColorRGB(0.157, 0.502, 0.408)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(36, H - 158, "PAYE")

    # Divider
    c.setStrokeColorRGB(0.9, 0.9, 0.9)
    c.setLineWidth(1)
    c.line(36, H - 172, W - 36, H - 172)

    # Details table
    rows = [
        ("Locataire",        tenant_name),
        ("Propriete",        prop_addr),
        ("Periode",          month_display),
        ("Date de paiement", pay_display),
        ("Mode de paiement", method_display),
        ("Statut",           "Paye"),
        ("Reference",        (payment.get("id") or "—")[:16]),
    ]
    y = H - 198
    for label, value in rows:
        c.setFillColorRGB(0.5, 0.5, 0.5)
        c.setFont("Helvetica", 9)
        c.drawString(36, y, label.upper())
        c.setFillColorRGB(0.1, 0.1, 0.1)
        c.setFont("Helvetica-Bold", 11)
        c.drawString(220, y, _rl_safe(str(value)))
        y -= 28

    # Footer
    c.setStrokeColorRGB(0.9, 0.9, 0.9)
    c.line(36, 60, W - 36, 60)
    c.setFillColorRGB(0.6, 0.6, 0.6)
    c.setFont("Helvetica", 8)
    c.drawString(36, 44, "Ce recu a ete genere automatiquement par Domely · domely.ca")
    c.drawRightString(W - 36, 44, _dt.utcnow().strftime("%d %B %Y"))

    c.save()
    buf.seek(0)
    return buf.read()


@api_router.get("/rent-payments/{payment_id}/receipt")
async def download_rent_receipt(payment_id: str, current_user: dict = Depends(get_current_user)):
    """Download a PDF rent receipt for a given payment (landlord)."""
    from fastapi.responses import StreamingResponse

    payment = await db.rent_payments.find_one({"id": payment_id, "user_id": current_user["id"]})
    if not payment:
        raise HTTPException(status_code=404, detail="Paiement introuvable")
    payment.pop("_id", None)

    tenant = await db.tenants.find_one({"id": payment.get("tenant_id")}) if payment.get("tenant_id") else None
    prop = await db.properties.find_one({"id": payment["property_id"]}) if payment.get("property_id") else None

    pdf_bytes = _build_receipt_pdf(payment, tenant, prop)
    my = (payment.get("month_year") or "receipt").replace(" ", "-").replace("/", "-")
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="recu-loyer-{my}.pdf"'},
    )


async def get_current_tenant(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    token = credentials.credentials
    payload = verify_token(token)
    if payload.get("role") != "tenant":
        raise HTTPException(status_code=403, detail="Tenant access only")
    tenant = await db.tenants.find_one({"id": payload["sub"]})
    if not tenant:
        raise HTTPException(status_code=401, detail="Tenant not found")
    return tenant


@api_router.get("/tenant/payments/{payment_id}/receipt")
async def tenant_download_receipt(payment_id: str, current_tenant: dict = Depends(get_current_tenant)):
    """Download a PDF rent receipt for a given payment (tenant portal)."""
    from fastapi.responses import StreamingResponse

    tenant_id = current_tenant.get("id") or current_tenant.get("tenant_id")
    payment = await db.rent_payments.find_one({"id": payment_id, "tenant_id": tenant_id})
    if not payment:
        raise HTTPException(status_code=404, detail="Paiement introuvable")
    payment.pop("_id", None)

    tenant = await db.tenants.find_one({"id": tenant_id}) if tenant_id else None
    prop = await db.properties.find_one({"id": payment["property_id"]}) if payment.get("property_id") else None

    pdf_bytes = _build_receipt_pdf(payment, tenant, prop)
    my = (payment.get("month_year") or "receipt").replace(" ", "-").replace("/", "-")
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="recu-loyer-{my}.pdf"'},
    )


# Rent overview endpoint
@api_router.get("/rent-overview")
async def get_rent_overview(current_user: dict = Depends(get_current_user)):
    current_month = datetime.now().strftime("%Y-%m")
    
    # Get all active leases
    leases = await db.leases.find({
        "user_id": current_user["id"],
        "is_active": True
    }).to_list(100)
    
    result = []
    today = datetime.now().day
    
    for lease in leases:
        tenant = await db.tenants.find_one({"id": lease["tenant_id"]})
        unit = await db.units.find_one({"id": lease["unit_id"]})
        prop = None
        if unit:
            prop = await db.properties.find_one({"id": unit.get("property_id")})
        
        payment = await db.rent_payments.find_one({
            "tenant_id": lease["tenant_id"],
            "month_year": current_month
        })
        
        status = "pending"
        if payment:
            status = "paid"
        elif today > lease.get("payment_due_day", 1):
            status = "late"
        
        result.append({
            "tenant_id": lease["tenant_id"],
            "tenant_name": f"{tenant.get('first_name', '')} {tenant.get('last_name', '')}" if tenant else "Unknown",
            "unit_number": unit.get("unit_number") if unit else None,
            "property_name": prop.get("name") if prop else None,
            "rent_amount": lease.get("rent_amount", 0),
            "payment_due_day": lease.get("payment_due_day", 1),
            "status": status,
            "payment_date": payment.get("payment_date") if payment else None,
            "amount_paid": payment.get("amount") if payment else 0,
            "lease_id": lease["id"]
        })
    
    return result

# ===========================
# MAINTENANCE ROUTES
# ===========================

@api_router.post("/maintenance", response_model=MaintenanceRequest)
async def create_maintenance(data: MaintenanceRequestCreate, current_user: dict = Depends(get_current_user)):
    # Verify property belongs to user
    prop = await db.properties.find_one({"id": data.property_id, "user_id": current_user["id"]})
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    
    request = MaintenanceRequest(user_id=current_user["id"], **data.model_dump())
    await db.maintenance_requests.insert_one(request.model_dump())
    return request

@api_router.get("/maintenance", response_model=List[MaintenanceRequestWithDetails])
async def get_maintenance_requests(
    status: Optional[str] = None,
    property_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {"user_id": current_user["id"]}
    if status:
        query["status"] = status
    if property_id:
        query["property_id"] = property_id
    
    requests = await db.maintenance_requests.find(query).sort("created_at", -1).to_list(100)
    result = []
    
    for req in requests:
        property_name = None
        unit_number = None
        
        prop = await db.properties.find_one({"id": req["property_id"]})
        if prop:
            property_name = prop.get("name")
        
        if req.get("unit_id"):
            unit = await db.units.find_one({"id": req["unit_id"]})
            if unit:
                unit_number = unit.get("unit_number")
        
        result.append(MaintenanceRequestWithDetails(
            **req,
            property_name=property_name,
            unit_number=unit_number
        ))
    
    return result

@api_router.get("/maintenance/{request_id}", response_model=MaintenanceRequestWithDetails)
async def get_maintenance_request(request_id: str, current_user: dict = Depends(get_current_user)):
    req = await db.maintenance_requests.find_one({"id": request_id, "user_id": current_user["id"]})
    if not req:
        raise HTTPException(status_code=404, detail="Maintenance request not found")
    
    property_name = None
    unit_number = None
    
    prop = await db.properties.find_one({"id": req["property_id"]})
    if prop:
        property_name = prop.get("name")
    
    if req.get("unit_id"):
        unit = await db.units.find_one({"id": req["unit_id"]})
        if unit:
            unit_number = unit.get("unit_number")
    
    return MaintenanceRequestWithDetails(
        **req,
        property_name=property_name,
        unit_number=unit_number
    )

@api_router.put("/maintenance/{request_id}", response_model=MaintenanceRequest)
async def update_maintenance(request_id: str, status: str, cost: Optional[float] = None, notes: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    req = await db.maintenance_requests.find_one({"id": request_id, "user_id": current_user["id"]})
    if not req:
        raise HTTPException(status_code=404, detail="Maintenance request not found")
    
    update_data = {
        "status": status,
        "updated_at": datetime.utcnow()
    }
    
    if cost is not None:
        update_data["cost"] = cost
    if notes is not None:
        update_data["notes"] = notes
    if status == "completed":
        update_data["completed_at"] = datetime.utcnow()
    
    await db.maintenance_requests.update_one({"id": request_id}, {"$set": update_data})
    updated = await db.maintenance_requests.find_one({"id": request_id})
    return MaintenanceRequest(**updated)

@api_router.delete("/maintenance/{request_id}")
async def delete_maintenance(request_id: str, current_user: dict = Depends(get_current_user)):
    req = await db.maintenance_requests.find_one({"id": request_id, "user_id": current_user["id"]})
    if not req:
        raise HTTPException(status_code=404, detail="Maintenance request not found")

    await db.maintenance_requests.delete_one({"id": request_id})
    return {"message": "Maintenance request deleted"}

class ContractorAssignBody(BaseModel):
    contractor_id: Optional[str] = None

@api_router.patch("/maintenance/{request_id}/assign", response_model=MaintenanceRequestWithDetails)
async def assign_contractor_to_maintenance(
    request_id: str,
    data: ContractorAssignBody,
    current_user: dict = Depends(get_current_user)
):
    req = await db.maintenance_requests.find_one({"id": request_id, "user_id": current_user["id"]})
    if not req:
        raise HTTPException(status_code=404, detail="Maintenance request not found")

    update_data: dict = {"updated_at": datetime.utcnow()}

    if data.contractor_id:
        contractor = await db.contractors.find_one({"id": data.contractor_id, "user_id": current_user["id"]})
        if not contractor:
            raise HTTPException(status_code=404, detail="Contractor not found")
        update_data["assigned_contractor_id"] = contractor["id"]
        update_data["assigned_contractor_name"] = contractor.get("name", "")
        update_data["assigned_contractor_trade"] = contractor.get("trade", "") or contractor.get("specialty", "")
        update_data["assigned_contractor_phone"] = contractor.get("phone", "")
        # Move to in_progress if currently open
        if req.get("status") == "open":
            update_data["status"] = "in_progress"
    else:
        # Unassign
        update_data["assigned_contractor_id"] = None
        update_data["assigned_contractor_name"] = None
        update_data["assigned_contractor_trade"] = None
        update_data["assigned_contractor_phone"] = None

    await db.maintenance_requests.update_one({"id": request_id}, {"$set": update_data})
    updated = await db.maintenance_requests.find_one({"id": request_id})

    property_name = None
    unit_number = None
    prop = await db.properties.find_one({"id": updated["property_id"]})
    if prop:
        property_name = prop.get("name")
    if updated.get("unit_id"):
        unit = await db.units.find_one({"id": updated["unit_id"]})
        if unit:
            unit_number = unit.get("unit_number")

    return MaintenanceRequestWithDetails(**updated, property_name=property_name, unit_number=unit_number)

# ===========================
# REMINDER ROUTES
# ===========================

@api_router.post("/reminders", response_model=Reminder)
async def create_reminder(data: ReminderCreate, current_user: dict = Depends(get_current_user)):
    reminder = Reminder(user_id=current_user["id"], **data.model_dump())
    await db.reminders.insert_one(reminder.model_dump())
    return reminder

@api_router.get("/reminders", response_model=List[Reminder])
async def get_reminders(include_completed: bool = False, current_user: dict = Depends(get_current_user)):
    query = {"user_id": current_user["id"]}
    if not include_completed:
        query["is_completed"] = False
    
    reminders = await db.reminders.find(query).sort("due_date", 1).to_list(100)
    return [Reminder(**r) for r in reminders]

@api_router.put("/reminders/{reminder_id}/complete")
async def complete_reminder(reminder_id: str, current_user: dict = Depends(get_current_user)):
    reminder = await db.reminders.find_one({"id": reminder_id, "user_id": current_user["id"]})
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    
    await db.reminders.update_one({"id": reminder_id}, {"$set": {"is_completed": True}})
    return {"message": "Reminder completed"}

@api_router.delete("/reminders/{reminder_id}")
async def delete_reminder(reminder_id: str, current_user: dict = Depends(get_current_user)):
    reminder = await db.reminders.find_one({"id": reminder_id, "user_id": current_user["id"]})
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    
    await db.reminders.delete_one({"id": reminder_id})
    return {"message": "Reminder deleted"}

@api_router.put("/reminders/{reminder_id}", response_model=Reminder)
async def update_reminder(reminder_id: str, data: ReminderUpdate, current_user: dict = Depends(get_current_user)):
    reminder = await db.reminders.find_one({"id": reminder_id, "user_id": current_user["id"]})
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    update_fields = {k: v for k, v in data.model_dump().items() if v is not None}
    update_fields["updated_at"] = datetime.utcnow()
    await db.reminders.update_one({"id": reminder_id}, {"$set": update_fields})
    updated = await db.reminders.find_one({"id": reminder_id})
    return Reminder(**updated)

# ===========================
# DASHBOARD ROUTES
# ===========================

@api_router.get("/dashboard", response_model=DashboardStats)
async def get_dashboard(current_user: dict = Depends(get_current_user)):
    current_month = datetime.now().strftime("%Y-%m")
    today = datetime.now()
    
    # Properties count
    total_properties = await db.properties.count_documents({"user_id": current_user["id"]})
    
    # Get all user's properties and units
    properties = await db.properties.find({"user_id": current_user["id"]}).to_list(100)
    property_ids = [p["id"] for p in properties]
    
    units = await db.units.find({"property_id": {"$in": property_ids}}).to_list(100)
    total_units = len(units)
    occupied_units = sum(1 for u in units if u.get("is_occupied", False))
    vacant_units = total_units - occupied_units
    
    occupancy_rate = (occupied_units / total_units * 100) if total_units > 0 else 0
    
    # Rent calculations
    total_rent_expected = sum(u.get("rent_amount", 0) for u in units if u.get("is_occupied", False))
    
    unit_ids = [u["id"] for u in units]
    payments = await db.rent_payments.find({
        "unit_id": {"$in": unit_ids},
        "month_year": current_month
    }).to_list(100)
    total_rent_collected = sum(p.get("amount", 0) for p in payments)
    
    collection_rate = (total_rent_collected / total_rent_expected * 100) if total_rent_expected > 0 else 0
    
    # Tenants count
    total_tenants = await db.tenants.count_documents({"user_id": current_user["id"]})

    # Collected vs pending this month
    collected_this_month = sum(
        p.get("amount", 0) for p in payments if p.get("status") == "paid"
    )
    pending_rent = sum(
        p.get("amount", 0) for p in payments if p.get("status") in ("pending", "late")
    )

    # Open maintenance
    open_maintenance = await db.maintenance_requests.count_documents({
        "user_id": current_user["id"],
        "status": {"$in": ["open", "in_progress"]}
    })

    # Leases expiring in next 60 days
    future_date = (today + timedelta(days=60)).strftime("%Y-%m-%d")
    today_str = today.strftime("%Y-%m-%d")

    leases_expiring = await db.leases.count_documents({
        "user_id": current_user["id"],
        "is_active": True,
        "end_date": {"$lte": future_date, "$gte": today_str}
    })

    # Overdue rent count
    active_leases = await db.leases.find({
        "user_id": current_user["id"],
        "is_active": True
    }).to_list(100)

    overdue_count = 0
    for lease in active_leases:
        payment = await db.rent_payments.find_one({
            "tenant_id": lease["tenant_id"],
            "month_year": current_month
        })
        if not payment and today.day > lease.get("payment_due_day", 1):
            overdue_count += 1

    # Recent payments (last 8, with tenant name)
    tenant_cache: dict = {}
    recent_raw = await db.rent_payments.find(
        {"user_id": current_user["id"]}
    ).sort("created_at", -1).limit(8).to_list(8)

    recent_payments = []
    for p in recent_raw:
        tid = p.get("tenant_id")
        if tid and tid not in tenant_cache:
            t = await db.tenants.find_one({"id": tid, "user_id": current_user["id"]})
            tenant_cache[tid] = f"{t.get('first_name','')} {t.get('last_name','')}".strip() if t else tid
        recent_payments.append({
            "id": p.get("id"),
            "tenant_id": tid,
            "tenant_name": tenant_cache.get(tid, tid),
            "amount": p.get("amount", 0),
            "status": p.get("status", "pending"),
            "month_year": p.get("month_year"),
            "due_date": f"{p.get('month_year')}-01" if p.get("month_year") else None,
            "payment_date": p.get("payment_date"),
        })

    # Alerts
    alerts = []
    if overdue_count > 0:
        alerts.append({"type": "urgent", "message": f"{overdue_count} loyer(s) en retard ce mois-ci" if True else f"{overdue_count} overdue rent(s) this month"})
    if leases_expiring > 0:
        alerts.append({"type": "warning", "message": f"{leases_expiring} bail(s) expire(nt) dans les 60 prochains jours"})
    if open_maintenance > 0:
        alerts.append({"type": "info", "message": f"{open_maintenance} demande(s) de maintenance ouverte(s)"})

    return DashboardStats(
        total_properties=total_properties,
        total_units=total_units,
        total_tenants=total_tenants,
        occupied_units=occupied_units,
        vacant_units=vacant_units,
        occupancy_rate=round(occupancy_rate, 1),
        total_rent_expected=total_rent_expected,
        total_rent_collected=total_rent_collected,
        monthly_revenue=collected_this_month,
        collected_this_month=collected_this_month,
        pending_rent=pending_rent,
        collection_rate=round(collection_rate, 1),
        open_maintenance=open_maintenance,
        open_maintenance_requests=open_maintenance,
        leases_expiring_soon=leases_expiring,
        overdue_rent_count=overdue_count,
        current_month=current_month,
        recent_payments=recent_payments,
        alerts=alerts,
    )

# ===========================
# DEMO DATA SEEDING
# ===========================

@api_router.post("/seed-demo-data")
async def seed_demo_data(current_user: dict = Depends(get_current_user)):
    """Seed rich demo data for the current user"""
    user_id = current_user["id"]
    user_oid = str(current_user.get("_id", current_user["id"]))  # for mortgage/insurance collections

    existing = await db.properties.count_documents({"user_id": user_id})
    if existing > 0:
        return {"message": "Demo data already exists", "seeded": False}

    today = datetime.now()
    current_month = today.strftime("%Y-%m")

    # ── Properties ──────────────────────────────────────────────────
    properties_data = [
        {
            "id": str(uuid.uuid4()), "user_id": user_id,
            "name": "Duplex Rosemont",
            "address": "1234 Rue Masson", "city": "Montréal",
            "province": "QC", "postal_code": "H2G 1S6",
            "property_type": "duplex", "year_built": 1985,
            "purchase_price": 485000, "current_value": 620000,
            "notes": "Corner lot, great condition",
            "created_at": datetime.utcnow(), "updated_at": datetime.utcnow(),
        },
        {
            "id": str(uuid.uuid4()), "user_id": user_id,
            "name": "Triplex Plateau",
            "address": "5678 Avenue du Parc", "city": "Montréal",
            "province": "QC", "postal_code": "H2V 4H8",
            "property_type": "triplex", "year_built": 1920,
            "purchase_price": 695000, "current_value": 890000,
            "notes": "Heritage building, fully renovated 2019",
            "created_at": datetime.utcnow(), "updated_at": datetime.utcnow(),
        },
    ]
    await db.properties.insert_many(properties_data)
    duplex_id  = properties_data[0]["id"]
    triplex_id = properties_data[1]["id"]

    # ── Units ───────────────────────────────────────────────────────
    units_data = [
        {"id": str(uuid.uuid4()), "property_id": duplex_id,  "unit_number": "1", "bedrooms": 2, "bathrooms": 1.0, "square_feet": 850,  "rent_amount": 1450.00, "is_occupied": True,  "current_tenant_id": None, "notes": "Ground floor",               "created_at": datetime.utcnow()},
        {"id": str(uuid.uuid4()), "property_id": duplex_id,  "unit_number": "2", "bedrooms": 3, "bathrooms": 1.0, "square_feet": 950,  "rent_amount": 1650.00, "is_occupied": True,  "current_tenant_id": None, "notes": "Upper floor, balcony",         "created_at": datetime.utcnow()},
        {"id": str(uuid.uuid4()), "property_id": triplex_id, "unit_number": "A", "bedrooms": 1, "bathrooms": 1.0, "square_feet": 650,  "rent_amount": 1200.00, "is_occupied": True,  "current_tenant_id": None, "notes": "Basement, separate entrance",   "created_at": datetime.utcnow()},
        {"id": str(uuid.uuid4()), "property_id": triplex_id, "unit_number": "B", "bedrooms": 2, "bathrooms": 1.0, "square_feet": 800,  "rent_amount": 1500.00, "is_occupied": True,  "current_tenant_id": None, "notes": "Main floor",                   "created_at": datetime.utcnow()},
        {"id": str(uuid.uuid4()), "property_id": triplex_id, "unit_number": "C", "bedrooms": 3, "bathrooms": 1.5, "square_feet": 1100, "rent_amount": 1800.00, "is_occupied": False, "current_tenant_id": None, "notes": "Top floor, recently renovated — currently vacant", "created_at": datetime.utcnow()},
    ]
    await db.units.insert_many(units_data)

    # ── Tenants ─────────────────────────────────────────────────────
    tenants_data = [
        {"id": str(uuid.uuid4()), "user_id": user_id, "first_name": "Marie",   "last_name": "Tremblay", "email": "marie.tremblay@email.com", "phone": "514-555-0101", "unit_id": units_data[0]["id"], "emergency_contact_name": "Jean Tremblay",  "emergency_contact_phone": "514-555-0102", "notes": "Excellent tenant, always pays on time", "created_at": datetime.utcnow()},
        {"id": str(uuid.uuid4()), "user_id": user_id, "first_name": "Pierre",  "last_name": "Gagnon",   "email": "p.gagnon@email.com",       "phone": "514-555-0201", "unit_id": units_data[1]["id"], "emergency_contact_name": "Sophie Gagnon",  "emergency_contact_phone": "514-555-0202", "notes": None, "created_at": datetime.utcnow()},
        {"id": str(uuid.uuid4()), "user_id": user_id, "first_name": "Julie",   "last_name": "Bouchard", "email": "julie.b@email.com",         "phone": "514-555-0301", "unit_id": units_data[2]["id"], "emergency_contact_name": None,             "emergency_contact_phone": None,           "notes": "Works from home", "created_at": datetime.utcnow()},
        {"id": str(uuid.uuid4()), "user_id": user_id, "first_name": "Michel",  "last_name": "Roy",      "email": "m.roy@email.com",           "phone": "514-555-0401", "unit_id": units_data[3]["id"], "emergency_contact_name": "Anne Roy",       "emergency_contact_phone": "514-555-0402", "notes": "Has a small dog (approved)", "created_at": datetime.utcnow()},
    ]
    await db.tenants.insert_many(tenants_data)
    for tenant in tenants_data:
        await db.units.update_one({"id": tenant["unit_id"]}, {"$set": {"current_tenant_id": tenant["id"]}})

    # ── Leases (dates relative to March 2026) ───────────────────────
    leases_data = [
        {"id": str(uuid.uuid4()), "user_id": user_id, "tenant_id": tenants_data[0]["id"], "unit_id": units_data[0]["id"], "start_date": "2025-07-01", "end_date": "2026-06-30", "rent_amount": 1450.00, "security_deposit": 0, "payment_due_day": 1, "is_active": True, "notes": None, "created_at": datetime.utcnow()},
        {"id": str(uuid.uuid4()), "user_id": user_id, "tenant_id": tenants_data[1]["id"], "unit_id": units_data[1]["id"], "start_date": "2025-09-01", "end_date": "2026-08-31", "rent_amount": 1650.00, "security_deposit": 0, "payment_due_day": 1, "is_active": True, "notes": None, "created_at": datetime.utcnow()},
        {"id": str(uuid.uuid4()), "user_id": user_id, "tenant_id": tenants_data[2]["id"], "unit_id": units_data[2]["id"], "start_date": "2025-01-01", "end_date": "2026-12-31", "rent_amount": 1200.00, "security_deposit": 0, "payment_due_day": 1, "is_active": True, "notes": None, "created_at": datetime.utcnow()},
        {"id": str(uuid.uuid4()), "user_id": user_id, "tenant_id": tenants_data[3]["id"], "unit_id": units_data[3]["id"], "start_date": "2025-04-01", "end_date": "2026-03-31", "rent_amount": 1500.00, "security_deposit": 0, "payment_due_day": 1, "is_active": True, "notes": "Expires end of March — discuss renewal", "created_at": datetime.utcnow()},
    ]
    await db.leases.insert_many(leases_data)

    # ── Rent payments: 5 months history + current March 2026 ────────
    tenants_lease_map = [
        (tenants_data[0], leases_data[0], units_data[0], 1450.00),
        (tenants_data[1], leases_data[1], units_data[1], 1650.00),
        (tenants_data[2], leases_data[2], units_data[2], 1200.00),
        (tenants_data[3], leases_data[3], units_data[3], 1500.00),
    ]
    payments_data = []
    for month in ["2025-10", "2025-11", "2025-12", "2026-01", "2026-02"]:
        for tenant, lease, unit, amount in tenants_lease_map:
            payments_data.append({
                "id": str(uuid.uuid4()), "user_id": user_id,
                "lease_id": lease["id"], "tenant_id": tenant["id"], "unit_id": unit["id"],
                "amount": amount, "payment_date": f"{month}-01", "payment_method": "etransfer",
                "month_year": month, "status": "paid", "notes": None, "created_at": datetime.utcnow(),
            })
    # March 2026 — 2 paid, 2 pending
    payments_data += [
        {"id": str(uuid.uuid4()), "user_id": user_id, "lease_id": leases_data[0]["id"], "tenant_id": tenants_data[0]["id"], "unit_id": units_data[0]["id"], "amount": 1450.00, "payment_date": f"{current_month}-01", "payment_method": "etransfer", "month_year": current_month, "status": "paid",    "notes": None, "created_at": datetime.utcnow()},
        {"id": str(uuid.uuid4()), "user_id": user_id, "lease_id": leases_data[2]["id"], "tenant_id": tenants_data[2]["id"], "unit_id": units_data[2]["id"], "amount": 1200.00, "payment_date": f"{current_month}-02", "payment_method": "cheque",   "month_year": current_month, "status": "paid",    "notes": None, "created_at": datetime.utcnow()},
        {"id": str(uuid.uuid4()), "user_id": user_id, "lease_id": leases_data[1]["id"], "tenant_id": tenants_data[1]["id"], "unit_id": units_data[1]["id"], "amount": 1650.00, "payment_date": None, "payment_method": None, "month_year": current_month, "status": "pending", "notes": None, "created_at": datetime.utcnow()},
        {"id": str(uuid.uuid4()), "user_id": user_id, "lease_id": leases_data[3]["id"], "tenant_id": tenants_data[3]["id"], "unit_id": units_data[3]["id"], "amount": 1500.00, "payment_date": None, "payment_method": None, "month_year": current_month, "status": "pending", "notes": None, "created_at": datetime.utcnow()},
    ]
    await db.rent_payments.insert_many(payments_data)

    # ── Maintenance ──────────────────────────────────────────────────
    maintenance_data = [
        {"id": str(uuid.uuid4()), "user_id": user_id, "property_id": duplex_id,  "unit_id": units_data[1]["id"], "title": "Leaky faucet in bathroom",         "description": "Bathroom faucet dripping for 3 days, getting worse.",               "priority": "medium", "status": "open",        "reported_by": "Pierre Gagnon", "cost": None,   "notes": None,                           "created_at": datetime.utcnow()-timedelta(days=3),  "updated_at": datetime.utcnow()-timedelta(days=3),  "completed_at": None},
        {"id": str(uuid.uuid4()), "user_id": user_id, "property_id": triplex_id, "unit_id": units_data[3]["id"], "title": "Heating not working properly",      "description": "Radiator in living room not heating evenly — cold spots.",         "priority": "high",   "status": "in_progress", "reported_by": "Michel Roy",   "cost": 150.00, "notes": "Plumber scheduled this week",  "created_at": datetime.utcnow()-timedelta(days=5),  "updated_at": datetime.utcnow()-timedelta(days=1),  "completed_at": None},
        {"id": str(uuid.uuid4()), "user_id": user_id, "property_id": triplex_id, "unit_id": None,               "title": "Replace hallway light fixtures",    "description": "Common area lights flickering — needs replacing.",                "priority": "low",    "status": "open",        "reported_by": None,            "cost": None,   "notes": "General building maintenance", "created_at": datetime.utcnow()-timedelta(days=10), "updated_at": datetime.utcnow()-timedelta(days=10), "completed_at": None},
        {"id": str(uuid.uuid4()), "user_id": user_id, "property_id": duplex_id,  "unit_id": units_data[0]["id"], "title": "Window seal replacement",           "description": "Bedroom window condensation between panes — losing heat.",        "priority": "medium", "status": "completed",   "reported_by": "Marie Tremblay","cost": 320.00, "notes": "Replaced double-pane Jan 15",  "created_at": datetime.utcnow()-timedelta(days=55), "updated_at": datetime.utcnow()-timedelta(days=45), "completed_at": datetime.utcnow()-timedelta(days=45)},
    ]
    await db.maintenance_requests.insert_many(maintenance_data)

    # ── Reminders ────────────────────────────────────────────────────
    reminders_data = [
        {"id": str(uuid.uuid4()), "user_id": user_id, "title": "Follow up on late rent — Pierre Gagnon", "description": "Unit 2, Duplex Rosemont — March rent not received", "due_date": today.strftime("%Y-%m-%d"),                   "reminder_type": "rent_due",    "related_id": tenants_data[1]["id"], "is_completed": False, "created_at": datetime.utcnow()},
        {"id": str(uuid.uuid4()), "user_id": user_id, "title": "Lease renewal — Michel Roy",             "description": "Lease expires March 31 — meet to discuss renewal",    "due_date": (today+timedelta(days=7)).strftime("%Y-%m-%d"),  "reminder_type": "lease_expiry","related_id": tenants_data[3]["id"], "is_completed": False, "created_at": datetime.utcnow()},
        {"id": str(uuid.uuid4()), "user_id": user_id, "title": "Annual smoke detector inspection",       "description": "Test all detectors in both properties",               "due_date": (today+timedelta(days=30)).strftime("%Y-%m-%d"), "reminder_type": "general",     "related_id": None,                  "is_completed": False, "created_at": datetime.utcnow()},
    ]
    await db.reminders.insert_many(reminders_data)

    # ── Expenses: 4 months of recurring + one-offs ───────────────────
    expenses_data = []
    recurring = [
        (duplex_id,  None, "Building insurance — Duplex",       240.00, "insurance",    True),
        (triplex_id, None, "Building insurance — Triplex",       310.00, "insurance",    True),
        (duplex_id,  None, "Property tax instalment — Duplex",   415.00, "property_tax", True),
        (triplex_id, None, "Property tax instalment — Triplex",  590.00, "property_tax", True),
        (triplex_id, None, "Electricity — common areas",          95.00, "utilities",    False),
    ]
    for month in ["2025-12", "2026-01", "2026-02", current_month]:
        for prop_id, unit_id, title, amount, category, tax_ded in recurring:
            expenses_data.append({"id": str(uuid.uuid4()), "user_id": user_id, "property_id": prop_id, "unit_id": unit_id, "title": f"{title} ({month})", "amount": amount, "category": category, "expense_date": f"{month}-01", "is_tax_deductible": tax_ded, "notes": None, "created_at": datetime.utcnow(), "updated_at": datetime.utcnow()})
    expenses_data += [
        {"id": str(uuid.uuid4()), "user_id": user_id, "property_id": duplex_id,  "unit_id": units_data[0]["id"], "title": "Window seal replacement",          "amount": 320.00, "category": "maintenance", "expense_date": "2026-01-15", "is_tax_deductible": True,  "notes": "Bedroom — double pane insert",        "created_at": datetime.utcnow(), "updated_at": datetime.utcnow()},
        {"id": str(uuid.uuid4()), "user_id": user_id, "property_id": triplex_id, "unit_id": units_data[3]["id"], "title": "Furnace inspection & tune-up",      "amount": 120.00, "category": "maintenance", "expense_date": "2026-02-04", "is_tax_deductible": True,  "notes": "Annual maintenance",                  "created_at": datetime.utcnow(), "updated_at": datetime.utcnow()},
        {"id": str(uuid.uuid4()), "user_id": user_id, "property_id": duplex_id,  "unit_id": units_data[1]["id"], "title": "Plumbing repair — bathroom faucet", "amount": 180.00, "category": "maintenance", "expense_date": f"{current_month}-05", "is_tax_deductible": True, "notes": "Replaced washers and re-sealed",     "created_at": datetime.utcnow(), "updated_at": datetime.utcnow()},
    ]
    await db.expenses.insert_many(expenses_data)

    # ── Contractors ──────────────────────────────────────────────────
    contractors_data = [
        {"id": str(uuid.uuid4()), "user_id": user_id, "name": "Luc Bélanger",     "company": "Bélanger Plomberie",  "trade": "plumbing",   "phone": "514-555-1001", "email": "luc@belangerplomberie.ca", "rating": 5, "notes": "Very reliable, responds same day. Preferred plumber.",                 "preferred": True,  "last_used": (today-timedelta(days=5)).strftime("%Y-%m-%d"),   "created_at": datetime.utcnow().isoformat()},
        {"id": str(uuid.uuid4()), "user_id": user_id, "name": "Stéphane Côté",    "company": "Électro-Côté Inc.",   "trade": "electrical", "phone": "514-555-2001", "email": "scote@electrocote.com",    "rating": 4, "notes": "Licensed master electrician. Good for panel work.",                    "preferred": False, "last_used": (today-timedelta(days=90)).strftime("%Y-%m-%d"),  "created_at": datetime.utcnow().isoformat()},
        {"id": str(uuid.uuid4()), "user_id": user_id, "name": "Rafaela Ferreira", "company": "Rafaela & Fils",      "trade": "general",    "phone": "514-555-3001", "email": "rafaela@renov.ca",         "rating": 5, "notes": "General contractor. Did the full Triplex reno in 2019.", "preferred": True,  "last_used": (today-timedelta(days=365)).strftime("%Y-%m-%d"), "created_at": datetime.utcnow().isoformat()},
    ]
    await db.contractors.insert_many(contractors_data)

    # ── Applicants (for vacant Unit C, Triplex) ──────────────────────
    applicants_data = [
        {"id": str(uuid.uuid4()), "user_id": user_id, "unit_id": units_data[4]["id"], "name": "Amélie Fontaine", "email": "amelie.f@gmail.com",  "phone": "514-555-4001", "income": "$72,000 / year", "credit_score": 760, "message": "Looking to move in April 1st. Non-smoker, no pets. References available.", "status": "contacted", "created_at": (datetime.utcnow()-timedelta(days=7)).isoformat()},
        {"id": str(uuid.uuid4()), "user_id": user_id, "unit_id": units_data[4]["id"], "name": "David Morin",     "email": "d.morin@hotmail.com", "phone": "514-555-4002", "income": "$55,000 / year", "credit_score": 690, "message": "Nurse at Sacré-Cœur Hospital. Quiet tenant, no pets.",                     "status": "waiting",   "created_at": (datetime.utcnow()-timedelta(days=3)).isoformat()},
        {"id": str(uuid.uuid4()), "user_id": user_id, "unit_id": units_data[4]["id"], "name": "Karim Mansouri",  "email": "karim.m@email.com",   "phone": "514-555-4003", "income": "$90,000 / year", "credit_score": 810, "message": "Software engineer, WFH. Looking for a 2+ year lease.",                     "status": "waiting",   "created_at": (datetime.utcnow()-timedelta(days=1)).isoformat()},
    ]
    await db.applicants.insert_many(applicants_data)

    # ── Insurance ────────────────────────────────────────────────────
    insurance_data = []
    for prop_name, insurer, policy_num, premium, coverage, renewal, phone in [
        ("Duplex Rosemont", "Intact Insurance",       "INTC-2024-88431", 2880.00, 600000, "2027-01-15", "1-800-663-9393"),
        ("Triplex Plateau", "Desjardins Assurances",  "DESJ-2025-17722", 3720.00, 900000, "2026-07-01", "1-866-866-7000"),
    ]:
        ins_id = str(uuid.uuid4())
        insurance_data.append({"_id": ins_id, "id": ins_id, "user_id": user_oid, "property_name": prop_name, "insurer": insurer, "policy_number": policy_num, "type": "comprehensive", "annual_premium": premium, "coverage_amount": coverage, "renewal_date": renewal, "deductible": 1000, "contact_phone": phone})
    await db.insurance.insert_many(insurance_data)

    # ── Mortgages ────────────────────────────────────────────────────
    for prop_name, lender, original, balance, rate, payment, start, maturity in [
        ("Duplex Rosemont", "Desjardins",    388000, 319400, 5.09, 2125.00, "2022-07-01", "2027-07-01"),
        ("Triplex Plateau", "National Bank", 556000, 498200, 4.84, 2980.00, "2023-04-01", "2028-04-01"),
    ]:
        m_id = str(uuid.uuid4())
        await db.mortgages.insert_one({"_id": m_id, "id": m_id, "user_id": user_oid, "property_name": prop_name, "lender": lender, "original_amount": original, "balance": balance, "interest_rate": rate, "monthly_payment": payment, "term_years": 5, "amortization_years": 25, "start_date": start, "maturity_date": maturity, "next_payment_date": "2026-04-01", "type": "fixed"})

    return {
        "message": "Demo data seeded successfully",
        "seeded": True,
        "data": {
            "properties": len(properties_data),
            "units": len(units_data),
            "tenants": len(tenants_data),
            "leases": len(leases_data),
            "rent_payments": len(payments_data),
            "maintenance_requests": len(maintenance_data),
            "reminders": len(reminders_data),
            "expenses": len(expenses_data),
            "contractors": len(contractors_data),
            "applicants": len(applicants_data),
            "insurance": len(insurance_data),
            "mortgages": 2,
        },
    }


@api_router.post("/reset-demo-data")
async def reset_demo_data(current_user: dict = Depends(get_current_user)):
    """Delete all user data and re-run the demo seed"""
    user_id = current_user["id"]
    user_oid = str(current_user.get("_id", current_user["id"]))
    # Drop all user collections
    for collection in [db.properties, db.units, db.tenants, db.leases, db.rent_payments,
                       db.maintenance_requests, db.reminders, db.expenses, db.contractors,
                       db.applicants, db.notifications]:
        await collection.delete_many({"user_id": user_id})
    await db.mortgages.delete_many({"user_id": user_oid})
    await db.insurance.delete_many({"user_id": user_oid})
    # Re-run the seed
    return await seed_demo_data(current_user)

# ===========================
# EXPENSE ROUTES
# ===========================

@api_router.post("/expenses", response_model=Expense)
async def create_expense(data: ExpenseCreate, current_user: dict = Depends(get_current_user)):
    if data.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than 0")
    if data.category not in EXPENSE_CATEGORIES:
        raise HTTPException(status_code=400, detail=f"Invalid category. Must be one of: {', '.join(EXPENSE_CATEGORIES)}")
    # Verify property belongs to user
    prop = await db.properties.find_one({"id": data.property_id, "user_id": current_user["id"]})
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    expense = Expense(user_id=current_user["id"], **data.model_dump())
    await db.expenses.insert_one(expense.model_dump())
    return expense

@api_router.get("/expenses")
async def get_expenses(
    property_id: Optional[str] = None,
    month_year: Optional[str] = None,
    category: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query: dict = {"user_id": current_user["id"]}
    if property_id:
        query["property_id"] = property_id
    if month_year:
        query["expense_date"] = {"$regex": f"^{month_year}"}
    if category:
        query["category"] = category
    expenses = await db.expenses.find(query).sort("expense_date", -1).to_list(500)
    # Remove MongoDB _id
    for e in expenses:
        e.pop("_id", None)
    return expenses

@api_router.put("/expenses/{expense_id}", response_model=Expense)
async def update_expense(expense_id: str, data: ExpenseCreate, current_user: dict = Depends(get_current_user)):
    expense = await db.expenses.find_one({"id": expense_id, "user_id": current_user["id"]})
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    if data.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than 0")
    update_data = data.model_dump()
    update_data["updated_at"] = datetime.utcnow()
    await db.expenses.update_one({"id": expense_id}, {"$set": update_data})
    updated = await db.expenses.find_one({"id": expense_id})
    updated.pop("_id", None)
    return updated

@api_router.delete("/expenses/{expense_id}")
async def delete_expense(expense_id: str, current_user: dict = Depends(get_current_user)):
    expense = await db.expenses.find_one({"id": expense_id, "user_id": current_user["id"]})
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    await db.expenses.delete_one({"id": expense_id})
    return {"message": "Expense deleted"}

class ScanReceiptRequest(BaseModel):
    image_base64: str  # base64-encoded image

@api_router.post("/expenses/scan-receipt")
async def scan_receipt(data: ScanReceiptRequest, current_user: dict = Depends(get_current_user)):
    """Use Claude Vision (or mock) to extract expense data from a receipt photo."""
    openrouter_key = os.environ.get("OPENROUTER_API_KEY")

    if openrouter_key:
        try:
            import httpx
            # Detect image type from base64 header or default to jpeg
            img_data = data.image_base64
            if img_data.startswith("data:"):
                data_url = img_data  # already a full data URL
            else:
                data_url = f"data:image/jpeg;base64,{img_data}"

            async with httpx.AsyncClient(timeout=30) as http:
                resp = await http.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {openrouter_key}",
                        "Content-Type": "application/json",
                        "HTTP-Referer": "https://domely.ca",
                        "X-Title": "Domely AI",
                    },
                    json={
                        "model": "anthropic/claude-haiku-4-5",
                        "max_tokens": 512,
                        "messages": [{
                            "role": "user",
                            "content": [
                                {"type": "image_url", "image_url": {"url": data_url}},
                                {"type": "text", "text": (
                                    "You are analyzing a receipt or expense document. "
                                    "Extract the following fields and return ONLY valid JSON (no markdown, no explanation):\n"
                                    '{"title":"short description","amount":0.00,"date":"YYYY-MM-DD",'
                                    '"category":"one of [maintenance,insurance,property_tax,utilities,mortgage,cleaning,renovation,other]",'
                                    '"notes":"any extra details"}\n'
                                    "If a field cannot be determined, use null. For date, use today if not visible."
                                )}
                            ]
                        }],
                    },
                )
                resp.raise_for_status()
            text = resp.json()["choices"][0]["message"]["content"].strip()
            result = json.loads(text)
            # Sanitize
            if result.get("amount") and not isinstance(result["amount"], (int, float)):
                result["amount"] = float(str(result["amount"]).replace(",", ".").replace("$", ""))
            if not result.get("date"):
                result["date"] = datetime.now().strftime("%Y-%m-%d")
            if result.get("category") not in ["maintenance","insurance","property_tax","utilities","mortgage","cleaning","renovation","other"]:
                result["category"] = "other"
            return result
        except Exception as e:
            logging.error(f"OCR error: {e}")
            # Fall through to mock

    # Mock response for demo (no API key needed)
    mock_receipts = [
        {"title": "Réparation chauffe-eau", "amount": 285.00, "date": datetime.now().strftime("%Y-%m-%d"), "category": "maintenance", "notes": "Remplacement élément chauffant, main-d'œuvre incluse"},
        {"title": "Prime d'assurance habitation", "amount": 142.50, "date": datetime.now().strftime("%Y-%m-%d"), "category": "insurance", "notes": "Paiement mensuel assurance"},
        {"title": "Entretien ménager communs", "amount": 80.00, "date": datetime.now().strftime("%Y-%m-%d"), "category": "cleaning", "notes": "Nettoyage entrée et escaliers"},
        {"title": "Facture Hydro-Québec", "amount": 198.30, "date": datetime.now().strftime("%Y-%m-%d"), "category": "utilities", "notes": "Électricité parties communes"},
        {"title": "Peinture couloir", "amount": 320.00, "date": datetime.now().strftime("%Y-%m-%d"), "category": "renovation", "notes": "Main-d'œuvre + matériaux"},
    ]
    return random.choice(mock_receipts)


async def _get_financials_data(property_id: str, prop: dict, month_year: Optional[str], period: str):
    """Shared helper for financials data — used by both GET and export endpoints."""
    units = await db.units.find({"property_id": property_id}).to_list(100)
    total_units = len(units)
    occupied_units = sum(1 for u in units if u.get("is_occupied", False))
    occupancy_rate = round((occupied_units / total_units * 100) if total_units > 0 else 0, 1)
    monthly_expected_rent = sum(u.get("rent_amount", 0) for u in units if u.get("is_occupied", False))
    unit_ids = [u["id"] for u in units]

    if period == "ytd":
        current_year = datetime.now().year
        months_elapsed = datetime.now().month
        year_prefix = str(current_year)
        payments = await db.rent_payments.find({
            "unit_id": {"$in": unit_ids},
            "month_year": {"$regex": f"^{year_prefix}"}
        }).to_list(1000)
        collected_rent = sum(p.get("amount", 0) for p in payments)
        expenses = await db.expenses.find({
            "property_id": property_id,
            "expense_date": {"$regex": f"^{year_prefix}"}
        }).sort("expense_date", -1).to_list(1000)
        expected_rent = monthly_expected_rent * months_elapsed
        period_label = f"{current_year}-ytd"
    else:
        target_month = month_year or datetime.now().strftime("%Y-%m")
        payments = await db.rent_payments.find({
            "unit_id": {"$in": unit_ids},
            "month_year": target_month
        }).to_list(200)
        collected_rent = sum(p.get("amount", 0) for p in payments)
        expenses = await db.expenses.find({
            "property_id": property_id,
            "expense_date": {"$regex": f"^{target_month}"}
        }).sort("expense_date", -1).to_list(200)
        expected_rent = monthly_expected_rent
        period_label = target_month

    for e in expenses:
        e.pop("_id", None)
        if isinstance(e.get("created_at"), datetime):
            e["created_at"] = e["created_at"].isoformat()
        if isinstance(e.get("updated_at"), datetime):
            e["updated_at"] = e["updated_at"].isoformat()

    total_expenses = sum(e.get("amount", 0) for e in expenses)
    maintenance_expenses = sum(e.get("amount", 0) for e in expenses if e.get("category") == "maintenance")
    net_cash_flow = collected_rent - total_expenses
    expense_ratio = round((total_expenses / collected_rent) if collected_rent > 0 else 0, 2)

    return {
        "property_id": property_id,
        "property_name": prop["name"],
        "month_year": period_label,
        "period": period,
        "expected_rent": expected_rent,
        "collected_rent": collected_rent,
        "total_expenses": total_expenses,
        "maintenance_expenses": maintenance_expenses,
        "net_cash_flow": net_cash_flow,
        "occupancy_rate": occupancy_rate,
        "expense_ratio": expense_ratio,
        "expenses": expenses,
    }


@api_router.get("/properties/{property_id}/financials/export")
async def export_property_financials(
    property_id: str,
    month_year: Optional[str] = None,
    period: str = "monthly",
    current_user: dict = Depends(get_current_user)
):
    from fastapi.responses import StreamingResponse
    import csv, io
    prop = await db.properties.find_one({"id": property_id, "user_id": current_user["id"]})
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")

    data = await _get_financials_data(property_id, prop, month_year, period)

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Property", data["property_name"]])
    writer.writerow(["Period", data["month_year"]])
    writer.writerow([])
    writer.writerow(["Expected Rent", data["expected_rent"]])
    writer.writerow(["Collected Rent", data["collected_rent"]])
    writer.writerow(["Total Expenses", data["total_expenses"]])
    writer.writerow(["Net Cash Flow", data["net_cash_flow"]])
    writer.writerow(["Occupancy Rate", f"{data['occupancy_rate']}%"])
    writer.writerow([])
    writer.writerow(["Title", "Category", "Date", "Amount", "Notes"])
    for e in data["expenses"]:
        writer.writerow([e["title"], e["category"], e["expense_date"], e["amount"], e.get("notes", "")])

    output.seek(0)
    filename = f"plexio-{property_id}-{data['month_year']}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@api_router.get("/properties/{property_id}/financials")
async def get_property_financials(
    property_id: str,
    month_year: Optional[str] = None,
    period: str = "monthly",
    current_user: dict = Depends(get_current_user)
):
    prop = await db.properties.find_one({"id": property_id, "user_id": current_user["id"]})
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")

    return await _get_financials_data(property_id, prop, month_year, period)

# ===========================
# INSIGHTS ROUTES
# ===========================

class PropertyPerformance(BaseModel):
    property_id: str
    property_name: str
    property_type: str
    total_units: int
    occupied_units: int
    occupancy_rate: float
    rent_collected: float
    rent_expected: float
    collection_rate: float
    maintenance_expenses: float
    open_issues: int
    estimated_profit: float

class InsightAlert(BaseModel):
    id: str
    type: str  # late_rent, maintenance_cost, lease_expiry, vacancy
    severity: str  # info, warning, critical
    title: str
    description: str
    related_id: Optional[str] = None
    action_label: Optional[str] = None

class InsightRecommendation(BaseModel):
    id: str
    type: str
    title: str
    description: str
    priority: str  # high, medium, low
    action_label: str
    related_id: Optional[str] = None

class PortfolioInsights(BaseModel):
    # Portfolio Overview
    total_rent_collected: float
    total_rent_expected: float
    collection_rate: float
    maintenance_expenses: float
    net_cash_flow: float
    occupancy_rate: float
    total_properties: int
    total_units: int
    occupied_units: int
    vacant_units: int
    current_month: str
    
    # Property Performance
    property_performance: List[PropertyPerformance]
    
    # Alerts and Warnings
    alerts: List[InsightAlert]
    
    # Recommendations
    recommendations: List[InsightRecommendation]

@api_router.get("/insights", response_model=PortfolioInsights)
async def get_insights(current_user: dict = Depends(get_current_user)):
    """Get comprehensive portfolio insights"""
    user_id = current_user["id"]
    current_month = datetime.now().strftime("%Y-%m")
    today = datetime.now()
    
    # Get all properties
    properties = await db.properties.find({"user_id": user_id}).to_list(100)
    property_ids = [p["id"] for p in properties]
    
    # Get all units
    units = await db.units.find({"property_id": {"$in": property_ids}}).to_list(100)
    total_units = len(units)
    occupied_units = sum(1 for u in units if u.get("is_occupied", False))
    vacant_units = total_units - occupied_units
    
    # Calculate portfolio-level metrics
    total_rent_expected = sum(u.get("rent_amount", 0) for u in units if u.get("is_occupied", False))
    
    unit_ids = [u["id"] for u in units]
    payments = await db.rent_payments.find({
        "unit_id": {"$in": unit_ids},
        "month_year": current_month
    }).to_list(100)
    total_rent_collected = sum(p.get("amount", 0) for p in payments)
    
    # Get maintenance expenses (completed maintenance with costs this month)
    maintenance_requests = await db.maintenance_requests.find({
        "user_id": user_id
    }).to_list(500)
    
    # Calculate total maintenance expenses from completed requests
    maintenance_expenses = sum(
        m.get("cost", 0) or 0 
        for m in maintenance_requests 
        if m.get("cost") and m.get("status") in ["completed", "in_progress"]
    )
    
    collection_rate = (total_rent_collected / total_rent_expected * 100) if total_rent_expected > 0 else 0
    occupancy_rate = (occupied_units / total_units * 100) if total_units > 0 else 0
    net_cash_flow = total_rent_collected - maintenance_expenses
    
    # Calculate property performance
    property_performance = []
    for prop in properties:
        prop_units = [u for u in units if u["property_id"] == prop["id"]]
        prop_unit_ids = [u["id"] for u in prop_units]
        
        prop_total_units = len(prop_units)
        prop_occupied = sum(1 for u in prop_units if u.get("is_occupied", False))
        prop_occupancy = (prop_occupied / prop_total_units * 100) if prop_total_units > 0 else 0
        
        prop_rent_expected = sum(u.get("rent_amount", 0) for u in prop_units if u.get("is_occupied", False))
        prop_payments = [p for p in payments if p["unit_id"] in prop_unit_ids]
        prop_rent_collected = sum(p.get("amount", 0) for p in prop_payments)
        prop_collection_rate = (prop_rent_collected / prop_rent_expected * 100) if prop_rent_expected > 0 else 0
        
        prop_maintenance = [m for m in maintenance_requests if m["property_id"] == prop["id"]]
        prop_expenses = sum(m.get("cost", 0) or 0 for m in prop_maintenance if m.get("cost") and m.get("status") in ["completed", "in_progress"])
        prop_open_issues = sum(1 for m in prop_maintenance if m.get("status") in ["open", "in_progress"])
        
        prop_profit = prop_rent_collected - prop_expenses
        
        property_performance.append(PropertyPerformance(
            property_id=prop["id"],
            property_name=prop["name"],
            property_type=prop.get("property_type", "other"),
            total_units=prop_total_units,
            occupied_units=prop_occupied,
            occupancy_rate=round(prop_occupancy, 1),
            rent_collected=prop_rent_collected,
            rent_expected=prop_rent_expected,
            collection_rate=round(prop_collection_rate, 1),
            maintenance_expenses=prop_expenses,
            open_issues=prop_open_issues,
            estimated_profit=prop_profit
        ))
    
    # Generate alerts
    alerts = []
    alert_counter = 0
    
    # Late rent alerts
    active_leases = await db.leases.find({
        "user_id": user_id,
        "is_active": True
    }).to_list(100)
    
    late_tenants = []
    for lease in active_leases:
        payment = await db.rent_payments.find_one({
            "tenant_id": lease["tenant_id"],
            "month_year": current_month
        })
        if not payment and today.day > lease.get("payment_due_day", 1):
            tenant = await db.tenants.find_one({"id": lease["tenant_id"]})
            if tenant:
                late_tenants.append(tenant)
    
    if late_tenants:
        alert_counter += 1
        days_late = today.day - 1  # Assuming due on 1st
        severity = "critical" if days_late > 7 else "warning"
        alerts.append(InsightAlert(
            id=f"alert_{alert_counter}",
            type="late_rent",
            severity=severity,
            title=f"{len(late_tenants)} tenant{'s' if len(late_tenants) > 1 else ''} with late rent",
            description=f"${sum(l.get('rent_amount', 0) for l in active_leases if any(t['id'] == l['tenant_id'] for t in late_tenants)):,.0f} overdue for {current_month}",
            action_label="View Tenants"
        ))
    
    # High maintenance costs alert
    if maintenance_expenses > total_rent_collected * 0.3 and maintenance_expenses > 0:
        alert_counter += 1
        alerts.append(InsightAlert(
            id=f"alert_{alert_counter}",
            type="maintenance_cost",
            severity="warning",
            title="High maintenance expenses",
            description=f"Maintenance costs (${maintenance_expenses:,.0f}) are {(maintenance_expenses/total_rent_collected*100):.0f}% of collected rent",
            action_label="Review Issues"
        ))
    
    # Expiring leases alert
    future_60 = (today + timedelta(days=60)).strftime("%Y-%m-%d")
    today_str = today.strftime("%Y-%m-%d")
    
    expiring_leases = await db.leases.find({
        "user_id": user_id,
        "is_active": True,
        "end_date": {"$lte": future_60, "$gte": today_str}
    }).to_list(100)
    
    if expiring_leases:
        alert_counter += 1
        soonest = min(expiring_leases, key=lambda x: x["end_date"])
        days_until = (datetime.strptime(soonest["end_date"], "%Y-%m-%d").date() - today.date()).days
        severity = "critical" if days_until <= 14 else "warning" if days_until <= 30 else "info"
        alerts.append(InsightAlert(
            id=f"alert_{alert_counter}",
            type="lease_expiry",
            severity=severity,
            title=f"{len(expiring_leases)} lease{'s' if len(expiring_leases) > 1 else ''} expiring soon",
            description=f"Soonest expires in {days_until} days",
            action_label="View Leases"
        ))
    
    # Vacancy alert
    if vacant_units > 0:
        alert_counter += 1
        vacancy_rate = (vacant_units / total_units * 100) if total_units > 0 else 0
        potential_loss = sum(u.get("rent_amount", 0) for u in units if not u.get("is_occupied", False))
        severity = "critical" if vacancy_rate > 30 else "warning" if vacancy_rate > 15 else "info"
        alerts.append(InsightAlert(
            id=f"alert_{alert_counter}",
            type="vacancy",
            severity=severity,
            title=f"{vacant_units} vacant unit{'s' if vacant_units > 1 else ''}",
            description=f"Potential monthly income loss: ${potential_loss:,.0f}",
            action_label="View Properties"
        ))
    
    # Open maintenance issues
    open_issues = [m for m in maintenance_requests if m.get("status") in ["open", "in_progress"]]
    high_priority_issues = [m for m in open_issues if m.get("priority") in ["high", "urgent"]]
    
    if high_priority_issues:
        alert_counter += 1
        alerts.append(InsightAlert(
            id=f"alert_{alert_counter}",
            type="maintenance_urgent",
            severity="warning",
            title=f"{len(high_priority_issues)} high priority issue{'s' if len(high_priority_issues) > 1 else ''}",
            description=f"{len(open_issues)} total open maintenance requests",
            action_label="View Issues"
        ))
    
    # Generate recommendations
    recommendations = []
    rec_counter = 0
    
    # Follow up on late tenants
    if late_tenants:
        for tenant in late_tenants[:3]:  # Top 3
            rec_counter += 1
            recommendations.append(InsightRecommendation(
                id=f"rec_{rec_counter}",
                type="late_rent",
                title=f"Follow up with {tenant['first_name']} {tenant['last_name']}",
                description="Rent payment is overdue. Consider sending a reminder.",
                priority="high",
                action_label="Contact Tenant",
                related_id=tenant["id"]
            ))
    
    # Review units with frequent issues
    unit_issue_count = {}
    for m in maintenance_requests:
        if m.get("unit_id"):
            unit_issue_count[m["unit_id"]] = unit_issue_count.get(m["unit_id"], 0) + 1
    
    problematic_units = [(uid, count) for uid, count in unit_issue_count.items() if count >= 2]
    for uid, count in sorted(problematic_units, key=lambda x: -x[1])[:2]:
        unit = next((u for u in units if u["id"] == uid), None)
        if unit:
            prop = next((p for p in properties if p["id"] == unit["property_id"]), None)
            if prop:
                rec_counter += 1
                recommendations.append(InsightRecommendation(
                    id=f"rec_{rec_counter}",
                    type="maintenance",
                    title=f"Review Unit {unit['unit_number']} at {prop['name']}",
                    description=f"This unit has had {count} maintenance issues. Consider inspection.",
                    priority="medium",
                    action_label="View Unit",
                    related_id=uid
                ))
    
    # Lease renewals
    for lease in expiring_leases[:3]:
        tenant = await db.tenants.find_one({"id": lease["tenant_id"]})
        if tenant:
            days_until = (datetime.strptime(lease["end_date"], "%Y-%m-%d").date() - today.date()).days
            rec_counter += 1
            recommendations.append(InsightRecommendation(
                id=f"rec_{rec_counter}",
                type="lease_renewal",
                title=f"Discuss renewal with {tenant['first_name']} {tenant['last_name']}",
                description=f"Lease expires in {days_until} days. Start renewal conversation.",
                priority="high" if days_until <= 30 else "medium",
                action_label="View Lease",
                related_id=lease["id"]
            ))
    
    # Fill vacancies
    if vacant_units > 0:
        for unit in [u for u in units if not u.get("is_occupied", False)][:2]:
            prop = next((p for p in properties if p["id"] == unit["property_id"]), None)
            if prop:
                rec_counter += 1
                recommendations.append(InsightRecommendation(
                    id=f"rec_{rec_counter}",
                    type="vacancy",
                    title=f"List Unit {unit['unit_number']} at {prop['name']}",
                    description=f"Vacant unit at ${unit.get('rent_amount', 0):,.0f}/month. Consider listing.",
                    priority="medium",
                    action_label="View Unit",
                    related_id=unit["id"]
                ))
    
    return PortfolioInsights(
        total_rent_collected=total_rent_collected,
        total_rent_expected=total_rent_expected,
        collection_rate=round(collection_rate, 1),
        maintenance_expenses=maintenance_expenses,
        net_cash_flow=net_cash_flow,
        occupancy_rate=round(occupancy_rate, 1),
        total_properties=len(properties),
        total_units=total_units,
        occupied_units=occupied_units,
        vacant_units=vacant_units,
        current_month=current_month,
        property_performance=property_performance,
        alerts=alerts,
        recommendations=recommendations
    )

# ===========================
# VACANCY LOSS TRACKING
# ===========================

@api_router.get("/vacancy/losses")
async def get_vacancy_losses(current_user: dict = Depends(get_current_user)):
    """Get revenue loss breakdown for all vacant units"""
    uid = current_user["id"]
    props = await db.properties.find({"user_id": uid}).to_list(200)

    result = []
    total_daily_loss = 0.0
    total_loss_mtd = 0.0

    today = datetime.utcnow()
    month_start = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    for prop in props:
        prop_id = prop.get("id", "")
        units = await db.units.find({"property_id": prop_id}).to_list(100)

        for unit in units:
            unit.pop("_id", None)
            status = unit.get("status", "vacant")
            # Also check is_occupied flag as a fallback
            is_occupied = unit.get("is_occupied", True)
            if status != "vacant" and is_occupied:
                continue

            # Determine daily rent for this unit
            last_lease = await db.leases.find_one(
                {"unit_id": unit.get("id", ""), "property_id": prop_id},
                sort=[("end_date", -1)]
            )

            daily_rent = 0.0
            if last_lease and last_lease.get("rent_amount"):
                daily_rent = float(last_lease["rent_amount"]) / 30
            elif unit.get("rent_amount"):
                daily_rent = float(unit["rent_amount"]) / 30
            elif prop.get("rent_amount"):
                daily_rent = float(prop["rent_amount"]) / 30

            if daily_rent == 0:
                continue

            # Days vacant
            vacant_since_str = unit.get("vacant_since") or (last_lease.get("end_date") if last_lease else None)
            if vacant_since_str:
                try:
                    vacant_since = datetime.strptime(str(vacant_since_str)[:10], "%Y-%m-%d")
                    days_vacant = max(0, (today - vacant_since).days)
                    days_this_month = max(0, (today - max(month_start, vacant_since)).days)
                except Exception:
                    days_vacant = 0
                    days_this_month = 0
            else:
                days_vacant = 0
                days_this_month = 0

            total_loss = days_vacant * daily_rent
            mtd_loss = days_this_month * daily_rent

            total_daily_loss += daily_rent
            total_loss_mtd += mtd_loss

            result.append({
                "unit_id": unit.get("id", ""),
                "unit_number": unit.get("unit_number") or unit.get("name", "—"),
                "property_id": prop_id,
                "property_name": prop.get("name", "—"),
                "daily_loss": round(daily_rent, 2),
                "days_vacant": days_vacant,
                "total_loss": round(total_loss, 2),
                "mtd_loss": round(mtd_loss, 2),
                "vacant_since": str(vacant_since_str)[:10] if vacant_since_str else None,
            })

    return {
        "units": result,
        "total_daily_loss": round(total_daily_loss, 2),
        "total_loss_mtd": round(total_loss_mtd, 2),
        "total_vacant_units": len(result),
    }

# ===========================
# PROPERTY HEALTH SCORE
# ===========================

class HealthScoreBreakdown(BaseModel):
    rent_collection: float = 0      # out of 25
    occupancy: float = 0            # out of 20
    maintenance: float = 0          # out of 15
    lease_stability: float = 0      # out of 20
    financial_performance: float = 0 # out of 20

class PropertyHealthScore(BaseModel):
    property_id: str
    property_name: str
    property_type: str
    score: int  # 0-100
    status: str  # healthy, moderate, at_risk
    breakdown: HealthScoreBreakdown
    total_units: int
    occupied_units: int
    open_issues: int
    collection_rate: float
    days_to_nearest_expiry: Optional[int] = None

class HealthScoreResponse(BaseModel):
    properties: List[PropertyHealthScore]
    portfolio_average: int
    portfolio_status: str

@api_router.get("/property-health-scores", response_model=HealthScoreResponse)
async def get_property_health_scores(current_user: dict = Depends(get_current_user)):
    """Calculate health scores for all properties"""
    user_id = current_user["id"]
    current_month = datetime.now().strftime("%Y-%m")
    today = datetime.now()

    properties = await db.properties.find({"user_id": user_id}).to_list(100)
    if not properties:
        return HealthScoreResponse(properties=[], portfolio_average=0, portfolio_status="healthy")

    all_units = await db.units.find({"property_id": {"$in": [p["id"] for p in properties]}}).to_list(500)
    all_unit_ids = [u["id"] for u in all_units]

    all_payments = await db.rent_payments.find({
        "unit_id": {"$in": all_unit_ids},
        "month_year": current_month
    }).to_list(500)

    all_maintenance = await db.maintenance_requests.find({
        "user_id": user_id
    }).to_list(500)

    all_leases = await db.leases.find({
        "user_id": user_id,
        "is_active": True
    }).to_list(500)

    results = []

    for prop in properties:
        prop_units = [u for u in all_units if u["property_id"] == prop["id"]]
        prop_unit_ids = [u["id"] for u in prop_units]
        total_units = len(prop_units)

        if total_units == 0:
            results.append(PropertyHealthScore(
                property_id=prop["id"],
                property_name=prop["name"],
                property_type=prop.get("property_type", "other"),
                score=50,
                status="moderate",
                breakdown=HealthScoreBreakdown(),
                total_units=0,
                occupied_units=0,
                open_issues=0,
                collection_rate=0,
                days_to_nearest_expiry=None,
            ))
            continue

        occupied = sum(1 for u in prop_units if u.get("is_occupied", False))

        # --- 1. Rent Collection Stability (25 pts) ---
        rent_expected = sum(u.get("rent_amount", 0) for u in prop_units if u.get("is_occupied", False))
        prop_payments = [p for p in all_payments if p["unit_id"] in prop_unit_ids]
        rent_collected = sum(p.get("amount", 0) for p in prop_payments)
        collection_rate = (rent_collected / rent_expected * 100) if rent_expected > 0 else 100
        rent_score = min(25, round(collection_rate / 100 * 25, 1))

        # --- 2. Occupancy Rate (20 pts) ---
        occupancy_rate = (occupied / total_units * 100)
        occupancy_score = min(20, round(occupancy_rate / 100 * 20, 1))

        # --- 3. Maintenance Health (15 pts) ---
        prop_maintenance = [m for m in all_maintenance if m["property_id"] == prop["id"]]
        open_issues = sum(1 for m in prop_maintenance if m.get("status") in ["open", "in_progress"])
        high_priority = sum(1 for m in prop_maintenance if m.get("status") in ["open", "in_progress"] and m.get("priority") in ["high", "urgent"])

        # Deductions: -3 per open issue, -2 extra for high/urgent
        maintenance_deduction = min(15, (open_issues * 3) + (high_priority * 2))
        maintenance_score = max(0, 15 - maintenance_deduction)

        # --- 4. Lease Stability (20 pts) ---
        prop_leases = [l for l in all_leases if l["unit_id"] in prop_unit_ids]
        lease_coverage = (len(prop_leases) / total_units * 100) if total_units > 0 else 0

        # Base score from coverage
        lease_base = min(12, round(lease_coverage / 100 * 12, 1))

        # Bonus for lease time remaining (up to 8 pts)
        days_to_expiry_list = []
        lease_time_score = 8.0  # start full, deduct
        for lease in prop_leases:
            try:
                end = datetime.strptime(lease["end_date"], "%Y-%m-%d").date()
                days_left = (end - today.date()).days
                days_to_expiry_list.append(days_left)
                if days_left < 0:
                    lease_time_score -= 4  # expired lease
                elif days_left <= 30:
                    lease_time_score -= 2.5  # expiring very soon
                elif days_left <= 60:
                    lease_time_score -= 1  # expiring soon
            except (ValueError, KeyError):
                pass

        lease_time_score = max(0, min(8, lease_time_score))
        lease_stability_score = lease_base + lease_time_score

        nearest_expiry = min(days_to_expiry_list) if days_to_expiry_list else None

        # --- 5. Financial Performance (20 pts) ---
        prop_expenses = await db.expenses.find({
            "property_id": prop["id"],
            "expense_date": {"$regex": f"^{current_month}"}
        }).to_list(200)
        total_expenses = sum(e.get("amount", 0) for e in prop_expenses)
        net_cash_flow = rent_collected - total_expenses

        if rent_expected == 0:
            financial_score = 10.0  # no units, neutral
        elif rent_collected == 0:
            if total_expenses == 0:
                financial_score = 10.0
            else:
                financial_score = max(0.0, 5.0 - min(5.0, total_expenses / 200))
        else:
            expense_ratio = total_expenses / rent_collected
            if net_cash_flow > 0:
                if expense_ratio <= 0.3:
                    financial_score = 20.0
                elif expense_ratio <= 0.5:
                    financial_score = 17.0
                elif expense_ratio <= 0.7:
                    financial_score = 13.0
                else:
                    financial_score = 9.0
            elif net_cash_flow == 0:
                financial_score = 8.0
            else:
                loss_ratio = abs(net_cash_flow) / max(rent_collected, 1)
                financial_score = max(0.0, 6.0 - round(loss_ratio * 8, 1))

        financial_score = round(min(20.0, max(0.0, financial_score)), 1)

        # --- Total Score ---
        total_score = round(rent_score + occupancy_score + maintenance_score + lease_stability_score + financial_score)
        total_score = max(0, min(100, total_score))

        if total_score >= 70:
            status = "healthy"
        elif total_score >= 40:
            status = "moderate"
        else:
            status = "at_risk"

        results.append(PropertyHealthScore(
            property_id=prop["id"],
            property_name=prop["name"],
            property_type=prop.get("property_type", "other"),
            score=total_score,
            status=status,
            breakdown=HealthScoreBreakdown(
                rent_collection=rent_score,
                occupancy=occupancy_score,
                maintenance=maintenance_score,
                lease_stability=round(lease_stability_score, 1),
                financial_performance=financial_score,
            ),
            total_units=total_units,
            occupied_units=occupied,
            open_issues=open_issues,
            collection_rate=round(collection_rate, 1),
            days_to_nearest_expiry=nearest_expiry,
        ))

    # Portfolio average
    if results:
        avg_score = round(sum(r.score for r in results) / len(results))
    else:
        avg_score = 0

    if avg_score >= 70:
        portfolio_status = "healthy"
    elif avg_score >= 40:
        portfolio_status = "moderate"
    else:
        portfolio_status = "at_risk"

    return HealthScoreResponse(
        properties=results,
        portfolio_average=avg_score,
        portfolio_status=portfolio_status,
    )

# ===========================
# UNIT TIMELINE
# ===========================

class TimelineEvent(BaseModel):
    id: str
    event_type: str  # lease_created, tenant_move_in, rent_payment, late_payment, maintenance_opened, maintenance_completed, lease_renewal
    date: str
    title: str
    description: str
    icon: str  # frontend icon name
    color: str  # hex color for the dot/icon

class UnitTimelineResponse(BaseModel):
    unit_id: str
    unit_number: str
    property_name: str
    events: List[TimelineEvent]

@api_router.get("/units/{unit_id}/timeline", response_model=UnitTimelineResponse)
async def get_unit_timeline(unit_id: str, current_user: dict = Depends(get_current_user)):
    """Get chronological timeline of events for a unit"""
    user_id = current_user["id"]

    # Verify unit belongs to user
    unit = await db.units.find_one({"id": unit_id})
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")

    prop = await db.properties.find_one({"id": unit["property_id"], "user_id": user_id})
    if not prop:
        raise HTTPException(status_code=403, detail="Not authorized")

    events: list = []

    # 1. Leases (lease creation, tenant move-in, lease renewal)
    leases = await db.leases.find({"unit_id": unit_id}).to_list(50)
    tenants_cache = {}

    for lease in leases:
        tenant_name = "Unknown"
        if lease.get("tenant_id"):
            if lease["tenant_id"] not in tenants_cache:
                tenant = await db.tenants.find_one({"id": lease["tenant_id"]})
                if tenant:
                    tenants_cache[lease["tenant_id"]] = f"{tenant.get('first_name', '')} {tenant.get('last_name', '')}"
            tenant_name = tenants_cache.get(lease["tenant_id"], "Unknown")

        # Lease created event
        events.append(TimelineEvent(
            id=f"lease-{lease['id']}",
            event_type="lease_created",
            date=lease.get("start_date", lease.get("created_at", "")),
            title="Lease Created",
            description=f"New lease signed with {tenant_name}. Rent: ${lease.get('rent_amount', 0)}/mo",
            icon="document-text",
            color="#1A8FC4",
        ))

        # Tenant move-in event (same as lease start)
        events.append(TimelineEvent(
            id=f"movein-{lease['id']}",
            event_type="tenant_move_in",
            date=lease.get("start_date", ""),
            title=f"{tenant_name} Moved In",
            description=f"Tenant moved into Unit {unit.get('unit_number', '')}",
            icon="person-add",
            color="#00C48C",
        ))

        # If lease is not active and has end date, add move-out or renewal
        if not lease.get("is_active", True) and lease.get("end_date"):
            events.append(TimelineEvent(
                id=f"leaseend-{lease['id']}",
                event_type="lease_renewal",
                date=lease["end_date"],
                title="Lease Ended",
                description=f"Lease for {tenant_name} concluded",
                icon="document",
                color="#6B7D93",
            ))

    # 2. Rent Payments
    payments = await db.rent_payments.find({"unit_id": unit_id}).to_list(200)
    for pay in payments:
        # Determine if late (payment after the 5th of month)
        is_late = False
        try:
            pay_date = datetime.strptime(pay.get("payment_date", ""), "%Y-%m-%d")
            if pay_date.day > 5:
                is_late = True
        except (ValueError, KeyError):
            pass

        tenant_name = "Tenant"
        if pay.get("tenant_id") and pay["tenant_id"] in tenants_cache:
            tenant_name = tenants_cache[pay["tenant_id"]]
        elif pay.get("tenant_id"):
            tenant = await db.tenants.find_one({"id": pay["tenant_id"]})
            if tenant:
                tenant_name = f"{tenant.get('first_name', '')} {tenant.get('last_name', '')}"
                tenants_cache[pay["tenant_id"]] = tenant_name

        if is_late:
            events.append(TimelineEvent(
                id=f"latepay-{pay['id']}",
                event_type="late_payment",
                date=pay.get("payment_date", ""),
                title="Late Payment Received",
                description=f"{tenant_name} paid ${pay.get('amount', 0)} for {pay.get('month_year', '')} (late)",
                icon="alert-circle",
                color="#F5A623",
            ))
        else:
            events.append(TimelineEvent(
                id=f"pay-{pay['id']}",
                event_type="rent_payment",
                date=pay.get("payment_date", ""),
                title="Rent Payment Received",
                description=f"{tenant_name} paid ${pay.get('amount', 0)} for {pay.get('month_year', '')}",
                icon="cash",
                color="#00C48C",
            ))

    # 3. Maintenance Requests
    maint_requests = await db.maintenance_requests.find({
        "property_id": unit["property_id"],
        "$or": [
            {"unit_id": unit_id},
            {"unit_id": None},
            {"unit_id": ""},
        ]
    }).to_list(100)

    for maint in maint_requests:
        # Only include if unit matches or no unit specified
        if maint.get("unit_id") and maint["unit_id"] != unit_id:
            continue

        # Convert datetime to string if needed
        created_at = maint.get("created_at", "")
        if isinstance(created_at, datetime):
            created_at = created_at.isoformat()
        
        events.append(TimelineEvent(
            id=f"maint-open-{maint['id']}",
            event_type="maintenance_opened",
            date=created_at,
            title="Issue Reported",
            description=f"{maint.get('title', 'Maintenance issue')}: {maint.get('description', '')[:80]}",
            icon="construct",
            color="#E85D5D",
        ))

        if maint.get("status") == "completed" and maint.get("updated_at"):
            # Convert datetime to string if needed
            updated_at = maint.get("updated_at", maint.get("created_at", ""))
            if isinstance(updated_at, datetime):
                updated_at = updated_at.isoformat()
            
            events.append(TimelineEvent(
                id=f"maint-done-{maint['id']}",
                event_type="maintenance_completed",
                date=updated_at,
                title="Repair Completed",
                description=f"Resolved: {maint.get('title', '')}",
                icon="checkmark-circle",
                color="#00C48C",
            ))

    # Sort by date descending (newest first)
    def sort_key(e):
        try:
            # Try to parse full ISO datetime first
            if 'T' in e.date:
                return datetime.fromisoformat(e.date.replace('Z', '+00:00'))
            else:
                # Parse just the date part
                return datetime.strptime(e.date[:10], "%Y-%m-%d")
        except (ValueError, IndexError):
            return datetime(2000, 1, 1)

    events.sort(key=sort_key, reverse=True)

    return UnitTimelineResponse(
        unit_id=unit_id,
        unit_number=unit.get("unit_number", ""),
        property_name=prop.get("name", ""),
        events=events,
    )

# ===========================
# AI CHAT
# ===========================

class AIChatMessage(BaseModel):
    role: str  # 'user' | 'assistant'
    content: str

class AIChatRequest(BaseModel):
    messages: List[AIChatMessage]
    context: Optional[str] = "home"

AI_LIMITS = {"free": 20, "pro": 150, "admin": 9999}
AI_SCOPE_KEYWORDS = [
    "loyer","locataire","bail","propriété","immeuble","logement","unité","maintenance",
    "réparation","inspection","dépense","assurance","hypothèque","vacance","charges",
    "revenu","cash flow","taux","hausse","renouvellement","résiliation","expulsion",
    "rent","tenant","lease","property","unit","maintenance","repair","inspection",
    "expense","insurance","mortgage","vacancy","income","revenue","increase","renewal",
    "eviction","landlord","building","real estate","investment","portfolio","finance",
    "tribunal","tal","ltb","régie","notice","avis","legal","loi","law","regulation",
]

def _is_on_topic(message: str) -> bool:
    """Return True if the message touches rental/real-estate topics."""
    lower = message.lower()
    return any(kw in lower for kw in AI_SCOPE_KEYWORDS)

@api_router.post("/ai/chat")
async def ai_chat(data: AIChatRequest, current_user: dict = Depends(get_current_user)):
    """Real AI chat powered by Claude. Receives conversation history + screen context,
    fetches the user's live portfolio data, and returns a grounded assistant response."""

    openrouter_key = os.environ.get("OPENROUTER_API_KEY")
    if not openrouter_key or openrouter_key.startswith("sk-or-your-key"):
        return {"response": "Domely AI n'est pas encore configuré. Veuillez contacter l'équipe Domely. / Domely AI is not yet configured. Please contact the Domely team."}

    # ── 1. Rate limit check ───────────────────────────────────────────────────
    user_id   = current_user["id"]
    user_plan = current_user.get("plan", "free")
    month_key = datetime.now().strftime("%Y-%m")
    limit     = AI_LIMITS.get(user_plan, AI_LIMITS["free"])

    usage_doc = await db.ai_usage.find_one({"user_id": user_id, "month": month_key})
    used = usage_doc["count"] if usage_doc else 0

    if used >= limit:
        over_fr = f"Vous avez atteint votre limite de {limit} questions IA ce mois-ci."
        over_en = f"You've reached your {limit}-question AI limit for this month."
        upgrade  = " Passez au plan Pro pour continuer. / Upgrade to Pro to continue." if user_plan == "free" else ""
        return {"response": over_fr + " / " + over_en + upgrade, "limit_reached": True, "used": used, "limit": limit}

    # ── 2. Topic guard ────────────────────────────────────────────────────────
    last_user_msg = next((m.content for m in reversed(data.messages) if m.role == "user"), "")
    if last_user_msg and not _is_on_topic(last_user_msg):
        off_fr = "Je suis Domely AI, spécialisé en gestion locative et immobilier. Je ne peux pas répondre à cette question."
        off_en = "I'm Domely AI, specialized in rental management and real estate. I can't answer that question."
        return {"response": f"{off_fr}\n\n{off_en}", "off_topic": True}

    user_id = current_user["id"]
    current_month = datetime.now().strftime("%Y-%m")

    # ── Fetch live portfolio context ──────────────────────────────────────────
    properties = await db.properties.find({"user_id": user_id}).to_list(50)
    all_unit_ids = []
    portfolio_lines = []

    for prop in properties:
        units = await db.units.find({"property_id": prop["id"]}).to_list(50)
        all_unit_ids.extend(u["id"] for u in units)
        occupied = sum(1 for u in units if u.get("is_occupied"))
        portfolio_lines.append(
            f"- {prop['name']} ({prop.get('address', '')}) : {len(units)} logements, {occupied} occupés"
        )

    payments = await db.rent_payments.find({
        "unit_id": {"$in": all_unit_ids},
        "month_year": current_month,
    }).to_list(200)
    collected = sum(p.get("amount", 0) for p in payments)

    leases = await db.leases.find({"unit_id": {"$in": all_unit_ids}, "is_active": True}).to_list(100)
    today = datetime.now().date()
    expiring_soon = [
        l for l in leases
        if l.get("end_date") and (
            datetime.strptime(l["end_date"], "%Y-%m-%d").date() - today
        ).days <= 60
    ]

    maintenance_open = await db.maintenance.find({
        "property_id": {"$in": [p["id"] for p in properties]},
        "status": {"$in": ["open", "in_progress"]},
    }).to_list(50)

    # ── System prompt ─────────────────────────────────────────────────────────
    system_prompt = f"""You are Domely AI, the intelligent assistant built into the Domely rental management platform.
You help landlords and real estate investors manage their properties in North America (Canada and USA).
You have real-time access to the user's portfolio data shown below.

LIVE PORTFOLIO DATA (as of {datetime.now().strftime("%B %Y")}):

Properties:
{chr(10).join(portfolio_lines) if portfolio_lines else "No properties found."}

Rent this month: ${collected:,.0f} collected
Active leases expiring in 60 days: {len(expiring_soon)}
Open maintenance requests: {len(maintenance_open)}

INSTRUCTIONS:
- Always answer in the same language the user writes in (French or English)
- Be concise, practical, and specific to their portfolio data
- Use bullet points for lists; keep responses under 200 words
- Never make up data you don't have access to
- If asked about legal matters, reference Canadian landlord-tenant law (TAL for Quebec, LTB for Ontario)
- You can suggest next steps, generate draft messages, or explain regulations
- Current screen context: {data.context}

SCOPE RESTRICTION (strictly enforced):
- You ONLY answer questions related to: rental property management, tenants, leases, rent, maintenance, expenses, real estate investment, landlord-tenant law, vacancy, and finances related to the user's portfolio.
- If the user asks anything outside this scope (coding, general knowledge, recipes, jokes, creative writing, etc.), respond ONLY with: "Je suis Domely AI, spécialisé en gestion locative. Je ne peux pas répondre à cela. / I'm Domely AI, specialized in rental management. I can't answer that."
- Never break character or pretend to be a general assistant.
"""

    # ── Call via OpenRouter (OpenAI-compatible) ───────────────────────────────
    try:
        import httpx
        # Trim to last 6 messages to control token spend
        trimmed_messages = data.messages[-6:]
        messages_payload = [{"role": "system", "content": system_prompt}] + [
            {"role": m.role, "content": m.content} for m in trimmed_messages
        ]
        async with httpx.AsyncClient(timeout=30) as http:
            resp = await http.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {openrouter_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://domely.ca",
                    "X-Title": "Domely AI",
                },
                json={
                    "model": "anthropic/claude-haiku-4-5",
                    "max_tokens": 600,
                    "messages": messages_payload,
                },
            )
            resp.raise_for_status()
            answer = resp.json()["choices"][0]["message"]["content"]

        # ── Increment usage counter ───────────────────────────────────────────
        await db.ai_usage.update_one(
            {"user_id": user_id, "month": month_key},
            {"$inc": {"count": 1}, "$setOnInsert": {"user_id": user_id, "month": month_key}},
            upsert=True,
        )

        return {
            "response": answer,
            "used": used + 1,
            "limit": limit,
        }

    except Exception as e:
        logging.error(f"AI chat error: {e}")
        return {"response": "Une erreur est survenue. Veuillez réessayer. / An error occurred. Please try again."}


@api_router.get("/ai/usage")
async def get_ai_usage(current_user: dict = Depends(get_current_user)):
    """Return how many AI requests the user has used this month."""
    user_id   = current_user["id"]
    user_plan = current_user.get("plan", "free")
    month_key = datetime.now().strftime("%Y-%m")
    limit     = AI_LIMITS.get(user_plan, AI_LIMITS["free"])
    usage_doc = await db.ai_usage.find_one({"user_id": user_id, "month": month_key})
    used      = usage_doc["count"] if usage_doc else 0
    return {"used": used, "limit": limit, "remaining": max(0, limit - used), "plan": user_plan}


# ===========================
# MESSAGING
# ===========================

class MessageCreate(BaseModel):
    tenant_id: str
    content: str
    sender_type: str = "landlord"  # 'landlord' | 'tenant'

class Message(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str          # landlord's user_id
    tenant_id: str
    sender_type: str      # 'landlord' | 'tenant'
    content: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_read_by_landlord: bool = True

class ConversationSummary(BaseModel):
    tenant_id: str
    tenant_name: str
    tenant_initials: str
    property_unit: str
    last_message: str
    last_message_time: str   # ISO datetime
    unread_count: int

@api_router.get("/messages/conversations")
async def get_conversations(current_user: dict = Depends(get_current_user)):
    """Return one conversation per tenant, sorted by last message date."""
    user_id = current_user["id"]

    # Get all tenants for this landlord
    all_units = await db.units.find({"user_id": user_id}).to_list(200)
    unit_ids = [u["id"] for u in all_units]
    tenants = await db.tenants.find({"unit_id": {"$in": unit_ids}}).to_list(200)

    results = []
    for tenant in tenants:
        tenant_id = tenant["id"]
        # Get last message
        last_msg = await db.messages.find_one(
            {"user_id": user_id, "tenant_id": tenant_id},
            sort=[("created_at", -1)]
        )
        # Unread count (tenant messages not yet read by landlord)
        unread = await db.messages.count_documents({
            "user_id": user_id,
            "tenant_id": tenant_id,
            "sender_type": "tenant",
            "is_read_by_landlord": False,
        })

        # Get unit + property for display
        unit = next((u for u in all_units if u["id"] == tenant.get("unit_id")), None)
        prop_name = ""
        if unit:
            prop = await db.properties.find_one({"id": unit["property_id"]})
            prop_name = f"{prop['name']} · {unit.get('unit_number', '')}" if prop else unit.get("unit_number", "")

        name = f"{tenant.get('first_name', '')} {tenant.get('last_name', '')}".strip()
        initials = "".join(p[0].upper() for p in name.split()[:2]) if name else "?"

        results.append({
            "tenant_id": tenant_id,
            "tenant_name": name,
            "tenant_initials": initials,
            "property_unit": prop_name,
            "last_message": last_msg["content"] if last_msg else "",
            "last_message_time": last_msg["created_at"].isoformat() if last_msg else "",
            "unread_count": unread,
        })

    # Sort: conversations with messages first (most recent), then others
    results.sort(key=lambda x: x["last_message_time"], reverse=True)
    return results


@api_router.get("/messages/{tenant_id}")
async def get_messages(tenant_id: str, current_user: dict = Depends(get_current_user)):
    """Return full message thread for a given tenant."""
    user_id = current_user["id"]
    msgs = await db.messages.find(
        {"user_id": user_id, "tenant_id": tenant_id}
    ).sort("created_at", 1).to_list(500)
    return [
        {
            "id": m["id"],
            "sender_type": m["sender_type"],
            "content": m["content"],
            "created_at": m["created_at"].isoformat(),
            "is_read_by_landlord": m.get("is_read_by_landlord", True),
        }
        for m in msgs
    ]


@api_router.post("/messages")
async def send_message(data: MessageCreate, current_user: dict = Depends(get_current_user)):
    """Send a message to or from a tenant."""
    user_id = current_user["id"]
    msg = Message(
        user_id=user_id,
        tenant_id=data.tenant_id,
        sender_type=data.sender_type,
        content=data.content,
        is_read_by_landlord=(data.sender_type == "landlord"),
    )
    await db.messages.insert_one(msg.model_dump())
    return {
        "id": msg.id,
        "sender_type": msg.sender_type,
        "content": msg.content,
        "created_at": msg.created_at.isoformat(),
    }


@api_router.put("/messages/{tenant_id}/read")
async def mark_messages_read(tenant_id: str, current_user: dict = Depends(get_current_user)):
    """Mark all tenant messages in this conversation as read by landlord."""
    await db.messages.update_many(
        {"user_id": current_user["id"], "tenant_id": tenant_id, "sender_type": "tenant"},
        {"$set": {"is_read_by_landlord": True}},
    )
    return {"ok": True}


# ===========================
# CONTRACTORS
# ===========================

class ContractorCreate(BaseModel):
    name: str
    company: Optional[str] = None
    trade: str = "general"
    phone: str
    email: Optional[str] = None
    rating: int = 5
    notes: Optional[str] = None
    preferred: bool = False
    last_used: Optional[str] = None

class ContractorUpdate(ContractorCreate):
    pass

@api_router.get("/contractors")
async def get_contractors(current_user: dict = Depends(get_current_user)):
    docs = await db.contractors.find({"user_id": current_user["id"]}).sort("name", 1).to_list(200)
    for d in docs:
        d.pop("_id", None)
    return docs

@api_router.post("/contractors")
async def create_contractor(data: ContractorCreate, current_user: dict = Depends(get_current_user)):
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        **data.model_dump(),
        "created_at": datetime.utcnow().isoformat(),
    }
    await db.contractors.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.put("/contractors/{contractor_id}")
async def update_contractor(contractor_id: str, data: ContractorUpdate, current_user: dict = Depends(get_current_user)):
    result = await db.contractors.update_one(
        {"id": contractor_id, "user_id": current_user["id"]},
        {"$set": {**data.model_dump(), "updated_at": datetime.utcnow().isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Contractor not found")
    return {"ok": True}

@api_router.delete("/contractors/{contractor_id}")
async def delete_contractor(contractor_id: str, current_user: dict = Depends(get_current_user)):
    await db.contractors.delete_one({"id": contractor_id, "user_id": current_user["id"]})
    return {"ok": True}


# ===========================
# TEAM
# ===========================

class TeamInvite(BaseModel):
    email: str
    role: str  # "manager" | "accountant"
    name: Optional[str] = None

class TeamMemberCreate(BaseModel):
    name: str
    email: str
    role: str = "manager"
    properties: List[str] = []
    can_view_finances: bool = False
    can_edit_tenants: bool = True
    can_manage_maintenance: bool = True
    phone: Optional[str] = None
    notes: Optional[str] = None

class TeamMemberUpdate(TeamMemberCreate):
    status: Optional[str] = None

@api_router.get("/team")
async def get_team(current_user: dict = Depends(get_current_user)):
    docs = await db.team_members.find({"owner_id": current_user["id"]}).to_list(50)
    for d in docs:
        d.pop("_id", None)
        d.pop("invite_token", None)
    return docs

@api_router.post("/team/invite")
async def invite_team_member(data: TeamInvite, current_user: dict = Depends(get_current_user)):
    if data.role not in ("manager", "accountant"):
        raise HTTPException(status_code=400, detail="Role must be 'manager' or 'accountant'")
    existing = await db.team_members.find_one({"owner_id": current_user["id"], "email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Already invited")
    invite_token = str(uuid.uuid4())
    doc = {
        "id": str(uuid.uuid4()),
        "owner_id": current_user["id"],
        # keep user_id for legacy reads
        "user_id": current_user["id"],
        "user_id_member": None,
        "email": data.email,
        "name": data.name,
        "full_name": data.name,
        "role": data.role,
        "status": "pending",
        "invite_token": invite_token,
        "created_at": datetime.utcnow().isoformat(),
    }
    await db.team_members.insert_one(doc)
    doc.pop("_id", None)
    doc.pop("invite_token", None)
    return doc

@api_router.post("/team")
async def add_team_member_legacy(data: TeamMemberCreate, current_user: dict = Depends(get_current_user)):
    """Legacy endpoint — kept for backwards compat, delegates to invite logic."""
    invite_token = str(uuid.uuid4())
    doc = {
        "id": str(uuid.uuid4()),
        "owner_id": current_user["id"],
        "user_id": current_user["id"],
        "email": data.email,
        "name": data.name,
        "full_name": data.name,
        "role": data.role,
        "status": "pending",
        "invite_token": invite_token,
        "created_at": datetime.utcnow().isoformat(),
    }
    await db.team_members.insert_one(doc)
    doc.pop("_id", None)
    doc.pop("invite_token", None)
    return doc

@api_router.patch("/team/{member_id}/role")
async def update_team_role(member_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    body = await request.json()
    role = body.get("role")
    if role not in ("manager", "accountant"):
        raise HTTPException(status_code=400, detail="Invalid role")
    member = await db.team_members.find_one({"id": member_id, "owner_id": current_user["id"]})
    if not member:
        raise HTTPException(status_code=404, detail="Not found")
    await db.team_members.update_one({"id": member_id}, {"$set": {"role": role}})
    return {"success": True}

@api_router.put("/team/{member_id}")
async def update_team_member(member_id: str, data: TeamMemberUpdate, current_user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow().isoformat()
    result = await db.team_members.update_one(
        {"id": member_id, "$or": [{"owner_id": current_user["id"]}, {"user_id": current_user["id"]}]},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Team member not found")
    return {"ok": True}

@api_router.delete("/team/{member_id}")
async def delete_team_member(member_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.team_members.delete_one(
        {"id": member_id, "$or": [{"owner_id": current_user["id"]}, {"user_id": current_user["id"]}]}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    return {"ok": True}

@api_router.get("/team/accept/{token}")
async def accept_invite(token: str):
    member = await db.team_members.find_one({"invite_token": token})
    if not member:
        raise HTTPException(status_code=404, detail="Invalid or expired invite link")
    await db.team_members.update_one(
        {"invite_token": token},
        {"$set": {"status": "active", "accepted_at": datetime.utcnow().isoformat()}}
    )
    return {"success": True, "email": member["email"], "role": member["role"]}


# ===========================
# VACANCY & APPLICANTS
# ===========================

class ApplicantCreate(BaseModel):
    name: str
    unit_id: Optional[str] = None
    property_id: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    income: Optional[str] = None
    message: Optional[str] = None
    status: str = "new"

class ApplicantStatusUpdate(BaseModel):
    status: str  # new | contacted | screened | visited | approved | rejected

@api_router.get("/vacant-units")
async def get_vacant_units(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    props   = await db.properties.find({"user_id": user_id}).to_list(200)
    prop_map = {p["id"]: p for p in props}
    prop_ids = list(prop_map.keys())

    units = await db.units.find({
        "property_id": {"$in": prop_ids},
        "is_occupied": False,
    }).to_list(500)

    today = date.today()
    result = []
    for u in units:
        u.pop("_id", None)
        # Compute days_vacant from last lease end_date for this unit
        last_lease = await db.leases.find_one(
            {"unit_id": u["id"]},
            sort=[("end_date", -1)]
        )
        days_vacant = 0
        if last_lease and last_lease.get("end_date"):
            try:
                end = date.fromisoformat(str(last_lease["end_date"])[:10])
                days_vacant = max(0, (today - end).days)
            except ValueError:
                pass
        if days_vacant == 0:
            # Fallback: days since unit created
            try:
                created = u.get("created_at")
                if isinstance(created, datetime):
                    days_vacant = max(0, (today - created.date()).days)
            except Exception:
                pass

        prop = prop_map.get(u.get("property_id", ""), {})
        result.append({
            **u,
            "property_name": prop.get("name", ""),
            "property_address": prop.get("address", ""),
            "days_vacant": days_vacant,
            "listing_active": u.get("listing_active", False),
        })
    return result

@api_router.post("/units/{unit_id}/toggle-listing")
async def toggle_listing(unit_id: str, current_user: dict = Depends(get_current_user)):
    prop_ids = [p["id"] for p in await db.properties.find({"user_id": current_user["id"]}).to_list(200)]
    unit = await db.units.find_one({"id": unit_id, "property_id": {"$in": prop_ids}})
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")
    new_val = not unit.get("listing_active", False)
    await db.units.update_one({"id": unit_id}, {"$set": {"listing_active": new_val}})
    return {"listing_active": new_val}

@api_router.get("/applicants")
async def get_applicants(current_user: dict = Depends(get_current_user), unit_id: Optional[str] = None):
    user_id = current_user["id"]

    # Build enrichment maps first
    props = await db.properties.find({"user_id": user_id}).to_list(200)
    prop_map = {str(p.get("id", p.get("_id", ""))): p.get("name", "") for p in props}
    prop_ids = list(prop_map.keys())

    units = await db.units.find({"user_id": user_id}).to_list(500)
    unit_map = {
        str(u.get("id", u.get("_id", ""))): {
            "unit_number": u.get("unit_number", ""),
            "property_name": prop_map.get(str(u.get("property_id", "")), ""),
        }
        for u in units
    }

    # Fetch applicants owned by user OR linked to their properties (from listing inquiries)
    query: dict = {
        "$or": [
            {"user_id": user_id},
            {"property_id": {"$in": prop_ids}},
        ]
    }
    if unit_id:
        query = {"user_id": user_id, "unit_id": unit_id}
    docs = await db.applicants.find(query).sort("created_at", -1).to_list(500)

    result = []
    for d in docs:
        d.pop("_id", None)
        info = unit_map.get(d.get("unit_id", ""), {})
        d["unit_number"] = d.get("unit_number") or info.get("unit_number", "")
        # Resolve property_name from property_id if not already set
        if not d.get("property_name"):
            d["property_name"] = prop_map.get(str(d.get("property_id", "")), "") or info.get("property_name", "")
        # Normalise legacy statuses to pipeline stages
        legacy_map = {"waiting": "new", "pending": "new", "reviewing": "screened"}
        if d.get("status") in legacy_map:
            d["status"] = legacy_map[d["status"]]
        # Normalise name field (listing inquiries use "name"; manual use "name" too)
        result.append(d)
    return result

@api_router.post("/applicants")
async def add_applicant(data: ApplicantCreate, current_user: dict = Depends(get_current_user)):
    valid_statuses = ["new", "contacted", "screened", "visited", "approved", "rejected"]
    status = data.status if data.status in valid_statuses else "new"
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "unit_id": data.unit_id or "",
        "property_id": data.property_id or "",
        "name": data.name,
        "email": data.email or "",
        "phone": data.phone or "",
        "income": data.income or "",
        "message": data.message or "",
        "source": "manual",
        "date": date.today().isoformat(),
        "status": status,
        "created_at": datetime.utcnow().isoformat(),
    }
    await db.applicants.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.put("/applicants/{applicant_id}")
async def update_applicant(applicant_id: str, data: ApplicantStatusUpdate, current_user: dict = Depends(get_current_user)):
    result = await db.applicants.update_one(
        {"id": applicant_id, "user_id": current_user["id"]},
        {"$set": {"status": data.status, "updated_at": datetime.utcnow().isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Applicant not found")
    return {"ok": True}

@api_router.patch("/applicants/{applicant_id}/status")
async def patch_applicant_status(applicant_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    body = await request.json()
    status = body.get("status")
    valid_statuses = ["new", "contacted", "screened", "visited", "approved", "rejected"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Invalid status")
    user_id = current_user["id"]
    # Allow update if owned by user OR if property belongs to user
    applicant = await db.applicants.find_one({"id": applicant_id})
    if not applicant:
        raise HTTPException(status_code=404, detail="Not found")
    if applicant.get("user_id") != user_id:
        # Check via property ownership
        prop_ids = [p["id"] for p in await db.properties.find({"user_id": user_id}, {"id": 1}).to_list(200)]
        if applicant.get("property_id") not in prop_ids:
            raise HTTPException(status_code=403, detail="Not authorized")
    await db.applicants.update_one(
        {"id": applicant_id},
        {"$set": {"status": status, "updated_at": datetime.utcnow().isoformat()}}
    )
    return {"ok": True}

@api_router.delete("/applicants/{applicant_id}")
async def delete_applicant(applicant_id: str, current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    applicant = await db.applicants.find_one({"id": applicant_id})
    if not applicant:
        raise HTTPException(status_code=404, detail="Not found")
    if applicant.get("user_id") != user_id:
        prop_ids = [p["id"] for p in await db.properties.find({"user_id": user_id}, {"id": 1}).to_list(200)]
        if applicant.get("property_id") not in prop_ids:
            raise HTTPException(status_code=403, detail="Not authorized")
    await db.applicants.delete_one({"id": applicant_id})
    return {"ok": True}


# ===========================
# NOTIFICATIONS
# ===========================

def _time_ago(dt_str: str) -> str:
    """Return a French relative-time label from an ISO datetime string."""
    if not dt_str:
        return ""
    try:
        dt = datetime.fromisoformat(str(dt_str).replace("Z", ""))
        delta = datetime.utcnow() - dt
        total_seconds = int(delta.total_seconds())
        if total_seconds < 60:
            return "À l'instant"
        if total_seconds < 3600:
            m = total_seconds // 60
            return f"Il y a {m} min"
        if delta.days == 0:
            h = total_seconds // 3600
            return f"Il y a {h}h"
        if delta.days == 1:
            return "Hier"
        if delta.days < 7:
            return f"Il y a {delta.days} jours"
        return dt.strftime("%-d %b")
    except Exception:
        return str(dt_str)[:10]


class NotifReadRequest(BaseModel):
    notification_id: str

class NotifReadAllRequest(BaseModel):
    ids: List[str]

class NotifPrefs(BaseModel):
    rent: bool = True
    maintenance: bool = True
    lease: bool = True
    payment: bool = True


@api_router.get("/notifications")
async def get_notifications(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    today = date.today()
    cutoff_7d = (datetime.utcnow() - timedelta(days=7)).isoformat()

    # Load prefs (what categories the landlord wants)
    pref_doc = await db.notification_prefs.find_one({"user_id": user_id})
    prefs = {
        "rent":        pref_doc.get("rent", True)        if pref_doc else True,
        "maintenance": pref_doc.get("maintenance", True) if pref_doc else True,
        "lease":       pref_doc.get("lease", True)       if pref_doc else True,
        "payment":     pref_doc.get("payment", True)     if pref_doc else True,
    }

    # Load read IDs
    read_doc = await db.notification_reads.find_one({"user_id": user_id})
    read_ids = set(read_doc.get("ids", [])) if read_doc else set()

    # Gather scope
    props   = await db.properties.find({"user_id": user_id}).to_list(200)
    prop_ids = [p["id"] for p in props]
    units   = await db.units.find({"property_id": {"$in": prop_ids}, "is_occupied": True}).to_list(500)
    unit_ids = [u["id"] for u in units]

    # Build tenant lookup {tenant_id -> full_name}
    tenant_docs = await db.tenants.find({"user_id": user_id}).to_list(500)
    tenant_map = {t["id"]: f"{t['first_name']} {t['last_name']}" for t in tenant_docs}

    # Build prop name lookup {property_id -> name}
    prop_map = {p["id"]: p["name"] for p in props}

    notifs = []

    # 1 — Late rent (no payment recorded for current month after day 5)
    if prefs["rent"] and today.day >= 5:
        current_month = today.strftime("%Y-%m")
        for unit in units:
            paid = await db.rent_payments.find_one({"unit_id": unit["id"], "month_year": current_month})
            if not paid:
                days_late = today.day - 1
                tid = unit.get("current_tenant_id", "")
                tname = tenant_map.get(tid, "Locataire inconnu")
                pname = prop_map.get(unit.get("property_id", ""), "")
                nid = f"late_rent_{unit['id']}_{current_month}"
                notifs.append({
                    "id": nid,
                    "type": "rent",
                    "title": "Loyer en retard",
                    "body": f"{tname} ({unit.get('unit_number','?')} — {pname}) n'a pas payé son loyer de {current_month}. {days_late} jour{'s' if days_late > 1 else ''} de retard.",
                    "time": f"Jour {today.day}",
                    "action_route": "/(tabs)/tenants",
                })

    # 2 — New maintenance (open, last 14 days)
    if prefs["maintenance"]:
        cutoff_14d = (datetime.utcnow() - timedelta(days=14)).isoformat()
        maint_list = await db.maintenance_requests.find({
            "property_id": {"$in": prop_ids},
            "status":      "open",
            "created_at":  {"$gte": cutoff_14d},
        }).sort("created_at", -1).to_list(20)
        for m in maint_list:
            nid = f"maintenance_{m['id']}"
            pname = prop_map.get(m.get("property_id", ""), "")
            notifs.append({
                "id":           nid,
                "type":         "maintenance",
                "title":        "Nouvelle demande d'entretien",
                "body":         f"{m.get('title', '?')} — {pname}",
                "time":         _time_ago(str(m.get("created_at", ""))),
                "action_route": "/(tabs)/maintenance",
            })

    # 3 — Expiring leases (within 90 days)
    if prefs["lease"]:
        leases = await db.leases.find({"user_id": user_id, "is_active": True}).to_list(200)
        for lease in leases:
            end_str = lease.get("end_date")
            if not end_str:
                continue
            try:
                end_date = date.fromisoformat(str(end_str)[:10])
                days_left = (end_date - today).days
                if 0 < days_left <= 90:
                    tid = lease.get("tenant_id", "")
                    tname = tenant_map.get(tid, "Locataire ?")
                    urgency = "critique" if days_left <= 30 else "bientôt"
                    nid = f"lease_expiry_{lease['id']}"
                    notifs.append({
                        "id":           nid,
                        "type":         "lease",
                        "title":        f"Bail expirant dans {days_left} jours",
                        "body":         f"Le bail de {tname} expire le {end_str} — renouvellement {urgency} requis.",
                        "time":         f"Dans {days_left}j",
                        "action_route": "/(tabs)/more",
                    })
            except ValueError:
                pass

    # 4 — Recent payments received (last 7 days)
    if prefs["payment"] and unit_ids:
        payments = await db.rent_payments.find({
            "unit_id":  {"$in": unit_ids},
            "paid_date": {"$gte": cutoff_7d},
        }).sort("paid_date", -1).to_list(20)
        for p in payments:
            uid = p.get("unit_id", "")
            unit_doc = next((u for u in units if u.get("id") == uid), None)
            unum = unit_doc.get("unit_number", "?") if unit_doc else "?"
            pname = prop_map.get(unit_doc.get("property_id", ""), "") if unit_doc else ""
            amt = p.get("amount", 0)
            month = p.get("month_year", "")
            nid = f"payment_{p['id']}"
            notifs.append({
                "id":           nid,
                "type":         "payment",
                "title":        "Paiement reçu",
                "body":         f"{amt:.0f}$ reçu pour {month} — {unum} {pname}",
                "time":         _time_ago(str(p.get("paid_date", ""))),
                "action_route": "/(tabs)/tenants",
            })

    # Mark read status
    for n in notifs:
        n["read"] = n["id"] in read_ids

    # Sort: unread first
    notifs.sort(key=lambda x: (x["read"]))
    return notifs


@api_router.post("/notifications/read-one")
async def mark_notification_read(data: NotifReadRequest, current_user: dict = Depends(get_current_user)):
    await db.notification_reads.update_one(
        {"user_id": current_user["id"]},
        {"$addToSet": {"ids": data.notification_id}},
        upsert=True
    )
    return {"ok": True}


@api_router.post("/notifications/read-all")
async def mark_all_notifications_read(data: NotifReadAllRequest, current_user: dict = Depends(get_current_user)):
    if data.ids:
        await db.notification_reads.update_one(
            {"user_id": current_user["id"]},
            {"$addToSet": {"ids": {"$each": data.ids}}},
            upsert=True
        )
    return {"ok": True}


@api_router.get("/notification-prefs")
async def get_notification_prefs(current_user: dict = Depends(get_current_user)):
    doc = await db.notification_prefs.find_one({"user_id": current_user["id"]})
    if not doc:
        return {"rent": True, "maintenance": True, "lease": True, "payment": True}
    doc.pop("_id", None)
    doc.pop("user_id", None)
    return doc


@api_router.put("/notification-prefs")
async def save_notification_prefs(data: NotifPrefs, current_user: dict = Depends(get_current_user)):
    await db.notification_prefs.update_one(
        {"user_id": current_user["id"]},
        {"$set": {
            "user_id":     current_user["id"],
            "rent":        data.rent,
            "maintenance": data.maintenance,
            "lease":       data.lease,
            "payment":     data.payment,
        }},
        upsert=True
    )
    return {"ok": True}


# ===========================
# TENANT PORTAL AUTH + ROUTES
# ===========================

# ── Helpers ──────────────────────────────────────────────────────────────────

RESEND_API_KEY = os.environ.get("RESEND_API_KEY")

def create_tenant_token(tenant_id: str, email: str) -> str:
    payload = {
        "sub": tenant_id,
        "email": email,
        "role": "tenant",
        "exp": datetime.utcnow() + timedelta(days=30),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def _send_otp_email(to_email: str, code: str, tenant_name: str):
    """Send OTP via Resend. In production, raises 500 if key not set. In dev, logs the code."""
    if not RESEND_API_KEY:
        if os.environ.get("ENVIRONMENT") == "production":
            raise HTTPException(status_code=500, detail="Service email non configuré. Contactez l'administrateur.")
        logger.info(f"[OTP] No RESEND_API_KEY — tenant code for {to_email}: {code}")
        return
    import httpx
    html_body = f"""
    <h2 style="color:#1E7A6E">Votre code d'accès Domely</h2>
    <p>Bonjour {tenant_name},</p>
    <p>Voici votre code d'accès locataire Domely :</p>
    <div style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#1E7A6E;margin:20px 0">{code}</div>
    <p>Ce code expire dans <strong>10 minutes</strong>.</p>
    <p style="color:#999;font-size:12px">Si vous n'avez pas demandé ce code, ignorez cet e-mail.</p>
    """
    async with httpx.AsyncClient() as client_http:
        try:
            await client_http.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {RESEND_API_KEY}", "Content-Type": "application/json"},
                json={"from": "Domely <noreply@domely.ca>", "to": to_email,
                      "subject": f"Domely — Code d'accès : {code}", "html": html_body},
                timeout=10,
            )
        except Exception as e:
            logger.warning(f"[OTP] Email send failed: {e}")

# ── OTP Models ────────────────────────────────────────────────────────────────

class TenantOTPRequest(BaseModel):
    email: str

class TenantOTPVerify(BaseModel):
    email: str
    code: str

class TenantMaintenanceCreate(BaseModel):
    title: str
    description: Optional[str] = None
    category: str = "general"
    urgency: str = "normal"  # low, normal, high, emergency

class TenantMessageCreate(BaseModel):
    content: str

# ── Routes ───────────────────────────────────────────────────────────────────

@api_router.post("/auth/tenant/request-code")
async def tenant_request_code(data: TenantOTPRequest):
    """Step 1: tenant enters email → generates OTP, stores it, sends email."""
    email = data.email.lower().strip()

    # Find tenant by email
    tenant = await db.tenants.find_one({"email": email})
    if not tenant:
        # Return same response to avoid email enumeration
        return {"ok": True, "message": "If this email is registered, a code has been sent."}

    code = str(random.randint(100000, 999999))
    expires_at = datetime.utcnow() + timedelta(minutes=10)

    # Upsert OTP record
    await db.tenant_otps.update_one(
        {"email": email},
        {"$set": {"email": email, "code": code, "expires_at": expires_at, "attempts": 0}},
        upsert=True,
    )

    tenant_name = f"{tenant.get('first_name', '')} {tenant.get('last_name', '')}".strip() or "locataire"
    await _send_otp_email(email, code, tenant_name)

    # In dev mode, return the code in the response for easy testing
    if not RESEND_API_KEY:
        return {"ok": True, "dev_code": code, "message": f"Dev mode: code is {code}"}
    return {"ok": True, "message": "Code envoyé. Vérifiez vos courriels."}


@api_router.post("/auth/tenant/verify-code")
async def tenant_verify_code(data: TenantOTPVerify):
    """Step 2: tenant enters OTP → returns JWT + profile."""
    email = data.email.lower().strip()

    otp_record = await db.tenant_otps.find_one({"email": email})
    if not otp_record:
        raise HTTPException(status_code=401, detail="Code expiré ou invalide.")

    # Check attempts
    if otp_record.get("attempts", 0) >= 5:
        raise HTTPException(status_code=429, detail="Trop de tentatives. Demandez un nouveau code.")

    # Check expiry
    if datetime.utcnow() > otp_record["expires_at"]:
        await db.tenant_otps.delete_one({"email": email})
        raise HTTPException(status_code=401, detail="Code expiré. Demandez un nouveau code.")

    # Check code
    if otp_record["code"] != data.code.strip():
        await db.tenant_otps.update_one({"email": email}, {"$inc": {"attempts": 1}})
        raise HTTPException(status_code=401, detail="Code invalide.")

    # Valid — clean up OTP
    await db.tenant_otps.delete_one({"email": email})

    tenant = await db.tenants.find_one({"email": email})
    if not tenant:
        raise HTTPException(status_code=404, detail="Locataire introuvable.")

    # Enrich tenant with unit + property info
    unit = await db.units.find_one({"current_tenant_id": tenant["id"]}) if tenant.get("unit_id") else None
    if not unit and tenant.get("unit_id"):
        unit = await db.units.find_one({"id": tenant["unit_id"]})

    prop = None
    if unit:
        prop = await db.properties.find_one({"id": unit["property_id"]})

    # Active lease
    lease = await db.leases.find_one({
        "tenant_id": tenant["id"],
        "is_active": True,
    })

    # Landlord info (owner of this property)
    landlord = None
    if prop:
        landlord = await db.users.find_one({"id": prop["user_id"]}, {"hashed_password": 0})

    token = create_tenant_token(tenant["id"], email)

    profile = {
        "tenant_id": tenant["id"],
        "name": f"{tenant.get('first_name', '')} {tenant.get('last_name', '')}".strip(),
        "email": tenant.get("email", ""),
        "phone": tenant.get("phone"),
        "unit_number": unit.get("unit_number") if unit else None,
        "property_name": prop.get("name") if prop else None,
        "property_address": f"{prop.get('address', '')}, {prop.get('city', '')}" if prop else None,
        "rent": lease.get("rent_amount") if lease else (unit.get("rent_amount") if unit else None),
        "lease_start":    lease.get("start_date") if lease else None,
        "lease_end":      lease.get("end_date") if lease else None,
        "landlord_name":  landlord.get("full_name") if landlord else None,
        "landlord_email": landlord.get("email") if landlord else None,
        "user_id":        prop.get("user_id") if prop else None,
    }

    return {"access_token": token, "profile": profile}


@api_router.get("/tenant/profile")
async def get_tenant_profile(current_tenant: dict = Depends(get_current_tenant)):
    unit = await db.units.find_one({"id": current_tenant.get("unit_id")}) if current_tenant.get("unit_id") else None
    prop = await db.properties.find_one({"id": unit["property_id"]}) if unit else None
    lease = await db.leases.find_one({"tenant_id": current_tenant["id"], "is_active": True})
    landlord = await db.users.find_one({"id": prop["user_id"]}, {"hashed_password": 0}) if prop else None

    return {
        "tenant_id": current_tenant["id"],
        "name": f"{current_tenant.get('first_name', '')} {current_tenant.get('last_name', '')}".strip(),
        "email": current_tenant.get("email"),
        "phone": current_tenant.get("phone"),
        "unit_number": unit.get("unit_number") if unit else None,
        "property_name": prop.get("name") if prop else None,
        "property_address": f"{prop.get('address', '')}, {prop.get('city', '')}" if prop else None,
        "rent": lease.get("rent_amount") if lease else (unit.get("rent_amount") if unit else None),
        "lease_start":    lease.get("start_date") if lease else None,
        "lease_end":      lease.get("end_date") if lease else None,
        "landlord_name":  landlord.get("full_name") if landlord else None,
        "landlord_email": landlord.get("email") if landlord else None,
        "user_id":        prop.get("user_id") if prop else None,
    }


@api_router.get("/tenant/payments")
async def get_tenant_payments(current_tenant: dict = Depends(get_current_tenant)):
    payments = await db.rent_payments.find(
        {"tenant_id": current_tenant["id"]}
    ).sort("month_year", -1).to_list(24)

    for p in payments:
        p.pop("_id", None)
        if isinstance(p.get("created_at"), datetime):
            p["created_at"] = p["created_at"].isoformat()

    return payments


class TenantPaymentConfirmBody(BaseModel):
    method: str = "etransfer"   # etransfer, cash, cheque, other
    note: Optional[str] = None

@api_router.post("/tenant/payments/confirm")
async def tenant_confirm_payment(
    data: TenantPaymentConfirmBody,
    current_tenant: dict = Depends(get_current_tenant),
):
    """
    Tenant declares they have paid rent manually (e-transfer / cash / cheque).
    Creates a rent_payment with status='pending_confirmation' — landlord must verify.
    """
    tenant_id = current_tenant.get("id") or current_tenant.get("tenant_id")
    lease = await db.leases.find_one({"tenant_id": tenant_id, "is_active": True})
    if not lease:
        raise HTTPException(status_code=404, detail="No active lease found")

    rent_amount = float(lease.get("rent_amount", 0))
    month_year  = datetime.utcnow().strftime("%Y-%m")

    # Prevent duplicate confirmation for same month
    existing = await db.rent_payments.find_one({
        "tenant_id": tenant_id,
        "month_year": month_year,
        "status": {"$in": ["paid", "pending_confirmation"]},
    })
    if existing:
        raise HTTPException(
            status_code=409,
            detail="A payment for this month already exists or is pending confirmation.",
        )

    landlord = await db.users.find_one({"id": lease.get("landlord_id") or lease.get("user_id")})
    payment_doc = {
        "id":             str(uuid.uuid4()),
        "user_id":        landlord["id"] if landlord else "",
        "lease_id":       str(lease.get("id", "")),
        "tenant_id":      tenant_id,
        "unit_id":        str(lease.get("unit_id", "")),
        "amount":         rent_amount,
        "payment_date":   datetime.utcnow().strftime("%Y-%m-%d"),
        "payment_method": data.method,
        "month_year":     month_year,
        "status":         "pending_confirmation",
        "notes":          data.note or "",
        "created_at":     datetime.utcnow(),
    }
    await db.rent_payments.insert_one(payment_doc)

    # Notify landlord + send tenant confirmation
    _resend_key = os.getenv("RESEND_API_KEY", "")
    if _resend_key:
        tenant_name = f"{current_tenant.get('first_name', '')} {current_tenant.get('last_name', '')}".strip() or "Votre locataire"
        method_labels = {"etransfer": "virement Interac", "cash": "comptant", "cheque": "chèque", "other": "autre"}
        method_label = method_labels.get(data.method, data.method)
        month_display = datetime.utcnow().strftime("%B %Y")
        amount_str = f"{rent_amount:,.2f}".replace(",", " ")

        # ── Email to landlord ──────────────────────────────────────────────
        if landlord:
            landlord_html = f"""<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 16px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 8px rgba(0,0,0,0.06);">
        <tr><td style="background:linear-gradient(135deg,#1E7A6E,#3FAF86);padding:28px 36px;">
          <div style="font-size:22px;font-weight:800;color:#fff;">Domely</div>
        </td></tr>
        <tr><td style="padding:36px;">
          <h2 style="margin:0 0 16px;font-size:18px;font-weight:700;color:#111827;">
            💳 {tenant_name} a déclaré un paiement
          </h2>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:12px;margin-bottom:24px;">
            <tr><td style="padding:20px 24px;">
              <table width="100%" cellpadding="4">
                <tr>
                  <td style="font-size:13px;color:#6b7280;width:40%;">Locataire</td>
                  <td style="font-size:13px;font-weight:600;color:#111827;">{tenant_name}</td>
                </tr>
                <tr>
                  <td style="font-size:13px;color:#6b7280;">Montant</td>
                  <td style="font-size:13px;font-weight:600;color:#111827;">{amount_str} $</td>
                </tr>
                <tr>
                  <td style="font-size:13px;color:#6b7280;">Méthode</td>
                  <td style="font-size:13px;font-weight:600;color:#111827;">{method_label}</td>
                </tr>
                <tr>
                  <td style="font-size:13px;color:#6b7280;">Période</td>
                  <td style="font-size:13px;font-weight:600;color:#111827;">{month_display}</td>
                </tr>
                {f'<tr><td style="font-size:13px;color:#6b7280;">Note</td><td style="font-size:13px;color:#374151;">{data.note}</td></tr>' if data.note else ''}
              </table>
            </td></tr>
          </table>
          <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">
            Veuillez vérifier la réception du paiement et le confirmer dans votre tableau de bord.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
            <a href="https://domely.ca/dashboard/rent" style="display:inline-block;background:linear-gradient(135deg,#1E7A6E,#3FAF86);color:#fff;font-size:14px;font-weight:600;text-decoration:none;padding:13px 32px;border-radius:10px;">
              Vérifier dans le tableau de bord →
            </a>
          </td></tr></table>
        </td></tr>
        <tr><td style="padding:20px 36px;border-top:1px solid #f3f4f6;text-align:center;">
          <p style="margin:0;font-size:11px;color:#9ca3af;">Domely · <a href="https://domely.ca" style="color:#1E7A6E;text-decoration:none;">domely.ca</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>"""
            asyncio.create_task(_send_auto_email(
                landlord["email"],
                f"Domely — {tenant_name} a déclaré un paiement de {amount_str} $",
                landlord_html,
            ))

        # ── Confirmation email to tenant ───────────────────────────────────
        tenant_email = current_tenant.get("email", "")
        tenant_first = current_tenant.get("first_name", "").split()[0] if current_tenant.get("first_name") else "là"
        if tenant_email:
            tenant_html = f"""<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 16px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 8px rgba(0,0,0,0.06);">
        <tr><td style="background:linear-gradient(135deg,#1E7A6E,#3FAF86);padding:28px 36px;">
          <div style="font-size:22px;font-weight:800;color:#fff;">Domely</div>
        </td></tr>
        <tr><td style="padding:36px;">
          <h2 style="margin:0 0 8px;font-size:18px;font-weight:700;color:#111827;">
            ✅ Déclaration reçue, {tenant_first} !
          </h2>
          <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">
            Nous avons bien reçu votre déclaration de paiement de loyer pour <strong>{month_display}</strong>.
            Votre propriétaire sera notifié et confirmera la réception sous peu.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:12px;margin-bottom:24px;">
            <tr><td style="padding:20px 24px;">
              <table width="100%" cellpadding="4">
                <tr>
                  <td style="font-size:13px;color:#6b7280;width:40%;">Montant déclaré</td>
                  <td style="font-size:13px;font-weight:600;color:#111827;">{amount_str} $</td>
                </tr>
                <tr>
                  <td style="font-size:13px;color:#6b7280;">Méthode</td>
                  <td style="font-size:13px;font-weight:600;color:#111827;">{method_label}</td>
                </tr>
                <tr>
                  <td style="font-size:13px;color:#6b7280;">Statut</td>
                  <td style="font-size:13px;font-weight:600;color:#f59e0b;">En attente de confirmation</td>
                </tr>
              </table>
            </td></tr>
          </table>
          <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">
            Vous recevrez une notification quand votre propriétaire aura confirmé le paiement.
          </p>
        </td></tr>
        <tr><td style="padding:20px 36px;border-top:1px solid #f3f4f6;text-align:center;">
          <p style="margin:0;font-size:11px;color:#9ca3af;">Domely · <a href="https://domely.ca" style="color:#1E7A6E;text-decoration:none;">domely.ca</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>"""
            asyncio.create_task(_send_auto_email(
                tenant_email,
                f"Domely — Votre déclaration de loyer pour {month_display} a été reçue",
                tenant_html,
            ))

    payment_doc.pop("_id", None)
    if isinstance(payment_doc.get("created_at"), datetime):
        payment_doc["created_at"] = payment_doc["created_at"].isoformat()
    return payment_doc


@api_router.get("/tenant/maintenance")
async def get_tenant_maintenance(current_tenant: dict = Depends(get_current_tenant)):
    unit = await db.units.find_one({"id": current_tenant.get("unit_id")}) if current_tenant.get("unit_id") else None
    unit_id = unit["id"] if unit else None
    if not unit_id:
        return []

    requests = await db.maintenance_requests.find(
        {"submitted_by_tenant_id": current_tenant["id"]}
    ).sort("created_at", -1).to_list(50)

    for r in requests:
        r.pop("_id", None)
        for f in ("created_at", "updated_at"):
            if isinstance(r.get(f), datetime):
                r[f] = r[f].isoformat()

    return requests


@api_router.post("/tenant/maintenance")
async def create_tenant_maintenance(
    data: TenantMaintenanceCreate,
    current_tenant: dict = Depends(get_current_tenant),
):
    unit = await db.units.find_one({"id": current_tenant.get("unit_id")}) if current_tenant.get("unit_id") else None
    if not unit:
        raise HTTPException(status_code=400, detail="Aucun logement associé à ce compte.")

    prop = await db.properties.find_one({"id": unit["property_id"]})

    req_doc = {
        "id": str(uuid.uuid4()),
        "user_id": prop["user_id"] if prop else unit["property_id"],
        "property_id": unit["property_id"],
        "unit_id": unit["id"],
        "tenant_id": current_tenant["id"],
        "submitted_by_tenant_id": current_tenant["id"],
        "title": data.title,
        "description": data.description,
        "category": data.category,
        "urgency": data.urgency,
        "status": "open",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    await db.maintenance_requests.insert_one(req_doc)
    req_doc.pop("_id", None)
    req_doc["created_at"] = req_doc["created_at"].isoformat()
    req_doc["updated_at"] = req_doc["updated_at"].isoformat()
    return req_doc


@api_router.get("/tenant/messages")
async def get_tenant_messages(current_tenant: dict = Depends(get_current_tenant)):
    unit = await db.units.find_one({"id": current_tenant.get("unit_id")}) if current_tenant.get("unit_id") else None
    prop = await db.properties.find_one({"id": unit["property_id"]}) if unit else None
    if not prop:
        return []

    msgs = await db.messages.find({
        "user_id": prop["user_id"],
        "tenant_id": current_tenant["id"],
    }).sort("created_at", 1).to_list(200)

    result = []
    for m in msgs:
        m.pop("_id", None)
        result.append({
            "id": m.get("id"),
            "sender_type": m.get("sender_type"),
            "content": m.get("content"),
            "created_at": m["created_at"].isoformat() if isinstance(m.get("created_at"), datetime) else m.get("created_at"),
        })
    return result


@api_router.post("/tenant/messages")
async def send_tenant_message(
    data: TenantMessageCreate,
    current_tenant: dict = Depends(get_current_tenant),
):
    unit  = await db.units.find_one({"id": current_tenant.get("unit_id")}) if current_tenant.get("unit_id") else None
    prop  = await db.properties.find_one({"id": unit["property_id"]}) if unit else None
    if not prop:
        raise HTTPException(status_code=400, detail="Aucun logement associé à ce compte.")

    msg = {
        "id": str(uuid.uuid4()),
        "user_id": prop["user_id"],
        "tenant_id": current_tenant["id"],
        "sender_type": "tenant",
        "content": data.content.strip(),
        "is_read_by_landlord": False,
        "created_at": datetime.utcnow(),
    }
    await db.messages.insert_one(msg)
    msg.pop("_id", None)
    return {
        "id": msg["id"],
        "sender_type": "tenant",
        "content": msg["content"],
        "created_at": msg["created_at"].isoformat(),
    }


@api_router.get("/tenant/documents")
async def get_tenant_documents(current_tenant: dict = Depends(get_current_tenant)):
    tid = current_tenant["id"]
    docs = []
    # Active lease
    lease = await db.leases.find_one({"tenant_id": tid, "status": "active"})
    if not lease:
        lease = await db.leases.find_one({"tenant_id": tid})
    if lease:
        lid = lease.get("id") or str(lease.get("_id", ""))
        sd = lease.get("start_date", "")
        ed = lease.get("end_date", "")
        docs.append({
            "id": lid,
            "type": "lease",
            "name": f"Bail de logement",
            "subtitle": f"{sd[:10] if sd else '—'} → {ed[:10] if ed else 'Indéterminé'}",
            "date": sd[:10] if sd else None,
            "download_url": f"/tenant/lease/bail.pdf",
        })
    # Payment receipts (up to 12 months)
    payments = await db.rent_payments.find({"tenant_id": tid, "status": "paid"}).sort("month_year", -1).to_list(12)
    for p in payments:
        p.pop("_id", None)
        pid = p.get("id", "")
        my = p.get("month_year", "")
        amount = p.get("amount", 0)
        docs.append({
            "id": f"receipt_{pid}",
            "type": "receipt",
            "name": f"Reçu de loyer — {my}",
            "subtitle": f"{amount:,.0f} $ payé",
            "date": p.get("paid_date") or my,
            "download_url": None,
        })
    return docs


@api_router.get("/tenant/lease/bail.pdf")
async def tenant_download_bail(current_tenant: dict = Depends(get_current_tenant)):
    from fastapi.responses import StreamingResponse
    tid = current_tenant["id"]
    lease = await db.leases.find_one({"tenant_id": tid, "status": "active"})
    if not lease:
        lease = await db.leases.find_one({"tenant_id": tid})
    if not lease:
        raise HTTPException(404, "No lease found")
    lid = lease.get("id") or str(lease.get("_id", ""))

    tenant = await db.tenants.find_one({"id": tid})
    unit = await db.units.find_one({"id": lease.get("unit_id")}) if lease.get("unit_id") else None
    prop = await db.properties.find_one({"id": unit["property_id"]}) if unit and unit.get("property_id") else None
    if not prop and lease.get("property_id"):
        prop = await db.properties.find_one({"id": lease["property_id"]})
    landlord = await db.users.find_one({"id": prop["user_id"]}) if prop and prop.get("user_id") else None

    # Build synthetic stubs so the PDF always generates even with missing relations
    if tenant is None:
        tenant = {"first_name": lease.get("tenant_name", ""), "last_name": "", "email": "", "phone": ""}
    if unit is None:
        unit = {
            "unit_number": lease.get("unit_number", ""),
            "bedrooms": "",
            "bathrooms": "",
            "property_id": lease.get("property_id", ""),
        }
    if prop is None:
        prop = {
            "address": lease.get("property_address", ""),
            "city": lease.get("property_city", ""),
            "province": "QC",
            "postal_code": "",
            "name": lease.get("property_name", ""),
        }
    if landlord is None:
        landlord = {}

    try:
        pdf_bytes = generate_quebec_bail_pdf(
            lease=lease,
            tenant=tenant,
            unit=unit,
            prop=prop,
            landlord=landlord,
        )
        sigs = await db.signatures.find({"lease_id": lid}).to_list(10)
        for s in sigs:
            s.pop("_id", None)
        if sigs:
            pdf_bytes = _append_signature_page(pdf_bytes, sigs)
    except Exception as e:
        logger.error("[Tenant Bail PDF] Generation failed: %s", e)
        raise HTTPException(status_code=500, detail="Erreur lors de la génération du PDF.")

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="bail-{lid[:8]}.pdf"'},
    )


# ===========================
# AUTOMATIONS
# ===========================

class AutomationSettingUpdate(BaseModel):
    automation_id: str
    is_enabled: bool
    delay_days: Optional[int] = None

class AutomationsBatchUpdate(BaseModel):
    settings: List[AutomationSettingUpdate]

@api_router.get("/automations")
async def get_automations(current_user: dict = Depends(get_current_user)):
    docs = await db.automations.find({"user_id": current_user["id"]}).to_list(100)
    result = []
    for doc in docs:
        doc.pop("_id", None)
        result.append(doc)
    return result

@api_router.put("/automations")
async def save_automations(data: AutomationsBatchUpdate, current_user: dict = Depends(get_current_user)):
    for setting in data.settings:
        await db.automations.update_one(
            {"user_id": current_user["id"], "automation_id": setting.automation_id},
            {"$set": {
                "user_id": current_user["id"],
                "automation_id": setting.automation_id,
                "is_enabled": setting.is_enabled,
                "delay_days": setting.delay_days,
                "updated_at": datetime.utcnow().isoformat(),
            }},
            upsert=True
        )
    return {"ok": True, "saved": len(data.settings)}


# ===========================
# PORTFOLIO REPORT
# ===========================

@api_router.get("/reports/portfolio")
async def generate_portfolio_report(
    month: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    from reportlab.lib.pagesizes import letter
    from reportlab.lib import colors
    from reportlab.lib.units import inch
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, HRFlowable
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
    from io import BytesIO
    from fastapi.responses import StreamingResponse

    uid = current_user["id"]

    # Default to current month
    if not month:
        month = datetime.utcnow().strftime("%Y-%m")

    try:
        year, mo = month.split("-")
        year_int, mo_int = int(year), int(mo)
    except Exception:
        raise HTTPException(400, "Invalid month format. Use YYYY-MM")

    # Fetch all user data
    properties = await db.properties.find({"user_id": uid}).to_list(200)

    # Payments this month
    payments = await db.rent_payments.find({
        "user_id": uid,
        "month_year": {"$regex": f"^{month}"}
    }).to_list(500)

    # All pending/overdue this month
    all_payments_month = await db.rent_payments.find({
        "user_id": uid,
        "month_year": {"$regex": f"^{month}"}
    }).to_list(500)

    # Expenses this month
    expenses = await db.expenses.find({
        "user_id": uid,
        "date": {"$regex": f"^{month}"}
    }).to_list(500)

    # Maintenance open
    maintenance_open = await db.maintenance_requests.count_documents({
        "user_id": uid,
        "status": {"$in": ["open", "in_progress"]}
    })

    # Compute totals
    total_rent_collected = sum(p.get("amount", 0) for p in payments if p.get("status") == "paid")
    total_late_fees = sum(p.get("late_fee_amount", 0) for p in payments if p.get("late_fee_amount"))
    total_expected = sum(p.get("amount", 0) for p in all_payments_month)
    total_expenses = sum(e.get("amount", 0) for e in expenses)
    net_income = total_rent_collected - total_expenses

    total_units = sum(p.get("total_units", 0) for p in properties)
    occupied_units = sum(p.get("occupied_units", 0) for p in properties)
    occupancy_rate = round((occupied_units / total_units * 100) if total_units > 0 else 0)

    late_payments = [p for p in all_payments_month if p.get("status") in ("pending", "pending_confirmation")]

    # Expenses by category
    exp_by_cat = {}
    for e in expenses:
        cat = e.get("category", "Autre")
        exp_by_cat[cat] = exp_by_cat.get(cat, 0) + e.get("amount", 0)

    # Build PDF
    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=letter,
                            leftMargin=0.75*inch, rightMargin=0.75*inch,
                            topMargin=0.75*inch, bottomMargin=0.75*inch)

    styles = getSampleStyleSheet()
    TEAL = colors.HexColor("#0d9488")
    TEAL_LIGHT = colors.HexColor("#f0fdfa")
    GRAY = colors.HexColor("#6b7280")
    DARK = colors.HexColor("#111827")
    RED = colors.HexColor("#ef4444")

    h1 = ParagraphStyle("h1", fontSize=22, textColor=TEAL, fontName="Helvetica-Bold", spaceAfter=4)
    h2 = ParagraphStyle("h2", fontSize=13, textColor=DARK, fontName="Helvetica-Bold", spaceBefore=16, spaceAfter=6)
    body_style = ParagraphStyle("body", fontSize=10, textColor=GRAY, spaceAfter=4)
    small = ParagraphStyle("small", fontSize=8, textColor=GRAY)

    month_names = {
        "01": "Janvier", "02": "Février", "03": "Mars", "04": "Avril",
        "05": "Mai", "06": "Juin", "07": "Juillet", "08": "Août",
        "09": "Septembre", "10": "Octobre", "11": "Novembre", "12": "Décembre"
    }
    month_label = f"{month_names.get(str(mo_int).zfill(2), str(mo_int))} {year_int}"

    landlord_name = f"{current_user.get('first_name', '')} {current_user.get('last_name', '')}".strip() or current_user.get('email', '')

    story = []

    # Header
    story.append(Paragraph("Domely", h1))
    story.append(Paragraph(f"Rapport de portefeuille — {month_label}",
                           ParagraphStyle("sub", fontSize=14, textColor=DARK, fontName="Helvetica-Bold", spaceAfter=2)))
    story.append(Paragraph(f"Propriétaire: {landlord_name}", body_style))
    story.append(Paragraph(f"Généré le {datetime.utcnow().strftime('%d/%m/%Y')}", small))
    story.append(HRFlowable(width="100%", thickness=2, color=TEAL, spaceAfter=12))

    # KPI summary table
    story.append(Paragraph("Sommaire financier", h2))
    kpi_data = [
        ["Indicateur", "Valeur"],
        ["Loyers perçus", f"{total_rent_collected:,.0f} $"],
        ["Loyers attendus", f"{total_expected:,.0f} $"],
        ["Frais de retard perçus", f"{total_late_fees:,.0f} $"],
        ["Dépenses totales", f"{total_expenses:,.0f} $"],
        ["Revenu net", f"{net_income:,.0f} $"],
        ["Taux d'occupation", f"{occupancy_rate}%"],
        ["Demandes maintenance ouvertes", str(maintenance_open)],
        ["Paiements en retard ce mois", str(len(late_payments))],
    ]
    kpi_table = Table(kpi_data, colWidths=[3.5*inch, 2.5*inch])
    kpi_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), TEAL),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("BACKGROUND", (0, 1), (-1, -1), TEAL_LIGHT),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, TEAL_LIGHT]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        # Highlight net income row
        ("TEXTCOLOR", (1, 5), (1, 5), TEAL if net_income >= 0 else RED),
        ("FONTNAME", (1, 5), (1, 5), "Helvetica-Bold"),
    ]))
    story.append(kpi_table)

    # Property breakdown
    if properties:
        story.append(Paragraph("Détail par propriété", h2))
        prop_data = [["Propriété", "Unités", "Occupation", "Loyers perçus", "Dépenses"]]
        for prop in properties:
            prop_id = prop.get("id", "")
            prop_payments = [p for p in payments if p.get("property_id") == prop_id and p.get("status") == "paid"]
            prop_expenses = [e for e in expenses if e.get("property_id") == prop_id]
            prop_rent = sum(p.get("amount", 0) for p in prop_payments)
            prop_exp = sum(e.get("amount", 0) for e in prop_expenses)
            tu = prop.get("total_units", 0)
            ou = prop.get("occupied_units", 0)
            occ = f"{round(ou / tu * 100) if tu else 0}%"
            prop_data.append([
                prop.get("name", "—")[:30],
                f"{ou}/{tu}",
                occ,
                f"{prop_rent:,.0f} $",
                f"{prop_exp:,.0f} $",
            ])
        prop_table = Table(prop_data, colWidths=[2.2*inch, 0.8*inch, 0.9*inch, 1.2*inch, 1.0*inch])
        prop_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), TEAL),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, TEAL_LIGHT]),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ]))
        story.append(prop_table)

    # Expenses by category
    if exp_by_cat:
        story.append(Paragraph("Dépenses par catégorie", h2))
        cat_data = [["Catégorie", "Montant"]]
        for cat, amt in sorted(exp_by_cat.items(), key=lambda x: -x[1]):
            cat_data.append([cat, f"{amt:,.0f} $"])
        cat_table = Table(cat_data, colWidths=[3.5*inch, 2.5*inch])
        cat_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), TEAL),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, TEAL_LIGHT]),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ]))
        story.append(cat_table)

    # Footer
    story.append(Spacer(1, 20))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#e5e7eb")))
    story.append(Paragraph("Généré par Domely · domely.ca · Confidentiel",
                           ParagraphStyle("footer", fontSize=8, textColor=GRAY, alignment=TA_CENTER, spaceBefore=8)))

    doc.build(story)
    buf.seek(0)

    filename = f"domely-rapport-{month}.pdf"
    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


# ===========================
# ACCOUNT DATA EXPORT
# ===========================

@api_router.get("/account/export")
async def export_account_data(current_user: dict = Depends(get_current_user)):
    """
    Full account data export for GDPR / Loi 25 compliance.
    Returns all user data as a structured JSON response.
    """
    from fastapi.responses import StreamingResponse
    uid = current_user["id"]

    # Fetch all user data
    props       = await db.properties.find({"user_id": uid}).to_list(500)
    units       = await db.units.find({"property_id": {"$in": [p["id"] for p in props if "id" in p]}}).to_list(1000)
    tenants     = await db.tenants.find({"user_id": uid}).to_list(500)
    leases      = await db.leases.find({"user_id": uid}).to_list(500)
    payments    = await db.rent_payments.find({"user_id": uid}).to_list(2000)
    expenses    = await db.expenses.find({"user_id": uid}).to_list(1000)
    maintenance = await db.maintenance_requests.find({"user_id": uid}).to_list(500)
    automations = await db.automations.find({"user_id": uid}).to_list(100)

    def clean(items):
        result = []
        for item in items:
            item.pop("_id", None)
            item.pop("hashed_password", None)
            for k, v in item.items():
                if isinstance(v, datetime):
                    item[k] = v.isoformat()
            result.append(item)
        return result

    user_data = dict(current_user)
    user_data.pop("_id", None)
    user_data.pop("hashed_password", None)

    export = {
        "exported_at": datetime.utcnow().isoformat(),
        "user": user_data,
        "properties": clean(props),
        "units": clean(units),
        "tenants": clean(tenants),
        "leases": clean(leases),
        "rent_payments": clean(payments),
        "expenses": clean(expenses),
        "maintenance_requests": clean(maintenance),
        "automations": clean(automations),
    }

    import json
    json_bytes = json.dumps(export, ensure_ascii=False, indent=2).encode("utf-8")

    return StreamingResponse(
        iter([json_bytes]),
        media_type="application/json",
        headers={
            "Content-Disposition": f'attachment; filename="domely-export-{datetime.utcnow().strftime("%Y%m%d")}.json"'
        },
    )


async def _send_milestone_email(to_email: str, subject: str, html: str):
    """Internal helper — sends a milestone email via Resend. Silent no-op if key not set."""
    key = os.getenv("RESEND_API_KEY")
    if not key or not to_email:
        return
    try:
        import httpx
        async with httpx.AsyncClient() as hc:
            resp = await hc.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
                json={"from": "Domely <noreply@domely.ca>", "to": to_email, "subject": subject, "html": html},
                timeout=10,
            )
        logger.info("[Milestone] Email sent to %s — status %s", to_email, resp.status_code)
    except Exception as e:
        logger.warning("[Milestone] Email failed to %s: %s", to_email, e)


def _milestone_email_html(first: str, headline: str, sub: str, steps: list[dict], cta_href: str, cta_label: str) -> str:
    """Reusable milestone email template. steps = [{num, title, desc}]"""
    step_rows = ""
    for s in steps:
        step_rows += f"""
        <tr><td style="padding-bottom:14px;">
          <table width="100%" cellpadding="0" cellspacing="0"
            style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:12px;">
            <tr><td style="padding:14px 18px;">
              <div style="width:28px;height:28px;background:linear-gradient(135deg,#1E7A6E,#3FAF86);
                border-radius:50%;display:inline-flex;align-items:center;justify-content:center;
                font-weight:700;color:#fff;font-size:13px;float:left;margin-right:12px;">{s['num']}</div>
              <div style="overflow:hidden;">
                <div style="font-size:13px;font-weight:600;color:#134e4a;">{s['title']}</div>
                <div style="font-size:12px;color:#0f766e;margin-top:2px;">{s['desc']}</div>
              </div>
            </td></tr>
          </table>
        </td></tr>"""
    return f"""<!DOCTYPE html><html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 16px;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0"
      style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 8px rgba(0,0,0,0.06);">
      <tr>
        <td style="background:linear-gradient(135deg,#1E7A6E,#3FAF86);padding:32px 40px;text-align:center;">
          <span style="font-size:24px;font-weight:800;color:#fff;letter-spacing:-0.5px;">Domely</span>
          <div style="font-size:12px;color:rgba(255,255,255,0.75);margin-top:4px;">Gestion locative simplifiée</div>
        </td>
      </tr>
      <tr>
        <td style="padding:36px 40px 28px;">
          <h1 style="margin:0 0 6px;font-size:20px;font-weight:700;color:#111827;">
            {headline.replace('{first}', first)}
          </h1>
          <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">{sub}</p>
          <table width="100%" cellpadding="0" cellspacing="0">{step_rows}</table>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
            <tr><td align="center">
              <a href="{cta_href}"
                style="display:inline-block;background:linear-gradient(135deg,#1E7A6E,#3FAF86);
                color:#fff;font-size:14px;font-weight:600;text-decoration:none;
                padding:13px 32px;border-radius:12px;">{cta_label}</a>
            </td></tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:20px 40px 28px;border-top:1px solid #f3f4f6;text-align:center;background:#fafafa;">
          <p style="margin:0;font-size:11px;color:#9ca3af;">
            © 2026 Domely Inc. ·
            <a href="https://domely.ca" style="color:#1E7A6E;text-decoration:none;">domely.ca</a> ·
            <a href="https://domely.ca/dashboard/settings" style="color:#9ca3af;text-decoration:none;">Se désabonner</a>
          </p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body></html>"""


async def _on_first_property(user: dict, property_name: str):
    """Fires once when the landlord adds their very first property."""
    first = (user.get("full_name") or "").split()[0] or "là"
    html = _milestone_email_html(
        first=first,
        headline="Première propriété ajoutée — et maintenant, {first} ?",
        sub=f"<strong>{property_name}</strong> est maintenant dans votre Domely. Voici les 3 prochaines étapes pour en tirer le meilleur parti.",
        steps=[
            {"num": "1", "title": "Créez les unités",          "desc": "Ajoutez les logements de votre immeuble (numéro, chambres, loyer)."},
            {"num": "2", "title": "Invitez vos locataires",    "desc": "Ils reçoivent un lien magique pour accéder au portail locataire."},
            {"num": "3", "title": "Générez le bail TAL PDF",   "desc": "Créez un bail officiel québécois en 2 clics, envoyé automatiquement."},
        ],
        cta_href="https://domely.ca/dashboard/properties",
        cta_label="Gérer ma propriété →",
    )
    await _send_milestone_email(
        user.get("email", ""),
        f"🏠 Votre première propriété est enregistrée — et maintenant ?",
        html,
    )


async def _on_first_tenant(user: dict, tenant_name: str):
    """Fires once when the landlord adds their very first tenant."""
    first = (user.get("full_name") or "").split()[0] or "là"
    html = _milestone_email_html(
        first=first,
        headline=f"Locataire ajouté ! Invitez {tenant_name} au portail.",
        sub="Votre locataire peut maintenant accéder à son portail Domely — sans mot de passe, juste un lien.",
        steps=[
            {"num": "1", "title": "Envoyez le lien du portail",   "desc": "Depuis l'onglet locataire, cliquez « Inviter au portail »."},
            {"num": "2", "title": "Créez le bail officiel",       "desc": "Générez le bail TAL PDF et envoyez-le pour signature."},
            {"num": "3", "title": "Activez les paiements en ligne", "desc": "Connectez Stripe — le loyer est perçu automatiquement chaque mois."},
        ],
        cta_href="https://domely.ca/dashboard/tenants",
        cta_label="Voir mes locataires →",
    )
    await _send_milestone_email(
        user.get("email", ""),
        f"👤 {tenant_name} a été ajouté — invitez-le au portail !",
        html,
    )


async def _on_first_lease(user: dict, property_name: str):
    """Fires once when the landlord creates their very first lease."""
    first = (user.get("full_name") or "").split()[0] or "là"
    html = _milestone_email_html(
        first=first,
        headline="Votre premier bail est généré, {first} !",
        sub=f"Le bail pour <strong>{property_name}</strong> a été créé. Le PDF TAL officiel a été envoyé au locataire.",
        steps=[
            {"num": "1", "title": "Activez les paiements en ligne",   "desc": "Connectez Stripe — votre locataire paie en ligne, vous encaissez directement."},
            {"num": "2", "title": "Suivez les loyers chaque mois",    "desc": "Tableau de bord Loyers — payé, en attente, en retard — en un coup d'œil."},
            {"num": "3", "title": "Essayez Domely AI",                "desc": "Posez des questions sur vos finances, vos baux, vos locataires en langage naturel."},
        ],
        cta_href="https://domely.ca/dashboard/leases",
        cta_label="Voir mes baux →",
    )
    await _send_milestone_email(
        user.get("email", ""),
        "📄 Votre premier bail est prêt — activez les paiements en ligne",
        html,
    )


async def _send_welcome_email(to_email: str, full_name: str):
    """Send a welcome email after successful registration. Silent no-op if key not set."""
    key = os.getenv("RESEND_API_KEY")
    if not key or not to_email:
        logger.info("[Welcome] No RESEND_API_KEY — skipping welcome email to %s", to_email)
        return
    first = full_name.split()[0] if full_name else "là"
    html = f"""<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 8px rgba(0,0,0,0.06);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1E7A6E,#3FAF86);padding:36px 40px;text-align:center;">
            <img src="https://domely.ca/logo.svg" alt="Domely" width="40" height="40" style="display:inline-block;vertical-align:middle;margin-right:10px;" />
            <span style="font-size:26px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;vertical-align:middle;">Domely</span>
            <div style="font-size:13px;color:rgba(255,255,255,0.75);margin-top:6px;">Gestion locative simplifiée</div>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px 40px 32px;">
            <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">
              Bienvenue, {first} ! 👋
            </h1>
            <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">
              Votre compte Domely est prêt. Voici 3 étapes pour commencer à gérer vos propriétés en moins de 5 minutes.
            </p>

            <!-- Steps -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding-bottom:16px;">
                  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:12px;padding:0;">
                    <tr>
                      <td style="padding:16px 20px;">
                        <div style="display:flex;align-items:center;gap:12px;">
                          <div style="width:32px;height:32px;background:linear-gradient(135deg,#1E7A6E,#3FAF86);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-weight:700;color:#fff;font-size:14px;flex-shrink:0;">1</div>
                          <div style="display:inline-block;vertical-align:middle;margin-left:12px;">
                            <div style="font-size:14px;font-weight:600;color:#134e4a;">Ajoutez votre première propriété</div>
                            <div style="font-size:12px;color:#0f766e;margin-top:2px;">Adresse, nombre de logements, etc.</div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding-bottom:16px;">
                  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:12px;">
                    <tr>
                      <td style="padding:16px 20px;">
                        <div style="width:32px;height:32px;background:linear-gradient(135deg,#1E7A6E,#3FAF86);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-weight:700;color:#fff;font-size:14px;float:left;margin-right:12px;">2</div>
                        <div style="overflow:hidden;">
                          <div style="font-size:14px;font-weight:600;color:#134e4a;">Invitez vos locataires</div>
                          <div style="font-size:12px;color:#0f766e;margin-top:2px;">Ils accèdent au portail locataire sans mot de passe.</div>
                        </div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding-bottom:28px;">
                  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:12px;">
                    <tr>
                      <td style="padding:16px 20px;">
                        <div style="width:32px;height:32px;background:linear-gradient(135deg,#1E7A6E,#3FAF86);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-weight:700;color:#fff;font-size:14px;float:left;margin-right:12px;">3</div>
                        <div style="overflow:hidden;">
                          <div style="font-size:14px;font-weight:600;color:#134e4a;">Créez un bail &amp; activez les paiements</div>
                          <div style="font-size:12px;color:#0f766e;margin-top:2px;">Générez le bail officiel TAL et recevez les loyers en ligne.</div>
                        </div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <!-- CTA -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center">
                  <a href="https://domely.ca/dashboard" style="display:inline-block;background:linear-gradient(135deg,#1E7A6E,#3FAF86);color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:12px;">
                    Accéder à mon tableau de bord →
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:28px 40px 32px;border-top:1px solid #f3f4f6;text-align:center;background:#fafafa;">
            <img src="https://domely.ca/logo.svg" alt="" width="24" height="24" style="display:inline-block;vertical-align:middle;margin-bottom:10px;opacity:0.5;" /><br>
            <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#6b7280;">
              Propulsé par <a href="https://domely.ca" style="color:#1E7A6E;text-decoration:none;font-weight:700;">Domely</a>
            </p>
            <p style="margin:0 0 10px;font-size:11px;color:#9ca3af;">
              La plateforme de gestion locative pour propriétaires nord-américains
            </p>
            <p style="margin:0;font-size:11px;color:#d1d5db;">
              © 2026 Domely Inc. · <a href="https://domely.ca" style="color:#9ca3af;text-decoration:none;">domely.ca</a>
              &nbsp;·&nbsp; <a href="https://domely.ca/privacy" style="color:#9ca3af;text-decoration:none;">Confidentialité</a>
              &nbsp;·&nbsp; <a href="https://domely.ca/terms" style="color:#9ca3af;text-decoration:none;">Conditions</a>
            </p>
            <p style="margin:10px 0 0;font-size:10px;color:#d1d5db;">
              Vous recevez cet email car vous venez de créer un compte sur domely.ca
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>"""
    try:
        import httpx
        async with httpx.AsyncClient() as hc:
            resp = await hc.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
                json={"from": "Domely <noreply@domely.ca>", "to": to_email,
                      "subject": f"Bienvenue sur Domely, {first} ! 🏠", "html": html},
                timeout=10,
            )
        logger.info("[Welcome] Email sent to %s — status %s", to_email, resp.status_code)
    except Exception as e:
        logger.warning("[Welcome] Email send failed to %s: %s", to_email, e)


_EMAIL_FOOTER = """
<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;border-top:1px solid #e5e7eb;">
  <tr><td style="padding:18px 0;text-align:center;">
    <p style="margin:0 0 6px;font-size:11px;color:#9ca3af;">
      Vous recevez cet email car vous avez activé les notifications automatiques sur
      <a href="https://domely.ca" style="color:#1E7A6E;text-decoration:none;">Domely</a>.
    </p>
    <a href="https://domely.ca/dashboard/automations"
       style="font-size:11px;color:#6b7280;text-decoration:underline;">Gérer mes notifications</a>
    &nbsp;&middot;&nbsp;
    <a href="https://domely.ca/dashboard/settings"
       style="font-size:11px;color:#6b7280;text-decoration:underline;">Paramètres du compte</a>
  </td></tr>
</table>"""

async def _send_auto_email(to_email: str, subject: str, html_body: str):
    """Generic Resend mailer for automation emails. Appends opt-out footer. Silent no-op if key not set."""
    if not RESEND_API_KEY or not to_email:
        logger.info("[Automations] No RESEND_API_KEY or recipient — skipping email to %s", to_email)
        return
    # Inject footer before </body> if present, otherwise append
    if "</body>" in html_body:
        full_html = html_body.replace("</body>", f"{_EMAIL_FOOTER}</body>", 1)
    else:
        full_html = html_body + _EMAIL_FOOTER
    import httpx
    async with httpx.AsyncClient() as client_http:
        try:
            resp = await client_http.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {RESEND_API_KEY}", "Content-Type": "application/json"},
                json={"from": "Domely <noreply@domely.ca>", "to": to_email,
                      "subject": subject, "html": full_html},
                timeout=10,
            )
            logger.info("[Automations] Email sent to %s — status %s", to_email, resp.status_code)
        except Exception as e:
            logger.warning("[Automations] Email send failed to %s: %s", to_email, e)


async def _send_push_notification(token: str, title: str, body: str, data: dict = None):
    """Send a push notification via Expo Push API. Silent no-op if token missing/invalid."""
    if not token or not token.startswith("ExponentPushToken"):
        return
    try:
        import httpx
        async with httpx.AsyncClient() as http:
            await http.post(
                "https://exp.host/--/api/v2/push/send",
                json={"to": token, "title": title, "body": body,
                      "data": data or {}, "sound": "default", "channelId": "default"},
                headers={"Content-Type": "application/json"},
                timeout=8.0,
            )
    except Exception as e:
        logger.warning("[Push] Failed to send push notification: %s", e)


async def run_daily_automations():
    """Daily runner — checks enabled automations for each user and triggers actions."""
    logger.info("[Automations] Daily run started at %s", datetime.utcnow().isoformat())
    today = date.today()

    users = await db.users.find({}).to_list(1000)
    for user in users:
        user_id = user.get("id")
        if not user_id:
            continue
        landlord_email = user.get("email", "")

        settings_list = await db.automations.find({"user_id": user_id}).to_list(100)
        settings = {s["automation_id"]: s for s in settings_list}

        def is_enabled(aid: str, default: bool = True) -> bool:
            return settings[aid]["is_enabled"] if aid in settings else default

        def get_delay(aid: str, default: int = 3) -> int:
            return (settings[aid].get("delay_days") or default) if aid in settings else default

        props = await db.properties.find({"user_id": user_id}).to_list(200)
        prop_ids = [p["id"] for p in props if "id" in p]
        prop_names = {p["id"]: p.get("name", "") for p in props}
        units = await db.units.find({"property_id": {"$in": prop_ids}}).to_list(500)
        unit_ids = [u["id"] for u in units if "id" in u]

        # ── rent_reminder: notify landlord N days before 1st of next month
        if is_enabled("rent_reminder"):
            delay = get_delay("rent_reminder", 3)
            next_first = date(today.year + (1 if today.month == 12 else 0),
                              (today.month % 12) + 1, 1)
            if (next_first - today).days == delay:
                occupied = [u for u in units if u.get("is_occupied")]
                if occupied and landlord_email:
                    unit_list = "".join(
                        f"<li>Logement {u.get('unit_number','?')} — {prop_names.get(u.get('property_id',''),'')}</li>"
                        for u in occupied
                    )
                    await _send_auto_email(
                        landlord_email,
                        f"Domely — Rappel : loyers dus dans {delay} jour{'s' if delay > 1 else ''}",
                        f"""<h2 style="color:#1E7A6E">Rappel de loyer</h2>
                        <p>Les loyers suivants sont dus le <strong>1er {next_first.strftime('%B %Y')}</strong> :</p>
                        <ul>{unit_list}</ul>
                        <p style="color:#999;font-size:12px">Gérez vos paiements dans l'appli Domely.</p>""",
                    )
                    logger.info("[Automations] rent_reminder → %d units, email sent to %s", len(occupied), landlord_email)

        # ── late_alert: flag unpaid units past due + delay
        if is_enabled("late_alert"):
            delay = get_delay("late_alert", 1)
            if today.day >= (1 + delay):
                current_month = today.strftime("%Y-%m")
                for unit in [u for u in units if u.get("is_occupied")]:
                    paid = await db.rent_payments.find_one(
                        {"unit_id": unit["id"], "month_year": current_month}
                    )
                    if not paid and landlord_email:
                        prop_name = prop_names.get(unit.get("property_id", ""), "")
                        unit_label = f"Logement {unit.get('unit_number','?')} — {prop_name}"
                        await _send_auto_email(
                            landlord_email,
                            f"Domely ⚠️ Loyer impayé — {unit_label}",
                            f"""<h2 style="color:#DC2626">Loyer impayé</h2>
                            <p>Le loyer de <strong>{unit_label}</strong> n'a pas été reçu pour <strong>{current_month}</strong>.</p>
                            <p>Il est maintenant en retard de {today.day - 1} jour(s).</p>
                            <p style="color:#999;font-size:12px">Consultez l'appli Domely pour envoyer un avis.</p>""",
                        )
                        logger.info("[Automations] late_alert → unit %s (no payment for %s)", unit["id"], current_month)

        # ── lease_renewal: alert N days before lease end
        if is_enabled("lease_renewal"):
            delay = get_delay("lease_renewal", 90)
            leases = await db.leases.find({"unit_id": {"$in": unit_ids}}).to_list(500)
            for lease in leases:
                end_str = lease.get("end_date")
                if end_str:
                    try:
                        end_date = date.fromisoformat(str(end_str)[:10])
                        if (end_date - today).days == delay and landlord_email:
                            unit = next((u for u in units if u["id"] == lease.get("unit_id")), None)
                            unit_label = f"Logement {unit.get('unit_number','?')} — {prop_names.get(unit.get('property_id',''),'')}" if unit else lease.get("unit_id","")
                            await _send_auto_email(
                                landlord_email,
                                f"Domely — Renouvellement de bail dans {delay} jours",
                                f"""<h2 style="color:#1E7A6E">Renouvellement de bail</h2>
                                <p>Le bail de <strong>{unit_label}</strong> se termine le <strong>{end_str}</strong>.</p>
                                <p>Il reste <strong>{delay} jours</strong> pour envoyer un avis de renouvellement (délai légal : 3 mois).</p>
                                <p style="color:#999;font-size:12px">Gérez le renouvellement dans l'appli Domely.</p>""",
                            )
                            logger.info("[Automations] lease_renewal → lease %s ends %s", lease.get("id"), end_str)
                    except ValueError:
                        pass

        # ── monthly_report: send on 1st of month
        if is_enabled("monthly_report", False) and today.day == 1 and landlord_email:
            last_month = (today.replace(day=1) - timedelta(days=1))
            month_str = last_month.strftime("%Y-%m")
            month_label = last_month.strftime("%B %Y")
            total_units = len(units)
            occupied_count = len([u for u in units if u.get("is_occupied")])
            payments = await db.rent_payments.find({"user_id": user_id, "month_year": month_str}).to_list(500)
            total_collected = sum(p.get("amount", 0) for p in payments)
            open_tickets = await db.maintenance_requests.count_documents(
                {"property_id": {"$in": prop_ids}, "status": "open"}
            )
            await _send_auto_email(
                landlord_email,
                f"Domely — Rapport mensuel {month_label}",
                f"""<h2 style="color:#1E7A6E">Rapport mensuel — {month_label}</h2>
                <table style="width:100%;border-collapse:collapse">
                  <tr><td style="padding:8px;border-bottom:1px solid #eee">Logements occupés</td><td style="font-weight:bold;text-align:right">{occupied_count} / {total_units}</td></tr>
                  <tr><td style="padding:8px;border-bottom:1px solid #eee">Loyers perçus</td><td style="font-weight:bold;text-align:right">{len(payments)} paiement(s)</td></tr>
                  <tr><td style="padding:8px;border-bottom:1px solid #eee">Total encaissé</td><td style="font-weight:bold;text-align:right;color:#1E7A6E">{total_collected:,.0f} $</td></tr>
                  <tr><td style="padding:8px">Travaux ouverts</td><td style="font-weight:bold;text-align:right;color:{'#DC2626' if open_tickets > 0 else '#10B981'}">{open_tickets}</td></tr>
                </table>
                <p style="color:#999;font-size:12px;margin-top:16px">Consultez le tableau de bord Domely pour plus de détails.</p>""",
            )
            logger.info("[Automations] monthly_report → user %s sent for %s", user_id, month_label)

        # ── maintenance_followup: alert on stale tickets
        if is_enabled("maintenance_followup"):
            delay = get_delay("maintenance_followup", 7)
            cutoff = (datetime.utcnow() - timedelta(days=delay)).isoformat()
            stale = await db.maintenance_requests.find({
                "property_id": {"$in": prop_ids},
                "status": {"$in": ["open", "in_progress"]},
                "updated_at": {"$lt": cutoff}
            }).to_list(100)
            for ticket in stale:
                if landlord_email:
                    prop_name = prop_names.get(ticket.get("property_id", ""), "")
                    await _send_auto_email(
                        landlord_email,
                        f"Domely — Entretien sans suivi depuis {delay} jours",
                        f"""<h2 style="color:#F59E0B">Demande d'entretien en attente</h2>
                        <p>La demande <strong>« {ticket.get('title','?')} »</strong> ({prop_name}) n'a pas été mise à jour depuis <strong>{delay} jours</strong>.</p>
                        <p>Statut actuel : <strong>{ticket.get('status','?')}</strong></p>
                        <p style="color:#999;font-size:12px">Consultez l'appli Domely pour mettre à jour le statut.</p>""",
                    )
                    logger.info("[Automations] maintenance_followup → ticket %s stale %s days", ticket.get("id"), delay)

        # ── push notifications: send for the most urgent items
        push_token = user.get("expo_push_token", "")
        if push_token:
            # Late rent push (after day 5)
            if today.day >= 5:
                current_month = today.strftime("%Y-%m")
                late_units = []
                for unit in [u for u in units if u.get("is_occupied")]:
                    paid = await db.rent_payments.find_one({"unit_id": unit["id"], "month_year": current_month})
                    if not paid:
                        late_units.append(unit.get("unit_number", "?"))
                if late_units:
                    count = len(late_units)
                    await _send_push_notification(
                        push_token,
                        "⚠️ Loyer(s) impayé(s)",
                        f"{count} logement{'s' if count > 1 else ''} n'a pas payé pour {current_month}.",
                        {"route": "/(tabs)/tenants"},
                    )
            # Expiring leases push (within 30 days)
            leases_for_push = await db.leases.find({"unit_id": {"$in": unit_ids}}).to_list(500)
            urgent_leases = []
            for lease in leases_for_push:
                end_str = lease.get("end_date")
                if end_str:
                    try:
                        days_left = (date.fromisoformat(str(end_str)[:10]) - today).days
                        if 0 < days_left <= 30:
                            urgent_leases.append(days_left)
                    except ValueError:
                        pass
            if urgent_leases:
                min_days = min(urgent_leases)
                await _send_push_notification(
                    push_token,
                    "📋 Bail(s) expirant bientôt",
                    f"Un bail expire dans {min_days} jours — envoyez l'avis de renouvellement.",
                    {"route": "/(tabs)/tenants"},
                )

    logger.info("[Automations] Daily run complete")
    await _apply_late_fees()
    """Apply late fee charges to overdue rent payments based on per-property config."""
    today = date.today()
    logger.info("[LateFees] Checking for payments eligible for late fees on %s", today.isoformat())

    # Fetch all properties that have a late fee configured
    props_with_fees = await db.properties.find(
        {"late_fee_amount": {"$gt": 0}}
    ).to_list(1000)

    for prop in props_with_fees:
        prop_id = prop.get("id")
        fee_amount = float(prop.get("late_fee_amount") or 0)
        grace_days = int(prop.get("late_fee_grace_days") or 0)

        if not prop_id or fee_amount <= 0:
            continue

        # Find units for this property
        units = await db.units.find({"property_id": prop_id}).to_list(200)
        unit_ids = [u["id"] for u in units if "id" in u]
        if not unit_ids:
            continue

        # Find payments that are late or pending, not yet waived, and not already charged
        candidates = await db.rent_payments.find({
            "unit_id": {"$in": unit_ids},
            "status": {"$in": ["late", "pending"]},
            "late_fee_waived": {"$ne": True},
            "$or": [
                {"late_fee_amount": {"$exists": False}},
                {"late_fee_amount": 0},
                {"late_fee_amount": None},
            ],
        }).to_list(500)

        for payment in candidates:
            due_date_str = payment.get("due_date") or payment.get("payment_date")
            if not due_date_str:
                # Estimate due date from month_year: assume day 1 of that month
                month_year = payment.get("month_year", "")
                if len(month_year) == 7:
                    try:
                        due_date = date.fromisoformat(f"{month_year}-01")
                    except ValueError:
                        continue
                else:
                    continue
            else:
                try:
                    due_date = date.fromisoformat(str(due_date_str)[:10])
                except ValueError:
                    continue

            days_overdue = (today - due_date).days
            if days_overdue > grace_days:
                payment_id = payment.get("id")
                if payment_id:
                    await db.rent_payments.update_one(
                        {"id": payment_id},
                        {"$set": {"late_fee_amount": fee_amount}}
                    )
                    logger.info(
                        "[LateFees] Applied $%.2f fee to payment %s (%d days overdue, grace=%d)",
                        fee_amount, payment_id, days_overdue, grace_days
                    )


# ===========================
# MORTGAGES & INSURANCE
# ===========================

class MortgageCreate(BaseModel):
    property_name: str
    lender: str
    original_amount: Optional[float] = 0
    balance: float
    interest_rate: float
    monthly_payment: float
    term_years: Optional[int] = 5
    amortization_years: Optional[int] = 25
    start_date: Optional[str] = None
    maturity_date: Optional[str] = None
    next_payment_date: Optional[str] = None
    type: Optional[str] = "fixed"

class InsuranceCreate(BaseModel):
    property_name: str
    insurer: str
    policy_number: Optional[str] = ""
    type: Optional[str] = "comprehensive"
    annual_premium: float
    coverage_amount: Optional[float] = 0
    renewal_date: Optional[str] = None
    deductible: Optional[float] = 0
    contact_phone: Optional[str] = ""

@api_router.get("/mortgages")
async def get_mortgages(current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    docs = await db.mortgages.find({"user_id": user_id}).sort("property_name", 1).to_list(200)
    result = []
    for d in docs:
        d["id"] = str(d.pop("_id"))
        result.append(d)
    return result

@api_router.post("/mortgages")
async def create_mortgage(data: MortgageCreate, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    doc = {**data.dict(), "user_id": user_id, "id": str(uuid.uuid4())}
    await db.mortgages.insert_one({**doc, "_id": doc["id"]})
    return doc

@api_router.put("/mortgages/{mortgage_id}")
async def update_mortgage(mortgage_id: str, data: MortgageCreate, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    await db.mortgages.update_one(
        {"_id": mortgage_id, "user_id": user_id},
        {"$set": data.dict()}
    )
    return {"ok": True}

@api_router.delete("/mortgages/{mortgage_id}")
async def delete_mortgage(mortgage_id: str, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    await db.mortgages.delete_one({"_id": mortgage_id, "user_id": user_id})
    return {"ok": True}

@api_router.get("/insurance")
async def get_insurance(current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    docs = await db.insurance.find({"user_id": user_id}).sort("property_name", 1).to_list(200)
    result = []
    for d in docs:
        d["id"] = str(d.pop("_id"))
        result.append(d)
    return result

@api_router.post("/insurance")
async def create_insurance(data: InsuranceCreate, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    doc = {**data.dict(), "user_id": user_id, "id": str(uuid.uuid4())}
    await db.insurance.insert_one({**doc, "_id": doc["id"]})
    return doc

@api_router.put("/insurance/{insurance_id}")
async def update_insurance(insurance_id: str, data: InsuranceCreate, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    await db.insurance.update_one(
        {"_id": insurance_id, "user_id": user_id},
        {"$set": data.dict()}
    )
    return {"ok": True}

@api_router.delete("/insurance/{insurance_id}")
async def delete_insurance(insurance_id: str, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    await db.insurance.delete_one({"_id": insurance_id, "user_id": user_id})
    return {"ok": True}


# ===========================
# INSPECTIONS
# ===========================

class InspectionCreate(BaseModel):
    type: str
    unit: str
    tenant: str
    date: str
    status: str = "completed"
    items: list = []
    items_done: int = 0
    total_items: int = 0

@api_router.get("/inspections")
async def get_inspections(current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    docs = await db.inspections.find({"user_id": user_id}).sort("date", -1).to_list(500)
    result = []
    for d in docs:
        d["id"] = str(d.pop("_id"))
        result.append(d)
    return result

@api_router.post("/inspections")
async def create_inspection(data: InspectionCreate, current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    doc = {**data.dict(), "user_id": user_id, "id": str(uuid.uuid4()), "created_at": datetime.utcnow().isoformat()}
    await db.inspections.insert_one({**doc, "_id": doc["id"]})
    return doc

@api_router.put("/inspections/{inspection_id}")
async def update_inspection(inspection_id: str, data: InspectionCreate, current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    update = {**data.dict(), "updated_at": datetime.utcnow().isoformat()}
    result = await db.inspections.update_one(
        {"_id": inspection_id, "user_id": user_id},
        {"$set": update}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Inspection not found")
    doc = await db.inspections.find_one({"_id": inspection_id})
    doc["id"] = str(doc.pop("_id"))
    return doc

@api_router.delete("/inspections/{inspection_id}")
async def delete_inspection(inspection_id: str, current_user: dict = Depends(get_current_user)):
    user_id = current_user["id"]
    await db.inspections.delete_one({"id": inspection_id, "user_id": user_id})
    return {"ok": True}

@api_router.get("/inspections/{inspection_id}/report.pdf")
async def download_inspection_report(inspection_id: str, current_user: dict = Depends(get_current_user)):
    from reportlab.lib.pagesizes import letter
    from reportlab.lib import colors
    from reportlab.lib.units import inch
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, HRFlowable
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_CENTER
    from io import BytesIO
    from fastapi.responses import StreamingResponse

    insp = await db.inspections.find_one({"id": inspection_id, "user_id": current_user["id"]})
    if not insp:
        raise HTTPException(404, "Not found")

    TEAL = colors.HexColor("#0d9488")
    TEAL_LIGHT = colors.HexColor("#f0fdfa")
    GRAY = colors.HexColor("#6b7280")
    GREEN = colors.HexColor("#16a34a")
    RED = colors.HexColor("#dc2626")

    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=letter,
                            leftMargin=0.75*inch, rightMargin=0.75*inch,
                            topMargin=0.75*inch, bottomMargin=0.75*inch)
    styles = getSampleStyleSheet()
    h1  = ParagraphStyle("h1",  fontSize=20, textColor=TEAL,  fontName="Helvetica-Bold", spaceAfter=4)
    h2  = ParagraphStyle("h2",  fontSize=12, textColor=colors.HexColor("#111827"), fontName="Helvetica-Bold", spaceBefore=14, spaceAfter=6)
    body= ParagraphStyle("body",fontSize=10, textColor=GRAY,  spaceAfter=3)

    type_map   = {"move_in":"Entrée","move_out":"Sortie","periodic":"Périodique","routine":"Périodique","emergency":"Urgence"}
    status_map = {"scheduled":"Planifiée","completed":"Complétée","pending":"En attente"}

    story = []
    story.append(Paragraph("Domely", h1))
    story.append(Paragraph(
        f"Rapport d'inspection — {type_map.get(insp.get('type',''), insp.get('type',''))}",
        ParagraphStyle("sub", fontSize=14, textColor=colors.HexColor("#111827"), fontName="Helvetica-Bold", spaceAfter=2)
    ))
    story.append(Paragraph(f"Propriété: {insp.get('property_name') or insp.get('property_id','—')}", body))
    story.append(Paragraph(f"Date: {insp.get('scheduled_date') or insp.get('completed_date','—')}", body))
    story.append(Paragraph(f"Statut: {status_map.get(insp.get('status',''), insp.get('status',''))}", body))
    story.append(HRFlowable(width="100%", thickness=2, color=TEAL, spaceAfter=12))

    checklist = insp.get("checklist") or []
    if checklist:
        story.append(Paragraph("Liste de vérification", h2))
        rows = [["Élément", "État", "Notes"]]
        for item in checklist:
            st = item.get("status","ok")
            label = "✓ OK" if st=="ok" else ("⚠ Problème" if st=="issue" else "N/A")
            color_hex = "#16a34a" if st=="ok" else ("#dc2626" if st=="issue" else "#6b7280")
            rows.append([
                item.get("label",""),
                Paragraph(f'<font color="{color_hex}">{label}</font>',
                          ParagraphStyle("s",fontSize=9)),
                item.get("note","") or "",
            ])
        tbl = Table(rows, colWidths=[2.8*inch, 1.2*inch, 2.1*inch])
        tbl.setStyle(TableStyle([
            ("BACKGROUND",   (0,0),(-1,0), TEAL),
            ("TEXTCOLOR",    (0,0),(-1,0), colors.white),
            ("FONTNAME",     (0,0),(-1,0), "Helvetica-Bold"),
            ("FONTSIZE",     (0,0),(-1,-1), 9),
            ("ROWBACKGROUNDS",(0,1),(-1,-1),[colors.white, TEAL_LIGHT]),
            ("GRID",         (0,0),(-1,-1), 0.5, colors.HexColor("#e5e7eb")),
            ("TOPPADDING",   (0,0),(-1,-1), 5),
            ("BOTTOMPADDING",(0,0),(-1,-1), 5),
            ("LEFTPADDING",  (0,0),(-1,-1), 8),
            ("RIGHTPADDING", (0,0),(-1,-1), 8),
        ]))
        story.append(tbl)

    if insp.get("notes"):
        story.append(Paragraph("Notes", h2))
        story.append(Paragraph(_rl_safe(insp["notes"]), body))

    ok_count    = sum(1 for i in checklist if i.get("status")=="ok")
    issue_count = sum(1 for i in checklist if i.get("status")=="issue")
    story.append(Spacer(1,12))
    story.append(Paragraph(
        f"Résumé: {ok_count} élément(s) conforme(s) · {issue_count} problème(s) détecté(s)",
        ParagraphStyle("sum", fontSize=10, textColor=TEAL, fontName="Helvetica-Bold")
    ))
    story.append(Spacer(1,20))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#e5e7eb")))
    story.append(Paragraph("Généré par Domely · domely.ca · Confidentiel",
                           ParagraphStyle("footer", fontSize=8, textColor=GRAY, alignment=TA_CENTER, spaceBefore=8)))
    doc.build(story)
    buf.seek(0)
    filename = f"inspection-{inspection_id[:8]}.pdf"
    return StreamingResponse(buf, media_type="application/pdf",
                             headers={"Content-Disposition": f'attachment; filename="{filename}"'})


# ===========================
# UNITS SUMMARY (for market-rent screen)
# ===========================

@api_router.get("/units-summary")
async def get_units_summary(current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    units = await db.units.find({"user_id": user_id}).to_list(500)
    result = []
    for u in units:
        uid = u.get("id", str(u.get("_id", "")))
        u["id"] = uid
        u.pop("_id", None)
        prop = await db.properties.find_one({"id": u.get("property_id")})
        u["property_name"] = prop["name"] if prop else ""
        tenant = await db.tenants.find_one({"unit_id": uid, "user_id": user_id})
        if tenant:
            u["tenant_name"] = f"{tenant.get('first_name', '')} {tenant.get('last_name', '')}".strip()
            lease = await db.leases.find_one({"unit_id": uid, "user_id": user_id, "is_active": True})
            u["lease_end"] = lease.get("end_date") if lease else None
            u["current_rent"] = tenant.get("rent_amount", u.get("rent_amount", 0))
        else:
            u["tenant_name"] = None
            u["lease_end"] = None
            u["current_rent"] = u.get("rent_amount", 0)
        result.append(u)
    return result


# ===========================
# PUSH TOKEN REGISTRATION
# ===========================

@api_router.post("/push-token")
async def register_push_token(body: dict, current_user: dict = Depends(get_current_user)):
    """Store the Expo push token on the user document."""
    user_id = str(current_user["_id"])
    token = body.get("token", "")
    if token:
        await db.users.update_one({"_id": user_id}, {"$set": {"expo_push_token": token}})
    return {"ok": True}


# ===========================
# STRIPE CONNECT — RENT PAYMENTS
# ===========================

import stripe as stripe_lib

STRIPE_SECRET_KEY      = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_PLATFORM_ACCT   = os.getenv("STRIPE_PLATFORM_ACCOUNT_ID", "")
STRIPE_CONNECT_RETURN  = os.getenv("NEXT_PUBLIC_APP_URL", "https://domely.app") + "/dashboard/settings?stripe=connected"
STRIPE_CONNECT_REFRESH = os.getenv("NEXT_PUBLIC_APP_URL", "https://domely.app") + "/dashboard/settings?stripe=refresh"

def _stripe():
    stripe_lib.api_key = STRIPE_SECRET_KEY
    return stripe_lib


@api_router.post("/stripe/connect/onboard")
async def stripe_connect_onboard(current_user: dict = Depends(get_current_user)):
    """Create (or resume) Stripe Connect Express account for a landlord and return onboarding URL."""
    if not STRIPE_SECRET_KEY:
        raise HTTPException(status_code=500, detail="Stripe not configured")
    s = _stripe()
    account_id = current_user.get("stripe_account_id")
    try:
        if not account_id:
            acct = s.Account.create(
                type="express",
                country="CA",
                email=current_user.get("email"),
                capabilities={"card_payments": {"requested": True}, "transfers": {"requested": True}},
            )
            account_id = acct["id"]
            await db.users.update_one(
                {"id": current_user["id"]},
                {"$set": {"stripe_account_id": account_id, "stripe_account_status": "onboarding"}},
            )
        link = s.AccountLink.create(
            account=account_id,
            return_url=STRIPE_CONNECT_RETURN,
            refresh_url=STRIPE_CONNECT_REFRESH,
            type="account_onboarding",
        )
        return {"url": link["url"]}
    except Exception as e:
        logger.error("[Stripe Connect onboard] %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/stripe/connect/status")
async def stripe_connect_status(current_user: dict = Depends(get_current_user)):
    """Return the landlord's Stripe Connect account status."""
    account_id = current_user.get("stripe_account_id")
    if not account_id:
        return {"connected": False, "charges_enabled": False, "payouts_enabled": False, "account_id": None}
    if not STRIPE_SECRET_KEY:
        return {"connected": False, "charges_enabled": False, "payouts_enabled": False, "account_id": None}
    try:
        s = _stripe()
        acct = s.Account.retrieve(account_id)
        charges_enabled = acct.get("charges_enabled", False)
        payouts_enabled = acct.get("payouts_enabled", False)
        status_val = "active" if charges_enabled else "onboarding"
        await db.users.update_one(
            {"id": current_user["id"]},
            {"$set": {"stripe_account_status": status_val}},
        )
        return {
            "connected": True,
            "charges_enabled": charges_enabled,
            "payouts_enabled": payouts_enabled,
            "account_id": account_id,
        }
    except Exception as e:
        logger.error("[Stripe Connect status] %s", e)
        return {"connected": False, "charges_enabled": False, "payouts_enabled": False, "account_id": account_id}


@api_router.post("/tenant/payments/create-intent")
async def create_rent_payment_intent(current_tenant: dict = Depends(get_current_tenant)):
    """Create a Stripe PaymentIntent for the current month's rent (called by tenant portal)."""
    if not STRIPE_SECRET_KEY:
        raise HTTPException(status_code=500, detail="Stripe not configured")
    tenant_id = current_tenant.get("id") or current_tenant.get("tenant_id")
    lease = await db.leases.find_one({"tenant_id": tenant_id, "is_active": True})
    if not lease:
        raise HTTPException(status_code=404, detail="No active lease found")
    rent_amount = float(lease.get("rent_amount", 0))
    if rent_amount <= 0:
        raise HTTPException(status_code=400, detail="Invalid rent amount")
    landlord = await db.users.find_one({"id": lease.get("landlord_id") or lease.get("user_id")})
    if not landlord:
        raise HTTPException(status_code=404, detail="Landlord not found")
    landlord_stripe_id = landlord.get("stripe_account_id")
    if not landlord_stripe_id:
        raise HTTPException(status_code=400, detail="Landlord has not connected Stripe yet")
    s = _stripe()
    # ── Fee structure: tenant absorbs all fees so landlord receives full rent ──
    # Domely fee = 1% of rent (fixed dollar amount, routed to platform)
    # Gross-up formula: charge = (rent + domely_fee + stripe_fixed) / (1 - stripe_rate)
    # This ensures: charge - stripe_fee - domely_fee = rent  (landlord is made whole)
    STRIPE_RATE   = 0.029   # 2.9%
    STRIPE_FIXED  = 0.30    # $0.30 per transaction
    DOMELY_RATE   = 0.01    # 1%
    domely_fee    = round(rent_amount * DOMELY_RATE, 2)
    gross_amount  = round((rent_amount + domely_fee + STRIPE_FIXED) / (1 - STRIPE_RATE), 2)
    processing_fee = round(gross_amount - rent_amount, 2)   # shown to tenant as line item
    amount_cents  = int(gross_amount * 100)
    app_fee_cents = int(domely_fee * 100)
    try:
        intent = s.PaymentIntent.create(
            amount=amount_cents,
            currency="cad",
            application_fee_amount=app_fee_cents,
            transfer_data={"destination": landlord_stripe_id},
            metadata={
                "tenant_id":    tenant_id,
                "lease_id":     str(lease.get("id", "")),
                "landlord_id":  str(landlord.get("id", "")),
                "month_year":   datetime.utcnow().strftime("%Y-%m"),
                "rent_amount":  str(rent_amount),
            },
        )
        return {
            "client_secret":  intent["client_secret"],
            "amount":         gross_amount,     # total charged to tenant
            "rent_amount":    rent_amount,       # base rent (what landlord receives)
            "processing_fee": processing_fee,    # fees shown to tenant
        }
    except Exception as e:
        logger.error("[Stripe PaymentIntent] %s", e)
        raise HTTPException(status_code=500, detail=str(e))


# ===========================
# INTERNAL — STRIPE SUBSCRIPTION
# ===========================

@api_router.post("/internal/subscription")
async def update_subscription(body: dict, request: Request):
    """Called by the Next.js Stripe webhook to update a user's plan. Protected by X-Internal-Key."""
    import os
    key = request.headers.get("X-Internal-Key", "")
    if not key or key != os.getenv("INTERNAL_API_KEY", ""):
        raise HTTPException(status_code=401, detail="Unauthorized")
    email = body.get("email", "").strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="email required")
    update: dict = {
        "plan":       body.get("plan", "free"),
        "plan_status": body.get("plan_status", "active"),
    }
    if body.get("stripe_customer_id"):
        update["stripe_customer_id"] = body["stripe_customer_id"]
    if body.get("stripe_subscription_id"):
        update["stripe_subscription_id"] = body["stripe_subscription_id"]
    result = await db.users.update_one({"email": email}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"ok": True}


@api_router.post("/internal/rent-payment")
async def internal_record_rent_payment(body: dict, request: Request):
    """Called by Stripe webhook (charge.succeeded) to record a tenant rent payment."""
    key = request.headers.get("X-Internal-Key", "")
    if not key or key != os.getenv("INTERNAL_API_KEY", ""):
        raise HTTPException(status_code=401, detail="Unauthorized")
    tenant_id  = body.get("tenant_id", "")
    lease_id   = body.get("lease_id", "")
    amount     = float(body.get("amount", 0))
    month_year = body.get("month_year", datetime.utcnow().strftime("%Y-%m"))
    intent_id  = body.get("stripe_payment_intent_id", "")
    if not tenant_id or not lease_id:
        raise HTTPException(status_code=400, detail="tenant_id and lease_id required")
    # Check for duplicate (same intent_id)
    if intent_id:
        existing = await db.rent_payments.find_one({"stripe_payment_intent_id": intent_id})
        if existing:
            return {"ok": True, "duplicate": True}
    # Fetch lease to get unit_id
    lease = await db.leases.find_one({"id": lease_id})
    unit_id = lease.get("unit_id", "") if lease else ""
    payment_doc = {
        "id":           str(uuid.uuid4()),
        "tenant_id":    tenant_id,
        "lease_id":     lease_id,
        "unit_id":      unit_id,
        "amount":       amount,
        "payment_date": datetime.utcnow().isoformat(),
        "payment_method": "stripe",
        "month_year":   month_year,
        "status":       "paid",
        "stripe_payment_intent_id": intent_id,
        "created_at":   datetime.utcnow(),
    }
    await db.rent_payments.insert_one(payment_doc)
    logger.info("[Stripe] Rent payment recorded: %s tenant=%s amount=%.2f", intent_id, tenant_id, amount)
    return {"ok": True, "id": payment_doc["id"]}


@api_router.post("/internal/stripe-connect-status")
async def internal_update_connect_status(body: dict, request: Request):
    """Called by Stripe webhook (account.updated) to sync landlord Connect account status."""
    key = request.headers.get("X-Internal-Key", "")
    if not key or key != os.getenv("INTERNAL_API_KEY", ""):
        raise HTTPException(status_code=401, detail="Unauthorized")
    account_id      = body.get("account_id", "")
    charges_enabled = body.get("charges_enabled", False)
    payouts_enabled = body.get("payouts_enabled", False)
    if not account_id:
        raise HTTPException(status_code=400, detail="account_id required")
    status_val = "active" if charges_enabled else "onboarding"
    result = await db.users.update_one(
        {"stripe_account_id": account_id},
        {"$set": {"stripe_account_status": status_val, "stripe_charges_enabled": charges_enabled, "stripe_payouts_enabled": payouts_enabled}},
    )
    logger.info("[Stripe] Connect status updated: %s → %s (matched=%d)", account_id, status_val, result.matched_count)
    return {"ok": True}


# ===========================
# HEALTH CHECK
# ===========================

# ===========================
# ADMIN ROUTES
# ===========================

class AdminPlanUpdate(BaseModel):
    plan: str          # "free" | "pro" | "team"
    plan_status: str = "active"   # "active" | "cancelled" | "past_due"

@api_router.get("/admin/stats")
async def admin_get_stats(_admin: dict = Depends(require_admin)):
    """Platform-wide overview stats for the admin panel."""
    total_users      = await db.users.count_documents({})
    free_users       = await db.users.count_documents({"plan": "free"})
    pro_users        = await db.users.count_documents({"plan": "pro"})
    team_users       = await db.users.count_documents({"plan": "team"})
    total_properties = await db.properties.count_documents({})
    total_tenants    = await db.tenants.count_documents({})
    total_leases     = await db.leases.count_documents({})
    return {
        "total_users":      total_users,
        "free_users":       free_users,
        "pro_users":        pro_users,
        "team_users":       team_users,
        "total_properties": total_properties,
        "total_tenants":    total_tenants,
        "total_leases":     total_leases,
    }

@api_router.get("/admin/users")
async def admin_list_users(_admin: dict = Depends(require_admin)):
    """Return all users with per-user property / tenant counts."""
    users_raw = await db.users.find({}, {"hashed_password": 0}).to_list(length=2000)
    result = []
    for u in users_raw:
        prop_count   = await db.properties.count_documents({"user_id": u["id"]})
        tenant_count = await db.tenants.count_documents({"user_id": u["id"]})
        result.append({
            "id":           u["id"],
            "email":        u["email"],
            "full_name":    u.get("full_name", ""),
            "phone":        u.get("phone", ""),
            "plan":         u.get("plan", "free"),
            "plan_status":  u.get("plan_status", "active"),
            "is_admin":     u.get("is_admin", False),
            "created_at":   u.get("created_at", "").isoformat() if hasattr(u.get("created_at", ""), "isoformat") else str(u.get("created_at", "")),
            "properties":   prop_count,
            "tenants":      tenant_count,
        })
    # Sort newest first
    result.sort(key=lambda x: x["created_at"], reverse=True)
    return result

@api_router.patch("/admin/users/{user_id}/plan")
async def admin_update_plan(user_id: str, data: AdminPlanUpdate, _admin: dict = Depends(require_admin)):
    """Change a user's plan and plan_status."""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"plan": data.plan, "plan_status": data.plan_status}}
    )
    return {"ok": True}

@api_router.patch("/admin/users/{user_id}/toggle-admin")
async def admin_toggle_admin(user_id: str, _admin: dict = Depends(require_admin)):
    """Grant or revoke admin status for a user."""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    new_val = not user.get("is_admin", False)
    await db.users.update_one({"id": user_id}, {"$set": {"is_admin": new_val}})
    return {"ok": True, "is_admin": new_val}

@api_router.delete("/admin/users/{user_id}")
async def admin_delete_user(user_id: str, _admin: dict = Depends(require_admin)):
    """Permanently delete a user account and ALL their data."""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.get("is_admin", False):
        raise HTTPException(status_code=400, detail="Cannot delete an admin account")
    # Cascade delete all user data
    for collection in [
        db.properties, db.units, db.tenants, db.leases,
        db.rent_payments, db.maintenance_requests, db.expenses,
        db.reminders, db.contractors, db.team_members,
        db.inspections, db.applicants,
    ]:
        await collection.delete_many({"user_id": user_id})
    await db.users.delete_one({"id": user_id})
    return {"ok": True}

@api_router.get("/")
async def root():
    return {"message": "Plexio API", "version": "2.0.0"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

# ── Waitlist ──────────────────────────────────────────────────────────────────

PAIN_LABELS = {
    "chasing_rent":  "Je cours après les loyers chaque mois",
    "texts_chaos":   "Je gère tout par texto — c'est le chaos",
    "rent_increase": "J'ai peur de mal calculer ma hausse de loyer",
    "below_market":  "Je ne sais pas si mes loyers sont au prix du marché",
    "scattered":     "Mes finances et dépenses sont éparpillées partout",
}

async def _send_waitlist_confirmation(email: str, first_name: Optional[str]):
    """Send confirmation email to the new waitlist subscriber via Resend."""
    key = os.getenv("RESEND_API_KEY")
    if not key:
        return
    first = first_name.strip() if first_name else ""
    greeting = f"Bienvenue, {first}" if first else "Bienvenue"
    html = f"""<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:48px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.07);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1E7A6E,#3FAF86);padding:40px 40px 36px;text-align:center;">
            <div style="font-size:28px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;margin-bottom:8px;">Domely</div>
            <div style="font-size:14px;color:rgba(255,255,255,0.85);letter-spacing:0.3px;">Votre partenaire de gestion locative</div>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:44px 40px 36px;">

            <h1 style="margin:0 0 20px;font-size:24px;font-weight:700;color:#111827;letter-spacing:-0.3px;">{greeting}.</h1>
            <p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.7;">
              Votre inscription est confirmée. À partir d'aujourd'hui, votre prix de lancement est gelé — pour toujours.
            </p>
            <p style="margin:0 0 28px;font-size:15px;color:#374151;line-height:1.7;">
              On construit Domely pour des propriétaires qui veulent gérer sérieusement, sans y passer leurs soirées. On a hâte de vous le faire découvrir.
            </p>

            <!-- Perks -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf9;border:1px solid #a7f3d0;border-radius:12px;margin-bottom:28px;">
              <tr><td style="padding:22px 26px;">
                <div style="font-size:12px;font-weight:700;color:#065f46;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:14px;">Ce qui vous attend</div>
                <table cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding:5px 0;font-size:14px;color:#065f46;">
                      <span style="display:inline-block;width:20px;font-weight:700;">&#8212;</span> Prix de lancement garanti à vie pour les 500 premiers
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:5px 0;font-size:14px;color:#065f46;">
                      <span style="display:inline-block;width:20px;font-weight:700;">&#8212;</span> Accès prioritaire avant l'ouverture publique
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:5px 0;font-size:14px;color:#065f46;">
                      <span style="display:inline-block;width:20px;font-weight:700;">&#8212;</span> Appel de bienvenue avec l'équipe fondatrice
                    </td>
                  </tr>
                </table>
              </td></tr>
            </table>

            <!-- Share -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;margin-bottom:36px;">
              <tr><td style="padding:18px 26px;">
                <div style="font-size:14px;color:#374151;line-height:1.6;">
                  On ouvre à 500 inscrits. Connaissez-vous un propriétaire qui gagnerait à simplifier sa gestion ?
                  <br><a href="https://www.domely.ca/early-access" style="color:#1E7A6E;font-weight:600;text-decoration:none;">domely.ca/early-access</a>
                </div>
              </td></tr>
            </table>

            <p style="margin:0;font-size:14px;color:#6b7280;line-height:1.7;">
              À très bientôt,<br>
              <strong style="color:#111827;">L'équipe Domely</strong>
            </p>

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:18px 40px;border-top:1px solid #f3f4f6;text-align:center;">
            <p style="margin:0;font-size:11px;color:#9ca3af;">
              Cet email est envoyé automatiquement — merci de ne pas y répondre.<br>
              Domely · Canada · <a href="https://www.domely.ca/privacy" style="color:#9ca3af;text-decoration:none;">Confidentialité</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>"""
    async with aiohttp.ClientSession() as session:
        await session.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
            json={"from": "Domely <noreply@domely.ca>", "to": email,
                  "subject": f"{greeting} — votre place chez Domely est confirmée", "html": html},
        )

async def _notify_admin_waitlist(email: str, first_name: Optional[str], unit_count: Optional[str], pain_point: Optional[str], total_count: int):
    """Send admin notification for each new waitlist signup."""
    key = os.getenv("RESEND_API_KEY")
    admin_email = os.getenv("ADMIN_NOTIFY_EMAIL")
    if not key or not admin_email:
        return
    pain_label = PAIN_LABELS.get(pain_point or "", pain_point or "—")
    html = f"""<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:32px 16px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 6px rgba(0,0,0,0.06);">
        <tr>
          <td style="background:linear-gradient(135deg,#1E7A6E,#3FAF86);padding:20px 28px;">
            <span style="font-size:16px;font-weight:700;color:#fff;">Domely — Nouveau inscrit sur la liste</span>
          </td>
        </tr>
        <tr>
          <td style="padding:28px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
              <tr style="background:#f9fafb;"><td style="padding:10px 16px;font-size:12px;font-weight:600;color:#6b7280;border-bottom:1px solid #e5e7eb;">INFORMATIONS</td></tr>
              <tr><td style="padding:12px 16px;border-bottom:1px solid #f3f4f6;">
                <span style="font-size:12px;color:#9ca3af;">Courriel</span><br>
                <span style="font-size:14px;font-weight:600;color:#111827;">{email}</span>
              </td></tr>
              <tr><td style="padding:12px 16px;border-bottom:1px solid #f3f4f6;">
                <span style="font-size:12px;color:#9ca3af;">Prénom</span><br>
                <span style="font-size:14px;color:#111827;">{first_name or '—'}</span>
              </td></tr>
              <tr><td style="padding:12px 16px;border-bottom:1px solid #f3f4f6;">
                <span style="font-size:12px;color:#9ca3af;">Logements</span><br>
                <span style="font-size:14px;color:#111827;">{unit_count or '—'}</span>
              </td></tr>
              <tr><td style="padding:12px 16px;border-bottom:1px solid #f3f4f6;">
                <span style="font-size:12px;color:#9ca3af;">Défi principal</span><br>
                <span style="font-size:14px;color:#111827;">{pain_label}</span>
              </td></tr>
              <tr style="background:#f0fdfa;"><td style="padding:12px 16px;">
                <span style="font-size:12px;color:#0f766e;font-weight:600;">Total sur la liste : {total_count + 414}</span>
              </td></tr>
            </table>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""
    async with aiohttp.ClientSession() as session:
        await session.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
            json={"from": "Domely <noreply@domely.ca>", "to": admin_email,
                  "subject": f"Nouvel inscrit — {email} ({unit_count or '?'} logements)", "html": html},
        )

class WaitlistEntry(BaseModel):
    email: str
    first_name: Optional[str] = None
    unit_count: Optional[str] = None   # "1-2" | "3-10" | "11-50" | "50+"
    pain_point: Optional[str] = None   # dropdown value
    source: Optional[str] = None       # UTM source
    medium: Optional[str] = None       # UTM medium
    campaign: Optional[str] = None     # UTM campaign

@api_router.post("/waitlist")
async def join_waitlist(data: WaitlistEntry):
    email = data.email.strip().lower()
    if not email or "@" not in email:
        raise HTTPException(400, "Email invalide")
    existing = await db.waitlist.find_one({"email": email})
    if existing:
        return {"success": True, "already_registered": True}
    entry = {
        "id": str(uuid.uuid4()),
        "email": email,
        "first_name": data.first_name,
        "unit_count": data.unit_count,
        "pain_point": data.pain_point,
        "source": data.source,
        "medium": data.medium,
        "campaign": data.campaign,
        "created_at": datetime.utcnow().isoformat(),
    }
    await db.waitlist.insert_one(entry)
    total = await db.waitlist.count_documents({})
    asyncio.create_task(_send_waitlist_confirmation(email, data.first_name))
    asyncio.create_task(_notify_admin_waitlist(email, data.first_name, data.unit_count, data.pain_point, total))
    return {"success": True, "already_registered": False}

@api_router.get("/waitlist/count")
async def get_waitlist_count():
    count = await db.waitlist.count_documents({})
    return {"count": count + 414}   # seed offset

@api_router.get("/waitlist/export")
async def export_waitlist(secret: str = ""):
    if secret != os.environ.get("ADMIN_SECRET", "domely-admin-2026"):
        raise HTTPException(403, "Unauthorized")
    from fastapi.responses import StreamingResponse
    from io import StringIO
    import csv as csv_module
    entries = await db.waitlist.find({}).sort("created_at", 1).to_list(5000)
    buf = StringIO()
    writer = csv_module.DictWriter(buf, fieldnames=["email","first_name","unit_count","pain_point","source","medium","campaign","created_at"])
    writer.writeheader()
    for e in entries:
        e.pop("_id", None)
        e.pop("id", None)
        writer.writerow({k: e.get(k,"") for k in writer.fieldnames})
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=domely-waitlist.csv"}
    )

# Include the router
app.include_router(api_router)

_raw_origins = os.environ.get("ALLOWED_ORIGINS", "*")
_allowed_origins = [o.strip() for o in _raw_origins.split(",")] if _raw_origins != "*" else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=_allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition", "Content-Type", "Content-Length"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    scheduler.shutdown(wait=False)
    client.close()

DEMO_EMAIL    = "demo@domely.app"
DEMO_PASSWORD = "Demo1234!"
DEMO_NAME     = "Alex Dupont (Demo)"

async def ensure_demo_account():
    """Create the shared demo account and seed it if it doesn't already exist."""
    existing = await db.users.find_one({"email": DEMO_EMAIL})
    if existing:
        # Already exists — just make sure demo data is present
        has_props = await db.properties.find_one({"user_id": existing["id"]})
        if not has_props:
            logger.info("[Demo] Seeding demo data for existing demo account…")
            await seed_demo_data(existing)
        return

    logger.info("[Demo] Creating demo account: %s", DEMO_EMAIL)
    demo_id = str(uuid.uuid4())
    hashed  = pwd_context.hash(DEMO_PASSWORD)
    demo_user = {
        "id":              demo_id,
        "email":           DEMO_EMAIL,
        "full_name":       DEMO_NAME,
        "hashed_password": hashed,
        "plan":            "pro",
        "plan_status":     "active",
        "is_demo":         True,
        "created_at":      datetime.utcnow(),
    }
    await db.users.insert_one(demo_user)
    logger.info("[Demo] Demo account created — seeding data…")
    await seed_demo_data(demo_user)
    logger.info("[Demo] Done. Login: %s / %s", DEMO_EMAIL, DEMO_PASSWORD)

# ════════════════════════════════════════════════════════════════════════════
#  E-SIGNATURES
# ════════════════════════════════════════════════════════════════════════════

class SignatureSave(BaseModel):
    signer_type: str          # "landlord" | "tenant"
    signature_data: str       # base64 PNG data-URL (data:image/png;base64,…)
    signer_name: str


@api_router.post("/leases/{lease_id}/sign")
async def save_signature(
    lease_id: str,
    body: SignatureSave,
    current_user: dict = Depends(get_current_user),
):
    """Save (or replace) the landlord or tenant signature for a lease."""
    lease = await db.leases.find_one({"id": lease_id, "user_id": current_user["id"]})
    if not lease:
        raise HTTPException(status_code=404, detail="Bail introuvable")

    # Replace any existing signature of the same type
    await db.signatures.delete_many({"lease_id": lease_id, "signer_type": body.signer_type})

    sig_id = str(uuid.uuid4())
    doc = {
        "id":             sig_id,
        "lease_id":       lease_id,
        "user_id":        current_user["id"],
        "signer_type":    body.signer_type,
        "signature_data": body.signature_data,
        "signer_name":    body.signer_name,
        "signed_at":      datetime.utcnow().isoformat() + "Z",
    }
    await db.signatures.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.get("/leases/{lease_id}/signatures")
async def get_signatures(
    lease_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Return all e-signatures saved for a lease."""
    lease = await db.leases.find_one({"id": lease_id, "user_id": current_user["id"]})
    if not lease:
        raise HTTPException(status_code=404, detail="Bail introuvable")
    sigs = await db.signatures.find({"lease_id": lease_id}).to_list(10)
    for s in sigs:
        s.pop("_id", None)
    return sigs


@api_router.delete("/signatures/{sig_id}")
async def delete_signature(
    sig_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Delete a specific e-signature."""
    sig = await db.signatures.find_one({"id": sig_id, "user_id": current_user["id"]})
    if not sig:
        raise HTTPException(status_code=404, detail="Signature introuvable")
    await db.signatures.delete_one({"id": sig_id})
    return {"ok": True}


# ════════════════════════════════════════════════════════════════════════════
#  TENANT E-SIGNATURE FLOW  (landlord sends → tenant signs via secure link)
# ════════════════════════════════════════════════════════════════════════════

@api_router.post("/leases/{lease_id}/send-for-signing")
async def send_lease_for_signing(lease_id: str, current_user: dict = Depends(get_current_user)):
    """
    Landlord triggers this to email the tenant a one-time secure signing link.
    Creates a sign_request doc with a UUID token (valid 7 days).
    """
    lease = await db.leases.find_one({"id": lease_id, "user_id": current_user["id"]})
    if not lease:
        raise HTTPException(status_code=404, detail="Bail introuvable")

    tenant_id = lease.get("tenant_id")
    tenant = await db.tenants.find_one({"id": tenant_id}) if tenant_id else None
    if not tenant or not tenant.get("email"):
        raise HTTPException(status_code=400, detail="Adresse email du locataire introuvable")

    # Create / refresh sign request
    token = str(uuid.uuid4())
    expires_at = datetime.utcnow() + timedelta(days=7)
    await db.sign_requests.update_one(
        {"lease_id": lease_id},
        {"$set": {
            "lease_id":   lease_id,
            "user_id":    current_user["id"],
            "tenant_id":  tenant_id,
            "token":      token,
            "expires_at": expires_at,
            "status":     "pending",
            "created_at": datetime.utcnow(),
        }},
        upsert=True,
    )

    app_url = os.getenv("NEXT_PUBLIC_APP_URL", "https://domely.app")
    sign_url = f"{app_url}/portail/sign/{token}"
    tenant_first = (tenant.get("first_name") or "").split()[0] or "là"

    # Property/unit info for email
    prop = await db.properties.find_one({"id": lease.get("property_id")}) or {}
    prop_addr = prop.get("address") or prop.get("name") or "—"

    html = f"""<!DOCTYPE html><html lang="fr"><body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 16px;">
  <tr><td align="center">
    <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;">
      <tr><td style="background:linear-gradient(135deg,#1E7A6E,#3FAF86);padding:28px 36px;">
        <div style="font-size:22px;font-weight:800;color:#fff;">Domely</div>
        <div style="font-size:13px;color:#a7f3d0;margin-top:4px;">Signature de bail</div>
      </td></tr>
      <tr><td style="padding:32px 36px;">
        <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111827;">Bonjour {tenant_first} !</h2>
        <p style="margin:0 0 20px;font-size:14px;color:#6b7280;line-height:1.6;">
          Votre propriétaire vous invite à signer électroniquement votre bail pour <strong>{prop_addr}</strong>.
          Cliquez sur le bouton ci-dessous pour consulter et signer le document.
        </p>
        <p style="text-align:center;margin:0 0 24px;">
          <a href="{sign_url}" style="display:inline-block;background:linear-gradient(135deg,#1E7A6E,#3FAF86);color:#fff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 36px;border-radius:12px;">
            Signer mon bail
          </a>
        </p>
        <p style="margin:0 0 8px;font-size:12px;color:#9ca3af;text-align:center;">
          Ce lien est valide pendant 7 jours. Il ne peut être utilisé qu&apos;une seule fois.
        </p>
      </td></tr>
      <tr><td style="padding:16px 36px;border-top:1px solid #f3f4f6;text-align:center;">
        <p style="margin:0;font-size:11px;color:#9ca3af;">
          Signature électronique valide au Québec — LCCJTI (L.R.Q., c. C-1.1)<br>
          Domely · <a href="https://domely.ca" style="color:#1E7A6E;text-decoration:none;">domely.ca</a>
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>"""

    await _send_auto_email(
        tenant["email"],
        f"Domely — Signez votre bail pour {prop_addr}",
        html,
    )

    return {"ok": True, "sent_to": tenant["email"], "expires_at": expires_at.isoformat() + "Z"}


class TenantSignBody(BaseModel):
    signature_data: str   # base64 PNG data-URL
    signer_name: str
    ip_address: Optional[str] = None


@app.get("/api/sign/{token}")
async def get_sign_request(token: str):
    """Public — return lease summary for the tenant to review before signing."""
    req = await db.sign_requests.find_one({"token": token, "status": "pending"})
    if not req:
        raise HTTPException(status_code=404, detail="Lien de signature invalide ou expiré")
    if req["expires_at"] < datetime.utcnow():
        raise HTTPException(status_code=410, detail="Lien de signature expiré")

    lease = await db.leases.find_one({"id": req["lease_id"]}) or {}
    prop  = await db.properties.find_one({"id": lease.get("property_id")}) or {}
    return {
        "lease_id":    req["lease_id"],
        "tenant_id":   req["tenant_id"],
        "property":    prop.get("address") or prop.get("name") or "—",
        "unit":        lease.get("unit_number") or "—",
        "start_date":  lease.get("start_date") or "—",
        "end_date":    lease.get("end_date") or "—",
        "rent_amount": lease.get("rent_amount") or 0,
        "expires_at":  req["expires_at"].isoformat() + "Z",
    }


@app.post("/api/sign/{token}")
async def submit_tenant_signature(token: str, body: TenantSignBody, request: Request):
    """Public — tenant submits their signature. Records IP + timestamp for legal audit trail."""
    req = await db.sign_requests.find_one({"token": token, "status": "pending"})
    if not req:
        raise HTTPException(status_code=404, detail="Lien de signature invalide ou déjà utilisé")
    if req["expires_at"] < datetime.utcnow():
        raise HTTPException(status_code=410, detail="Lien de signature expiré")

    ip_addr = body.ip_address or request.client.host if request.client else "unknown"

    sig_id = str(uuid.uuid4())
    doc = {
        "id":             sig_id,
        "lease_id":       req["lease_id"],
        "user_id":        req["user_id"],
        "signer_type":    "tenant",
        "signature_data": body.signature_data,
        "signer_name":    body.signer_name,
        "signed_at":      datetime.utcnow().isoformat() + "Z",
        "ip_address":     ip_addr,
        "sign_method":    "email_link",   # audit trail for LCCJTI compliance
    }
    await db.signatures.insert_one(doc)

    # Mark sign request as used
    await db.sign_requests.update_one(
        {"token": token},
        {"$set": {"status": "signed", "signed_at": datetime.utcnow()}},
    )

    # Notify landlord
    landlord = await db.users.find_one({"id": req["user_id"]})
    tenant   = await db.tenants.find_one({"id": req["tenant_id"]}) or {}
    tenant_name = f"{tenant.get('first_name', '')} {tenant.get('last_name', '')}".strip() or "Le locataire"
    if landlord and landlord.get("email"):
        await _send_auto_email(
            landlord["email"],
            f"Domely — {tenant_name} a signé le bail ✍️",
            f"""<p>Bonjour,</p>
<p><strong>{tenant_name}</strong> a signé électroniquement le bail.
L'IP enregistrée est <code>{ip_addr}</code> ({datetime.utcnow().strftime('%d/%m/%Y %H:%M')} UTC).</p>
<p>Téléchargez le PDF du bail dans votre tableau de bord Domely pour obtenir la version finale avec la page de certification.</p>
<p>L'équipe Domely</p>""",
        )

    doc.pop("_id", None)
    return doc


# ════════════════════════════════════════════════════════════════════════════
# STRIPE WEBHOOK  (Stripe → FastAPI directly, no /api prefix)
# ════════════════════════════════════════════════════════════════════════════

@app.post("/webhooks/stripe")
async def stripe_webhook(request: Request):
    """
    Real Stripe webhook endpoint.  Configure in Stripe Dashboard:
      URL: https://yourdomain.com/webhooks/stripe
      Events to listen for:
        • payment_intent.succeeded
        • account.updated  (Connect)
        • capability.updated
    """
    payload      = await request.body()
    sig_header   = request.headers.get("stripe-signature", "")
    webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET", "")

    # Verify signature in production; accept unsigned in dev
    try:
        s = _stripe()
        if webhook_secret and sig_header:
            event = s.Webhook.construct_event(payload, sig_header, webhook_secret)
        else:
            import json as _json
            event = _json.loads(payload)
            logger.warning("[Stripe Webhook] No webhook secret — skipping signature verification")
    except Exception as exc:
        logger.warning("[Stripe Webhook] Signature verification failed: %s", exc)
        raise HTTPException(status_code=400, detail="Invalid Stripe signature")

    event_type = event.get("type", "")
    obj        = event.get("data", {}).get("object", {})
    logger.info("[Stripe Webhook] Received: %s", event_type)

    # ── Rent paid online ─────────────────────────────────────────────────────
    if event_type == "payment_intent.succeeded":
        intent_id  = obj.get("id", "")
        metadata   = obj.get("metadata", {})
        tenant_id  = metadata.get("tenant_id", "")
        lease_id   = metadata.get("lease_id", "")
        month_year = metadata.get("month_year", datetime.utcnow().strftime("%Y-%m"))
        rent_amount = float(metadata.get("rent_amount", 0))

        if tenant_id and lease_id and intent_id:
            exists = await db.rent_payments.find_one({"stripe_payment_intent_id": intent_id})
            if not exists:
                payment_id = str(uuid.uuid4())
                await db.rent_payments.insert_one({
                    "id":                       payment_id,
                    "lease_id":                 lease_id,
                    "tenant_id":                tenant_id,
                    "amount":                   rent_amount,
                    "payment_date":             datetime.utcnow().isoformat() + "Z",
                    "status":                   "paid",
                    "payment_method":           "stripe_online",
                    "month_year":               month_year,
                    "stripe_payment_intent_id": intent_id,
                    "created_at":               datetime.utcnow(),
                })
                logger.info("[Stripe Webhook] Rent payment recorded: tenant=%s amount=%s", tenant_id, rent_amount)

                # Notify landlord
                lease = await db.leases.find_one({"id": lease_id})
                if lease:
                    landlord = await db.users.find_one({"id": lease.get("user_id", "")})
                    tenant   = await db.tenants.find_one({"id": tenant_id})
                    if landlord and tenant:
                        import asyncio as _aio
                        tenant_name = f"{tenant.get('first_name','')} {tenant.get('last_name','')}".strip()
                        _aio.create_task(_send_auto_email(
                            landlord.get("email", ""),
                            f"Loyer reçu — {tenant_name} · {month_year}",
                            f"""<p style="font-family:sans-serif;font-size:15px;">
                            <strong>{tenant_name}</strong> a payé son loyer de <strong>${rent_amount:,.2f}</strong>
                            pour <strong>{month_year}</strong> via Domely Paiements en ligne.</p>
                            <p style="font-family:sans-serif;font-size:13px;color:#6b7280;">
                            Le montant sera déposé sur votre compte Stripe dans 2 jours ouvrables.</p>""",
                        ))

    # ── Stripe Connect account updated ──────────────────────────────────────
    elif event_type in ("account.updated", "capability.updated"):
        account_id      = obj.get("id", "")
        charges_enabled = obj.get("charges_enabled", False)
        payouts_enabled = obj.get("payouts_enabled", False)
        if account_id:
            status_val = "active" if charges_enabled else "onboarding"
            await db.users.update_one(
                {"stripe_account_id": account_id},
                {"$set": {
                    "stripe_account_status":   status_val,
                    "stripe_charges_enabled":  charges_enabled,
                    "stripe_payouts_enabled":  payouts_enabled,
                }},
            )
            logger.info("[Stripe Webhook] Connect status synced: %s → %s", account_id, status_val)

    return {"received": True}


# ════════════════════════════════════════════════════════════════════════════
# TAL RENT INCREASE — send notice by email to tenant
# ════════════════════════════════════════════════════════════════════════════

class RentIncreaseNoticeBody(BaseModel):
    new_rent:       float
    increase_pct:   float
    effective_date: str   # ISO date string
    notice_html:    str   # pre-rendered HTML notice (generated client-side)


@api_router.post("/leases/{lease_id}/send-rent-increase-notice")
async def send_rent_increase_notice(
    lease_id: str,
    body: RentIncreaseNoticeBody,
    current_user: dict = Depends(get_current_user),
):
    """Email the TAL rent increase notice to the tenant."""
    lease = await db.leases.find_one({"id": lease_id, "user_id": current_user["id"]})
    if not lease:
        raise HTTPException(status_code=404, detail="Bail introuvable")
    tenant = await db.tenants.find_one({"id": lease.get("tenant_id")})
    if not tenant or not tenant.get("email"):
        raise HTTPException(status_code=400, detail="Locataire sans adresse email")

    landlord_name = current_user.get("full_name", "Votre propriétaire")
    tenant_first  = tenant.get("first_name", "")
    prop = await db.properties.find_one({"id": lease.get("property_id")}) or {}
    address = prop.get("address") or prop.get("name") or "votre logement"

    html = f"""<!DOCTYPE html><html lang="fr">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 16px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0"
  style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 8px rgba(0,0,0,0.06);">
  <tr>
    <td style="background:linear-gradient(135deg,#1E7A6E,#3FAF86);padding:28px 40px;text-align:center;">
      <span style="font-size:22px;font-weight:800;color:#fff;">Domely</span>
      <div style="font-size:12px;color:rgba(255,255,255,0.75);margin-top:4px;">Avis de modification de loyer</div>
    </td>
  </tr>
  <tr>
    <td style="padding:32px 40px;">
      <p style="font-size:15px;color:#111827;margin:0 0 8px;">Bonjour {tenant_first},</p>
      <p style="font-size:14px;color:#6b7280;line-height:1.6;margin:0 0 24px;">
        Vous recevez cet avis concernant une modification du montant de votre loyer pour le logement situé au
        <strong>{address}</strong>.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0"
        style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:12px;margin-bottom:24px;">
        <tr><td style="padding:20px 24px;">
          <div style="font-size:13px;color:#134e4a;font-weight:600;margin-bottom:12px;">Détails de la hausse</div>
          <table width="100%">
            <tr>
              <td style="font-size:13px;color:#6b7280;padding-bottom:8px;">Loyer actuel :</td>
              <td style="font-size:13px;font-weight:600;color:#111827;text-align:right;padding-bottom:8px;">{lease.get('rent_amount', 0):,.2f} $</td>
            </tr>
            <tr>
              <td style="font-size:13px;color:#6b7280;padding-bottom:8px;">Hausse proposée :</td>
              <td style="font-size:13px;font-weight:600;color:#1E7A6E;text-align:right;padding-bottom:8px;">+{body.increase_pct:.1f}%</td>
            </tr>
            <tr style="border-top:1px solid #99f6e4;">
              <td style="font-size:14px;font-weight:700;color:#111827;padding-top:10px;">Nouveau loyer :</td>
              <td style="font-size:14px;font-weight:700;color:#1E7A6E;text-align:right;padding-top:10px;">{body.new_rent:,.2f} $ / mois</td>
            </tr>
          </table>
          <p style="font-size:12px;color:#0f766e;margin:12px 0 0;">
            En vigueur à partir du : <strong>{body.effective_date}</strong>
          </p>
        </td></tr>
      </table>
      <p style="font-size:13px;color:#6b7280;line-height:1.6;margin:0 0 16px;">
        Conformément à la <strong>Loi sur le logement (RLRQ c L-6.001)</strong> et aux lignes directrices du
        <strong>Tribunal administratif du logement (TAL)</strong>, cet avis vous est transmis dans les délais
        prescrits. Vous avez le droit de refuser cette hausse et de vous adresser au TAL.
      </p>
      <p style="font-size:13px;color:#6b7280;margin:0 0 24px;">
        Pour toute question : contactez <strong>{landlord_name}</strong> via le portail Domely.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td align="center">
          <a href="https://domely.ca/portail"
            style="display:inline-block;background:linear-gradient(135deg,#1E7A6E,#3FAF86);
            color:#fff;font-size:14px;font-weight:600;text-decoration:none;
            padding:12px 28px;border-radius:12px;">Accéder à mon portail →</a>
        </td></tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding:16px 40px 24px;border-top:1px solid #f3f4f6;text-align:center;background:#fafafa;">
      <p style="margin:0;font-size:11px;color:#9ca3af;">
        © 2026 Domely Inc. · <a href="https://domely.ca" style="color:#1E7A6E;text-decoration:none;">domely.ca</a>
      </p>
    </td>
  </tr>
</table>
</td></tr>
</table>
</body></html>"""

    await _send_auto_email(
        tenant.get("email", ""),
        f"Avis de hausse de loyer — {address} · en vigueur le {body.effective_date}",
        html,
    )
    return {"ok": True}


# ════════════════════════════════════════════════════════════════════════════
# ── Public Listing Endpoints ──────────────────────────────────────────────

class ListingInquiryCreate(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    message: Optional[str] = None

@api_router.get("/listings/{property_id}")
async def get_public_listing(property_id: str):
    """Public endpoint — no auth required. Returns listing data if property is listed."""
    prop = await db.properties.find_one({"id": property_id})
    if not prop:
        raise HTTPException(status_code=404, detail="Annonce non disponible")
    if not prop.get("listed"):
        raise HTTPException(status_code=404, detail="Annonce non disponible")

    # Fetch landlord name from users collection
    landlord_name = ""
    user = await db.users.find_one({"id": prop.get("user_id")})
    if user:
        full_name = user.get("full_name", "")
        # full_name is stored as a single field
        landlord_name = full_name

    return {
        "id": prop.get("id"),
        "name": prop.get("name"),
        "address": prop.get("address"),
        "city": prop.get("city"),
        "province": prop.get("province"),
        "postal_code": prop.get("postal_code"),
        "description": prop.get("description"),
        "photos": prop.get("photos", []),
        "rent_amount": prop.get("rent_amount"),
        "available_date": prop.get("available_date"),
        "bedrooms": prop.get("bedrooms"),
        "bathrooms": prop.get("bathrooms"),
        "property_type": prop.get("property_type"),
        "amenities": prop.get("amenities", []),
        "landlord_name": landlord_name,
    }

@api_router.post("/listings/{property_id}/inquire")
async def submit_listing_inquiry(property_id: str, data: ListingInquiryCreate):
    """Public endpoint — no auth required. Creates an applicant record."""
    prop = await db.properties.find_one({"id": property_id})
    if not prop or not prop.get("listed"):
        raise HTTPException(status_code=404, detail="Annonce non disponible")

    if not data.name or not data.name.strip():
        raise HTTPException(status_code=422, detail="Le nom est requis.")
    if not data.email:
        raise HTTPException(status_code=422, detail="L'adresse courriel est requise.")

    applicant = {
        "id": str(uuid.uuid4()),
        "property_id": property_id,
        "name": data.name.strip(),
        "email": data.email,
        "phone": data.phone,
        "message": data.message,
        "status": "new",
        "source": "listing",
        "created_at": datetime.utcnow(),
    }
    await db.applicants.insert_one(applicant)
    return {"success": True}

@api_router.patch("/properties/{property_id}/toggle-listing")
async def toggle_listing(property_id: str, current_user: dict = Depends(get_current_user)):
    """Toggle the listed status of a property. Auth required."""
    prop = await db.properties.find_one({"id": property_id, "user_id": current_user["id"]})
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")

    new_listed = not prop.get("listed", False)
    await db.properties.update_one(
        {"id": property_id},
        {"$set": {"listed": new_listed, "updated_at": datetime.utcnow()}}
    )
    updated = await db.properties.find_one({"id": property_id})
    return {**{k: v for k, v in updated.items() if k != "_id"}}

# ════════════════════════════════════════════════════════════════════════════

@app.get("/api/setup-demo")
async def setup_demo_public():
    """Public idempotent endpoint — recreates demo account if missing."""
    await ensure_demo_account()
    return {"ok": True, "email": DEMO_EMAIL, "password": DEMO_PASSWORD}

@app.on_event("startup")
async def startup():
    scheduler.add_job(run_daily_automations, "cron", hour=8, minute=0, id="daily_automations")
    scheduler.start()
    logger.info("[Scheduler] APScheduler started — daily automations at 08:00")
    # Retry demo account creation with backoff in case MongoDB isn't ready yet
    for attempt in range(3):
        try:
            await ensure_demo_account()
            break
        except Exception as e:
            logger.warning("[Demo] Attempt %d failed: %s", attempt + 1, e)
            if attempt < 2:
                await asyncio.sleep(3 * (attempt + 1))
