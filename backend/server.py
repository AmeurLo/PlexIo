from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from apscheduler.schedulers.asyncio import AsyncIOScheduler
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
import jwt
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
    plan: str = "free"
    plan_status: str = "active"
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
    status: str = "open"  # open, in_progress, completed, cancelled
    reported_by: Optional[str] = None
    photos: Optional[List[str]] = None
    cost: Optional[float] = None
    notes: Optional[str] = None
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

class Reminder(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    description: Optional[str] = None
    due_date: str
    reminder_type: str
    related_id: Optional[str] = None
    is_completed: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

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
    
    # Create token
    token = create_token(user.id, user.email)
    
    return TokenResponse(access_token=token, user=user)

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not pwd_context.verify(credentials.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    token = create_token(user["id"], user["email"])
    
    return TokenResponse(
        access_token=token,
        user=User(
            id=user["id"], email=user["email"], full_name=user["full_name"],
            plan=user.get("plan", "free"), plan_status=user.get("plan_status", "active"),
            created_at=user["created_at"]
        )
    )

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: dict = Depends(get_current_user)):
    return User(**current_user)

class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None

@api_router.patch("/auth/me", response_model=User)
async def update_me(data: UserProfileUpdate, current_user: dict = Depends(get_current_user)):
    update_fields: dict = {}
    if data.full_name is not None:
        update_fields["full_name"] = data.full_name.strip()
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
# PROPERTY ROUTES
# ===========================

@api_router.post("/properties", response_model=Property)
async def create_property(data: PropertyCreate, current_user: dict = Depends(get_current_user)):
    property_obj = Property(user_id=current_user["id"], **data.model_dump())
    await db.properties.insert_one(property_obj.model_dump())
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
    return Property(**updated)

@api_router.delete("/properties/{property_id}")
async def delete_property(property_id: str, current_user: dict = Depends(get_current_user)):
    prop = await db.properties.find_one({"id": property_id, "user_id": current_user["id"]})
    if not prop:
        raise HTTPException(status_code=404, detail="Property not found")
    
    await db.properties.delete_one({"id": property_id})
    await db.units.delete_many({"property_id": property_id})
    await db.maintenance_requests.delete_many({"property_id": property_id})
    
    return {"message": "Property deleted"}

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

@api_router.delete("/rent-payments/{payment_id}")
async def delete_rent_payment(payment_id: str, current_user: dict = Depends(get_current_user)):
    payment = await db.rent_payments.find_one({"id": payment_id, "user_id": current_user["id"]})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    await db.rent_payments.delete_one({"id": payment_id})
    return {"message": "Payment deleted"}

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
    docs = await db.team_members.find({"user_id": current_user["id"]}).to_list(100)
    for d in docs:
        d.pop("_id", None)
    return docs

@api_router.post("/team")
async def add_team_member(data: TeamMemberCreate, current_user: dict = Depends(get_current_user)):
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        **data.model_dump(),
        "status": "pending",
        "added_date": date.today().isoformat(),
        "last_active": None,
        "created_at": datetime.utcnow().isoformat(),
    }
    await db.team_members.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.put("/team/{member_id}")
async def update_team_member(member_id: str, data: TeamMemberUpdate, current_user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow().isoformat()
    result = await db.team_members.update_one(
        {"id": member_id, "user_id": current_user["id"]},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Team member not found")
    return {"ok": True}

@api_router.delete("/team/{member_id}")
async def delete_team_member(member_id: str, current_user: dict = Depends(get_current_user)):
    await db.team_members.delete_one({"id": member_id, "user_id": current_user["id"]})
    return {"ok": True}


# ===========================
# VACANCY & APPLICANTS
# ===========================

class ApplicantCreate(BaseModel):
    unit_id: str
    name: str
    email: Optional[str] = None
    phone: str
    income: Optional[str] = None
    message: Optional[str] = None

class ApplicantStatusUpdate(BaseModel):
    status: str  # waiting | contacted | rejected

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
    query = {"user_id": user_id}
    if unit_id:
        query["unit_id"] = unit_id
    docs = await db.applicants.find(query).sort("date", -1).to_list(500)

    # Enrich with unit/property info
    units = await db.units.find({"user_id": user_id}).to_list(500)
    props = await db.properties.find({"user_id": user_id}).to_list(200)
    prop_map = {str(p.get("id", p.get("_id", ""))): p.get("name", "") for p in props}
    unit_map = {
        str(u.get("id", u.get("_id", ""))): {
            "unit_number": u.get("unit_number", ""),
            "property_name": prop_map.get(str(u.get("property_id", "")), ""),
        }
        for u in units
    }

    result = []
    for d in docs:
        d.pop("_id", None)
        info = unit_map.get(d.get("unit_id", ""), {})
        d["unit_number"] = info.get("unit_number", "")
        d["property_name"] = info.get("property_name", "")
        result.append(d)
    return result

@api_router.post("/applicants")
async def add_applicant(data: ApplicantCreate, current_user: dict = Depends(get_current_user)):
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "unit_id": data.unit_id,
        "name": data.name,
        "email": data.email or "",
        "phone": data.phone,
        "income": data.income or "",
        "message": data.message or "",
        "date": date.today().isoformat(),
        "status": "waiting",
        "created_at": datetime.utcnow().isoformat(),
    }
    await db.applicants.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api_router.put("/applicants/{applicant_id}")
async def update_applicant_status(applicant_id: str, data: ApplicantStatusUpdate, current_user: dict = Depends(get_current_user)):
    result = await db.applicants.update_one(
        {"id": applicant_id, "user_id": current_user["id"]},
        {"$set": {"status": data.status}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Applicant not found")
    return {"ok": True}

@api_router.delete("/applicants/{applicant_id}")
async def delete_applicant(applicant_id: str, current_user: dict = Depends(get_current_user)):
    await db.applicants.delete_one({"id": applicant_id, "user_id": current_user["id"]})
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

async def get_current_tenant(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    token = credentials.credentials
    payload = verify_token(token)
    if payload.get("role") != "tenant":
        raise HTTPException(status_code=403, detail="Tenant access only")
    tenant = await db.tenants.find_one({"id": payload["sub"]})
    if not tenant:
        raise HTTPException(status_code=401, detail="Tenant not found")
    return tenant

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


async def _send_auto_email(to_email: str, subject: str, html_body: str):
    """Generic Resend mailer for automation emails. Silent no-op if key not set."""
    if not RESEND_API_KEY or not to_email:
        logger.info("[Automations] No RESEND_API_KEY or recipient — skipping email to %s", to_email)
        return
    import httpx
    async with httpx.AsyncClient() as client_http:
        try:
            resp = await client_http.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {RESEND_API_KEY}", "Content-Type": "application/json"},
                json={"from": "Domely <noreply@domely.ca>", "to": to_email,
                      "subject": subject, "html": html_body},
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
    await db.inspections.delete_one({"_id": inspection_id, "user_id": user_id})
    return {"ok": True}


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


# ===========================
# HEALTH CHECK
# ===========================

@api_router.get("/")
async def root():
    return {"message": "Plexio API", "version": "2.0.0"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

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
)

@app.on_event("shutdown")
async def shutdown_db_client():
    scheduler.shutdown(wait=False)
    client.close()

@app.on_event("startup")
async def startup():
    scheduler.add_job(run_daily_automations, "cron", hour=8, minute=0, id="daily_automations")
    scheduler.start()
    logger.info("[Scheduler] APScheduler started — daily automations at 08:00")
