from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
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
client = AsyncIOMotorClient(mongo_url)
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
    occupied_units: int = 0
    vacant_units: int = 0
    occupancy_rate: float = 0
    total_rent_expected: float = 0
    total_rent_collected: float = 0
    collection_rate: float = 0
    open_maintenance: int = 0
    leases_expiring_soon: int = 0
    overdue_rent_count: int = 0
    current_month: str = ""

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
    user = User(email=user_data.email, full_name=user_data.full_name)
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
        user=User(id=user["id"], email=user["email"], full_name=user["full_name"], created_at=user["created_at"])
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
    
    return DashboardStats(
        total_properties=total_properties,
        total_units=total_units,
        occupied_units=occupied_units,
        vacant_units=vacant_units,
        occupancy_rate=round(occupancy_rate, 1),
        total_rent_expected=total_rent_expected,
        total_rent_collected=total_rent_collected,
        collection_rate=round(collection_rate, 1),
        open_maintenance=open_maintenance,
        leases_expiring_soon=leases_expiring,
        overdue_rent_count=overdue_count,
        current_month=current_month
    )

# ===========================
# DEMO DATA SEEDING
# ===========================

@api_router.post("/seed-demo-data")
async def seed_demo_data(current_user: dict = Depends(get_current_user)):
    """Seed demo data for the current user"""
    user_id = current_user["id"]
    
    # Check if user already has data
    existing_properties = await db.properties.count_documents({"user_id": user_id})
    if existing_properties > 0:
        return {"message": "Demo data already exists", "seeded": False}
    
    # Create demo properties
    properties_data = [
        {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "name": "Duplex Rosemont",
            "address": "1234 Rue Masson",
            "city": "Montréal",
            "province": "QC",
            "postal_code": "H2G 1S6",
            "property_type": "duplex",
            "year_built": 1985,
            "notes": "Corner lot, good condition",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "name": "Triplex Plateau",
            "address": "5678 Avenue du Parc",
            "city": "Montréal",
            "province": "QC",
            "postal_code": "H2V 4H8",
            "property_type": "triplex",
            "year_built": 1920,
            "notes": "Heritage building, renovated in 2019",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
    ]
    
    await db.properties.insert_many(properties_data)
    
    # Create units for Duplex
    duplex_id = properties_data[0]["id"]
    units_data = [
        {
            "id": str(uuid.uuid4()),
            "property_id": duplex_id,
            "unit_number": "1",
            "bedrooms": 2,
            "bathrooms": 1.0,
            "square_feet": 850,
            "rent_amount": 1450.00,
            "is_occupied": True,
            "current_tenant_id": None,
            "notes": "Ground floor",
            "created_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "property_id": duplex_id,
            "unit_number": "2",
            "bedrooms": 3,
            "bathrooms": 1.0,
            "square_feet": 950,
            "rent_amount": 1650.00,
            "is_occupied": True,
            "current_tenant_id": None,
            "notes": "Upper floor, balcony",
            "created_at": datetime.utcnow()
        }
    ]
    
    # Create units for Triplex
    triplex_id = properties_data[1]["id"]
    units_data.extend([
        {
            "id": str(uuid.uuid4()),
            "property_id": triplex_id,
            "unit_number": "A",
            "bedrooms": 1,
            "bathrooms": 1.0,
            "square_feet": 650,
            "rent_amount": 1200.00,
            "is_occupied": True,
            "current_tenant_id": None,
            "notes": "Basement unit, separate entrance",
            "created_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "property_id": triplex_id,
            "unit_number": "B",
            "bedrooms": 2,
            "bathrooms": 1.0,
            "square_feet": 800,
            "rent_amount": 1500.00,
            "is_occupied": True,
            "current_tenant_id": None,
            "notes": "Main floor",
            "created_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "property_id": triplex_id,
            "unit_number": "C",
            "bedrooms": 3,
            "bathrooms": 1.5,
            "square_feet": 1100,
            "rent_amount": 1800.00,
            "is_occupied": False,
            "current_tenant_id": None,
            "notes": "Top floor, recently renovated",
            "created_at": datetime.utcnow()
        }
    ])
    
    await db.units.insert_many(units_data)
    
    # Create tenants
    tenants_data = [
        {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "first_name": "Marie",
            "last_name": "Tremblay",
            "email": "marie.tremblay@email.com",
            "phone": "514-555-0101",
            "unit_id": units_data[0]["id"],
            "emergency_contact_name": "Jean Tremblay",
            "emergency_contact_phone": "514-555-0102",
            "notes": "Excellent tenant, always pays on time",
            "created_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "first_name": "Pierre",
            "last_name": "Gagnon",
            "email": "p.gagnon@email.com",
            "phone": "514-555-0201",
            "unit_id": units_data[1]["id"],
            "emergency_contact_name": "Sophie Gagnon",
            "emergency_contact_phone": "514-555-0202",
            "notes": None,
            "created_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "first_name": "Julie",
            "last_name": "Bouchard",
            "email": "julie.b@email.com",
            "phone": "514-555-0301",
            "unit_id": units_data[2]["id"],
            "emergency_contact_name": None,
            "emergency_contact_phone": None,
            "notes": "Works from home",
            "created_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "first_name": "Michel",
            "last_name": "Roy",
            "email": "m.roy@email.com",
            "phone": "514-555-0401",
            "unit_id": units_data[3]["id"],
            "emergency_contact_name": "Anne Roy",
            "emergency_contact_phone": "514-555-0402",
            "notes": "Has a small dog (approved)",
            "created_at": datetime.utcnow()
        }
    ]
    
    await db.tenants.insert_many(tenants_data)
    
    # Update units with tenant IDs
    for i, tenant in enumerate(tenants_data):
        await db.units.update_one(
            {"id": tenant["unit_id"]},
            {"$set": {"current_tenant_id": tenant["id"]}}
        )
    
    # Create leases
    today = datetime.now()
    current_month = today.strftime("%Y-%m")
    
    leases_data = [
        {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "tenant_id": tenants_data[0]["id"],
            "unit_id": units_data[0]["id"],
            "start_date": "2024-07-01",
            "end_date": "2025-06-30",
            "rent_amount": 1450.00,
            "security_deposit": 0,
            "payment_due_day": 1,
            "is_active": True,
            "notes": None,
            "created_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "tenant_id": tenants_data[1]["id"],
            "unit_id": units_data[1]["id"],
            "start_date": "2024-09-01",
            "end_date": "2025-08-31",
            "rent_amount": 1650.00,
            "security_deposit": 0,
            "payment_due_day": 1,
            "is_active": True,
            "notes": None,
            "created_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "tenant_id": tenants_data[2]["id"],
            "unit_id": units_data[2]["id"],
            "start_date": "2025-01-01",
            "end_date": "2025-12-31",
            "rent_amount": 1200.00,
            "security_deposit": 0,
            "payment_due_day": 1,
            "is_active": True,
            "notes": None,
            "created_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "tenant_id": tenants_data[3]["id"],
            "unit_id": units_data[3]["id"],
            "start_date": "2024-04-01",
            "end_date": "2025-03-31",
            "rent_amount": 1500.00,
            "security_deposit": 0,
            "payment_due_day": 1,
            "is_active": True,
            "notes": "Lease expires soon - discuss renewal",
            "created_at": datetime.utcnow()
        }
    ]
    
    await db.leases.insert_many(leases_data)
    
    # Create rent payments for current month (some paid, some not)
    payments_data = [
        {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "lease_id": leases_data[0]["id"],
            "tenant_id": tenants_data[0]["id"],
            "unit_id": units_data[0]["id"],
            "amount": 1450.00,
            "payment_date": f"{current_month}-01",
            "payment_method": "etransfer",
            "month_year": current_month,
            "status": "paid",
            "notes": None,
            "created_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "lease_id": leases_data[2]["id"],
            "tenant_id": tenants_data[2]["id"],
            "unit_id": units_data[2]["id"],
            "amount": 1200.00,
            "payment_date": f"{current_month}-03",
            "payment_method": "cheque",
            "month_year": current_month,
            "status": "paid",
            "notes": None,
            "created_at": datetime.utcnow()
        }
    ]
    # Pierre Gagnon and Michel Roy haven't paid yet
    
    await db.rent_payments.insert_many(payments_data)
    
    # Create maintenance requests
    maintenance_data = [
        {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "property_id": duplex_id,
            "unit_id": units_data[1]["id"],
            "title": "Leaky faucet in bathroom",
            "description": "The bathroom faucet has been dripping for a few days. Getting worse.",
            "priority": "medium",
            "status": "open",
            "reported_by": "Pierre Gagnon",
            "cost": None,
            "notes": None,
            "created_at": datetime.utcnow() - timedelta(days=3),
            "updated_at": datetime.utcnow() - timedelta(days=3),
            "completed_at": None
        },
        {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "property_id": triplex_id,
            "unit_id": units_data[3]["id"],
            "title": "Heating not working properly",
            "description": "Radiator in living room is not heating evenly. Cold spots.",
            "priority": "high",
            "status": "in_progress",
            "reported_by": "Michel Roy",
            "cost": 150.00,
            "notes": "Plumber scheduled for tomorrow",
            "created_at": datetime.utcnow() - timedelta(days=5),
            "updated_at": datetime.utcnow() - timedelta(days=1),
            "completed_at": None
        },
        {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "property_id": triplex_id,
            "unit_id": None,
            "title": "Replace hallway light fixtures",
            "description": "Common area hallway lights need updating - some flickering",
            "priority": "low",
            "status": "open",
            "reported_by": None,
            "cost": None,
            "notes": "General building maintenance",
            "created_at": datetime.utcnow() - timedelta(days=10),
            "updated_at": datetime.utcnow() - timedelta(days=10),
            "completed_at": None
        }
    ]
    
    await db.maintenance_requests.insert_many(maintenance_data)
    
    # Create reminders
    reminders_data = [
        {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "title": "Follow up on late rent - Pierre Gagnon",
            "description": "Unit 2 Duplex Rosemont - rent not received yet",
            "due_date": today.strftime("%Y-%m-%d"),
            "reminder_type": "rent_due",
            "related_id": tenants_data[1]["id"],
            "is_completed": False,
            "created_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "title": "Lease renewal discussion - Michel Roy",
            "description": "Lease expires 2025-03-31. Schedule meeting to discuss renewal.",
            "due_date": (today + timedelta(days=14)).strftime("%Y-%m-%d"),
            "reminder_type": "lease_expiry",
            "related_id": tenants_data[3]["id"],
            "is_completed": False,
            "created_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "title": "Annual smoke detector check",
            "description": "Test all smoke detectors in both properties",
            "due_date": (today + timedelta(days=30)).strftime("%Y-%m-%d"),
            "reminder_type": "general",
            "related_id": None,
            "is_completed": False,
            "created_at": datetime.utcnow()
        }
    ]
    
    await db.reminders.insert_many(reminders_data)
    
    # Create demo expenses for current month
    expenses_data = [
        {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "property_id": duplex_id,
            "unit_id": units_data[1]["id"],
            "title": "Plumbing repair – bathroom faucet",
            "amount": 180.00,
            "category": "maintenance",
            "expense_date": f"{current_month}-05",
            "notes": "Replaced washers and re-sealed",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "property_id": duplex_id,
            "unit_id": None,
            "title": "Building insurance premium",
            "amount": 240.00,
            "category": "insurance",
            "expense_date": f"{current_month}-01",
            "notes": "Monthly installment",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "property_id": triplex_id,
            "unit_id": None,
            "title": "Property tax installment",
            "amount": 320.00,
            "category": "property_tax",
            "expense_date": f"{current_month}-01",
            "notes": None,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "property_id": triplex_id,
            "unit_id": None,
            "title": "Electricity – common areas",
            "amount": 95.00,
            "category": "utilities",
            "expense_date": f"{current_month}-07",
            "notes": None,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "property_id": triplex_id,
            "unit_id": units_data[3]["id"],
            "title": "Furnace inspection & tune-up",
            "amount": 120.00,
            "category": "maintenance",
            "expense_date": f"{current_month}-04",
            "notes": "Annual maintenance",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
    ]
    await db.expenses.insert_many(expenses_data)

    return {
        "message": "Demo data seeded successfully",
        "seeded": True,
        "data": {
            "properties": len(properties_data),
            "units": len(units_data),
            "tenants": len(tenants_data),
            "leases": len(leases_data),
            "payments": len(payments_data),
            "maintenance_requests": len(maintenance_data),
            "reminders": len(reminders_data),
            "expenses": len(expenses_data)
        }
    }

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
    anthropic_key = os.environ.get("ANTHROPIC_API_KEY")

    if anthropic_key:
        try:
            import anthropic
            client = anthropic.Anthropic(api_key=anthropic_key)
            # Detect image type from base64 header or default to jpeg
            img_data = data.image_base64
            if img_data.startswith("data:"):
                header, img_data = img_data.split(",", 1)
                media_type = header.split(";")[0].split(":")[1]
            else:
                media_type = "image/jpeg"

            message = client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=512,
                messages=[{
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": media_type,
                                "data": img_data,
                            }
                        },
                        {
                            "type": "text",
                            "text": (
                                "You are analyzing a receipt or expense document. "
                                "Extract the following fields and return ONLY valid JSON (no markdown, no explanation):\n"
                                "{\n"
                                '  "title": "short description of what was purchased",\n'
                                '  "amount": 0.00,\n'
                                '  "date": "YYYY-MM-DD",\n'
                                '  "category": one of [maintenance, insurance, property_tax, utilities, mortgage, cleaning, renovation, other],\n'
                                '  "notes": "any extra details from the receipt"\n'
                                "}\n"
                                "If a field cannot be determined, use null. For date, use today if not visible."
                            )
                        }
                    ]
                }]
            )
            text = message.content[0].text.strip()
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

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
