from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
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
        
        result.append(PropertyWithStats(
            **prop,
            total_units=total_units,
            occupied_units=occupied_units,
            vacant_units=vacant_units,
            rent_collected=rent_collected,
            rent_expected=rent_expected,
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
    
    return PropertyWithStats(
        **prop,
        total_units=total_units,
        occupied_units=occupied_units,
        vacant_units=vacant_units,
        rent_collected=rent_collected,
        rent_expected=rent_expected,
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
            "reminders": len(reminders_data)
        }
    }

# ===========================
# HEALTH CHECK
# ===========================

@api_router.get("/")
async def root():
    return {"message": "Small Landlord OS API", "version": "1.0.0"}

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
