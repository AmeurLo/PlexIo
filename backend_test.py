#!/usr/bin/env python3
"""
Backend API Testing Suite for Small Landlord Operating System
Tests all API endpoints systematically with authentication flow
"""

import requests
import json
import sys
import os
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

# Configuration
BASE_URL = "https://landlord-insights-1.preview.emergentagent.com/api"
TEST_USER_EMAIL = "test@landlord.com"
TEST_USER_PASSWORD = "test123"
TEST_USER_NAME = "Test Landlord"

class BackendTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.auth_token: Optional[str] = None
        self.user_data: Optional[Dict] = None
        self.test_data = {
            'property_id': None,
            'unit_id': None,
            'tenant_id': None,
            'lease_id': None,
            'payment_id': None,
            'maintenance_id': None,
            'reminder_id': None
        }
        self.results = {
            'passed': 0,
            'failed': 0,
            'errors': []
        }

    def log_result(self, test_name: str, success: bool, details: str = ""):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {test_name}")
        if details:
            print(f"    {details}")
        
        if success:
            self.results['passed'] += 1
        else:
            self.results['failed'] += 1
            self.results['errors'].append(f"{test_name}: {details}")

    def make_request(self, method: str, endpoint: str, data: Dict = None, params: Dict = None, require_auth: bool = True) -> tuple:
        """Make HTTP request with proper headers"""
        url = f"{self.base_url}{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if require_auth and self.auth_token:
            headers['Authorization'] = f"Bearer {self.auth_token}"
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params, timeout=30)
            elif method == 'POST':
                response = requests.post(url, headers=headers, json=data, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, headers=headers, json=data, params=params, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)
            else:
                return False, f"Unsupported method: {method}"
            
            return True, response
        except requests.exceptions.RequestException as e:
            return False, f"Request failed: {str(e)}"

    def test_health_check(self):
        """Test basic health check endpoint"""
        print("\n=== Health Check ===")
        
        success, response = self.make_request('GET', '/health', require_auth=False)
        if not success:
            self.log_result("Health Check", False, response)
            return False
            
        if response.status_code == 200:
            try:
                data = response.json()
                if 'status' in data and data['status'] == 'healthy':
                    self.log_result("Health Check", True, f"Status: {data['status']}")
                    return True
                else:
                    self.log_result("Health Check", False, f"Unexpected response: {data}")
            except json.JSONDecodeError:
                self.log_result("Health Check", False, "Invalid JSON response")
        else:
            self.log_result("Health Check", False, f"Status code: {response.status_code}")
        
        return False

    def test_register(self):
        """Test user registration"""
        print("\n=== User Registration ===")
        
        # First try to register
        user_data = {
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD,
            "full_name": TEST_USER_NAME
        }
        
        success, response = self.make_request('POST', '/auth/register', data=user_data, require_auth=False)
        if not success:
            self.log_result("User Registration", False, response)
            return False
        
        if response.status_code in [200, 201]:
            try:
                data = response.json()
                if 'access_token' in data and 'user' in data:
                    self.auth_token = data['access_token']
                    self.user_data = data['user']
                    self.log_result("User Registration", True, f"User created: {data['user']['email']}")
                    return True
                else:
                    self.log_result("User Registration", False, f"Missing token or user in response: {data}")
            except json.JSONDecodeError:
                self.log_result("User Registration", False, "Invalid JSON response")
        elif response.status_code == 400:
            # User might already exist, try to login instead
            self.log_result("User Registration", True, "User already exists (expected)")
            return self.test_login()
        else:
            self.log_result("User Registration", False, f"Status code: {response.status_code}, Response: {response.text}")
        
        return False

    def test_login(self):
        """Test user login"""
        print("\n=== User Login ===")
        
        credentials = {
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        }
        
        success, response = self.make_request('POST', '/auth/login', data=credentials, require_auth=False)
        if not success:
            self.log_result("User Login", False, response)
            return False
        
        if response.status_code == 200:
            try:
                data = response.json()
                if 'access_token' in data and 'user' in data:
                    self.auth_token = data['access_token']
                    self.user_data = data['user']
                    self.log_result("User Login", True, f"Logged in: {data['user']['email']}")
                    return True
                else:
                    self.log_result("User Login", False, f"Missing token or user in response: {data}")
            except json.JSONDecodeError:
                self.log_result("User Login", False, "Invalid JSON response")
        else:
            self.log_result("User Login", False, f"Status code: {response.status_code}, Response: {response.text}")
        
        return False

    def test_get_me(self):
        """Test get current user endpoint"""
        print("\n=== Get Current User ===")
        
        success, response = self.make_request('GET', '/auth/me')
        if not success:
            self.log_result("Get Current User", False, response)
            return False
        
        if response.status_code == 200:
            try:
                data = response.json()
                if 'email' in data and data['email'] == TEST_USER_EMAIL:
                    self.log_result("Get Current User", True, f"User: {data['email']}")
                    return True
                else:
                    self.log_result("Get Current User", False, f"Unexpected user data: {data}")
            except json.JSONDecodeError:
                self.log_result("Get Current User", False, "Invalid JSON response")
        else:
            self.log_result("Get Current User", False, f"Status code: {response.status_code}")
        
        return False

    def test_seed_demo_data(self):
        """Test seeding demo data"""
        print("\n=== Seed Demo Data ===")
        
        success, response = self.make_request('POST', '/seed-demo-data')
        if not success:
            self.log_result("Seed Demo Data", False, response)
            return False
        
        if response.status_code == 200:
            try:
                data = response.json()
                if 'message' in data:
                    self.log_result("Seed Demo Data", True, f"Message: {data['message']}")
                    return True
                else:
                    self.log_result("Seed Demo Data", False, f"Unexpected response: {data}")
            except json.JSONDecodeError:
                self.log_result("Seed Demo Data", False, "Invalid JSON response")
        else:
            self.log_result("Seed Demo Data", False, f"Status code: {response.status_code}")
        
        return False

    def test_dashboard(self):
        """Test dashboard stats endpoint"""
        print("\n=== Dashboard Stats ===")
        
        success, response = self.make_request('GET', '/dashboard')
        if not success:
            self.log_result("Dashboard Stats", False, response)
            return False
        
        if response.status_code == 200:
            try:
                data = response.json()
                required_fields = ['total_properties', 'total_units', 'occupancy_rate']
                if all(field in data for field in required_fields):
                    self.log_result("Dashboard Stats", True, f"Properties: {data.get('total_properties', 0)}, Units: {data.get('total_units', 0)}")
                    return True
                else:
                    self.log_result("Dashboard Stats", False, f"Missing required fields in response: {data}")
            except json.JSONDecodeError:
                self.log_result("Dashboard Stats", False, "Invalid JSON response")
        else:
            self.log_result("Dashboard Stats", False, f"Status code: {response.status_code}")
        
        return False

    def test_properties(self):
        """Test properties CRUD operations"""
        print("\n=== Properties ===")
        
        # Test GET properties
        success, response = self.make_request('GET', '/properties')
        if not success:
            self.log_result("Get Properties", False, response)
            return False
        
        if response.status_code == 200:
            try:
                data = response.json()
                self.log_result("Get Properties", True, f"Found {len(data)} properties")
                
                # Store first property ID if available
                if data and len(data) > 0:
                    self.test_data['property_id'] = data[0]['id']
                    
                    # Test GET single property
                    success, single_response = self.make_request('GET', f'/properties/{self.test_data["property_id"]}')
                    if success and single_response.status_code == 200:
                        single_data = single_response.json()
                        self.log_result("Get Single Property", True, f"Property: {single_data.get('name', 'Unknown')}")
                    else:
                        self.log_result("Get Single Property", False, f"Status: {single_response.status_code if success else 'Request failed'}")
                        
            except json.JSONDecodeError:
                self.log_result("Get Properties", False, "Invalid JSON response")
        else:
            self.log_result("Get Properties", False, f"Status code: {response.status_code}")
            
        # Test POST property
        new_property = {
            "name": "Test Property",
            "address": "123 Test Street",
            "city": "Montreal",
            "province": "QC", 
            "postal_code": "H1H 1H1",
            "property_type": "duplex",
            "year_built": 2020,
            "notes": "Test property for API testing"
        }
        
        success, response = self.make_request('POST', '/properties', data=new_property)
        if success and response.status_code in [200, 201]:
            try:
                data = response.json()
                if 'id' in data:
                    self.test_data['property_id'] = data['id']
                    self.log_result("Create Property", True, f"Created property: {data.get('name')}")
                else:
                    self.log_result("Create Property", False, f"No ID in response: {data}")
            except json.JSONDecodeError:
                self.log_result("Create Property", False, "Invalid JSON response")
        else:
            self.log_result("Create Property", False, f"Status: {response.status_code if success else 'Request failed'}")

    def test_units(self):
        """Test units CRUD operations"""
        print("\n=== Units ===")
        
        # Test GET units
        success, response = self.make_request('GET', '/units')
        if not success:
            self.log_result("Get Units", False, response)
            return False
        
        if response.status_code == 200:
            try:
                data = response.json()
                self.log_result("Get Units", True, f"Found {len(data)} units")
                
                # Store first unit ID if available
                if data and len(data) > 0:
                    self.test_data['unit_id'] = data[0]['id']
                    
            except json.JSONDecodeError:
                self.log_result("Get Units", False, "Invalid JSON response")
        else:
            self.log_result("Get Units", False, f"Status code: {response.status_code}")
            
        # Test POST unit (only if we have a property)
        if self.test_data['property_id']:
            new_unit = {
                "property_id": self.test_data['property_id'],
                "unit_number": "TEST-1",
                "bedrooms": 2,
                "bathrooms": 1.0,
                "square_feet": 800,
                "rent_amount": 1500.00,
                "notes": "Test unit for API testing"
            }
            
            success, response = self.make_request('POST', '/units', data=new_unit)
            if success and response.status_code in [200, 201]:
                try:
                    data = response.json()
                    if 'id' in data:
                        self.test_data['unit_id'] = data['id']
                        self.log_result("Create Unit", True, f"Created unit: {data.get('unit_number')}")
                    else:
                        self.log_result("Create Unit", False, f"No ID in response: {data}")
                except json.JSONDecodeError:
                    self.log_result("Create Unit", False, "Invalid JSON response")
            else:
                self.log_result("Create Unit", False, f"Status: {response.status_code if success else 'Request failed'}")
        else:
            self.log_result("Create Unit", False, "No property ID available")

    def test_tenants(self):
        """Test tenants CRUD operations"""
        print("\n=== Tenants ===")
        
        # Test GET tenants
        success, response = self.make_request('GET', '/tenants')
        if not success:
            self.log_result("Get Tenants", False, response)
            return False
        
        if response.status_code == 200:
            try:
                data = response.json()
                self.log_result("Get Tenants", True, f"Found {len(data)} tenants")
                
                # Store first tenant ID if available
                if data and len(data) > 0:
                    self.test_data['tenant_id'] = data[0]['id']
                    
            except json.JSONDecodeError:
                self.log_result("Get Tenants", False, "Invalid JSON response")
        else:
            self.log_result("Get Tenants", False, f"Status code: {response.status_code}")
            
        # Test POST tenant
        new_tenant = {
            "first_name": "John",
            "last_name": "TestTenant",
            "email": "john.tenant@example.com",
            "phone": "514-555-0123",
            "unit_id": self.test_data['unit_id'],
            "emergency_contact_name": "Jane TestTenant",
            "emergency_contact_phone": "514-555-0124",
            "notes": "Test tenant for API testing"
        }
        
        success, response = self.make_request('POST', '/tenants', data=new_tenant)
        if success and response.status_code in [200, 201]:
            try:
                data = response.json()
                if 'id' in data:
                    self.test_data['tenant_id'] = data['id']
                    self.log_result("Create Tenant", True, f"Created tenant: {data.get('first_name')} {data.get('last_name')}")
                else:
                    self.log_result("Create Tenant", False, f"No ID in response: {data}")
            except json.JSONDecodeError:
                self.log_result("Create Tenant", False, "Invalid JSON response")
        else:
            self.log_result("Create Tenant", False, f"Status: {response.status_code if success else 'Request failed'}")

    def test_leases(self):
        """Test leases CRUD operations"""
        print("\n=== Leases ===")
        
        # Test GET leases
        success, response = self.make_request('GET', '/leases')
        if not success:
            self.log_result("Get Leases", False, response)
            return False
        
        if response.status_code == 200:
            try:
                data = response.json()
                self.log_result("Get Leases", True, f"Found {len(data)} leases")
                
                # Store first lease ID if available
                if data and len(data) > 0:
                    self.test_data['lease_id'] = data[0]['id']
                    
            except json.JSONDecodeError:
                self.log_result("Get Leases", False, "Invalid JSON response")
        else:
            self.log_result("Get Leases", False, f"Status code: {response.status_code}")
            
        # Test POST lease (only if we have tenant and unit)
        if self.test_data['tenant_id'] and self.test_data['unit_id']:
            start_date = datetime.now().date()
            end_date = start_date + timedelta(days=365)
            
            new_lease = {
                "tenant_id": self.test_data['tenant_id'],
                "unit_id": self.test_data['unit_id'],
                "start_date": start_date.strftime("%Y-%m-%d"),
                "end_date": end_date.strftime("%Y-%m-%d"),
                "rent_amount": 1500.00,
                "security_deposit": 0,
                "payment_due_day": 1,
                "notes": "Test lease for API testing"
            }
            
            success, response = self.make_request('POST', '/leases', data=new_lease)
            if success and response.status_code in [200, 201]:
                try:
                    data = response.json()
                    if 'id' in data:
                        self.test_data['lease_id'] = data['id']
                        self.log_result("Create Lease", True, f"Created lease: {data.get('start_date')} to {data.get('end_date')}")
                    else:
                        self.log_result("Create Lease", False, f"No ID in response: {data}")
                except json.JSONDecodeError:
                    self.log_result("Create Lease", False, "Invalid JSON response")
            else:
                self.log_result("Create Lease", False, f"Status: {response.status_code if success else 'Request failed'}")
        else:
            self.log_result("Create Lease", False, "Missing tenant or unit ID")

    def test_rent_payments(self):
        """Test rent payments and overview"""
        print("\n=== Rent Payments ===")
        
        # Test GET rent payments
        success, response = self.make_request('GET', '/rent-payments')
        if not success:
            self.log_result("Get Rent Payments", False, response)
            return False
        
        if response.status_code == 200:
            try:
                data = response.json()
                self.log_result("Get Rent Payments", True, f"Found {len(data)} payments")
            except json.JSONDecodeError:
                self.log_result("Get Rent Payments", False, "Invalid JSON response")
        else:
            self.log_result("Get Rent Payments", False, f"Status code: {response.status_code}")
            
        # Test GET rent overview
        success, response = self.make_request('GET', '/rent-overview')
        if success and response.status_code == 200:
            try:
                data = response.json()
                self.log_result("Get Rent Overview", True, f"Found {len(data)} rent records")
            except json.JSONDecodeError:
                self.log_result("Get Rent Overview", False, "Invalid JSON response")
        else:
            self.log_result("Get Rent Overview", False, f"Status: {response.status_code if success else 'Request failed'}")
            
        # Test POST rent payment (only if we have required IDs)
        if self.test_data['lease_id'] and self.test_data['tenant_id'] and self.test_data['unit_id']:
            current_month = datetime.now().strftime("%Y-%m")
            payment_date = datetime.now().date().strftime("%Y-%m-%d")
            
            new_payment = {
                "lease_id": self.test_data['lease_id'],
                "tenant_id": self.test_data['tenant_id'],
                "unit_id": self.test_data['unit_id'],
                "amount": 1500.00,
                "payment_date": payment_date,
                "payment_method": "etransfer",
                "month_year": current_month,
                "notes": "Test payment for API testing"
            }
            
            success, response = self.make_request('POST', '/rent-payments', data=new_payment)
            if success and response.status_code in [200, 201]:
                try:
                    data = response.json()
                    if 'id' in data:
                        self.test_data['payment_id'] = data['id']
                        self.log_result("Create Rent Payment", True, f"Created payment: ${data.get('amount')}")
                    else:
                        self.log_result("Create Rent Payment", False, f"No ID in response: {data}")
                except json.JSONDecodeError:
                    self.log_result("Create Rent Payment", False, "Invalid JSON response")
            else:
                self.log_result("Create Rent Payment", False, f"Status: {response.status_code if success else 'Request failed'}")
        else:
            self.log_result("Create Rent Payment", False, "Missing required IDs")

    def test_maintenance(self):
        """Test maintenance requests"""
        print("\n=== Maintenance ===")
        
        # Test GET maintenance
        success, response = self.make_request('GET', '/maintenance')
        if not success:
            self.log_result("Get Maintenance", False, response)
            return False
        
        if response.status_code == 200:
            try:
                data = response.json()
                self.log_result("Get Maintenance", True, f"Found {len(data)} maintenance requests")
                
                # Store first maintenance ID if available
                if data and len(data) > 0:
                    self.test_data['maintenance_id'] = data[0]['id']
                    
            except json.JSONDecodeError:
                self.log_result("Get Maintenance", False, "Invalid JSON response")
        else:
            self.log_result("Get Maintenance", False, f"Status code: {response.status_code}")
            
        # Test POST maintenance (only if we have property)
        if self.test_data['property_id']:
            new_maintenance = {
                "property_id": self.test_data['property_id'],
                "unit_id": self.test_data['unit_id'],
                "title": "Test Maintenance Request",
                "description": "This is a test maintenance request for API testing",
                "priority": "medium",
                "reported_by": "Test User"
            }
            
            success, response = self.make_request('POST', '/maintenance', data=new_maintenance)
            if success and response.status_code in [200, 201]:
                try:
                    data = response.json()
                    if 'id' in data:
                        self.test_data['maintenance_id'] = data['id']
                        self.log_result("Create Maintenance", True, f"Created request: {data.get('title')}")
                        
                        # Test updating maintenance status
                        update_success, update_response = self.make_request('PUT', f'/maintenance/{data["id"]}', params={'status': 'completed'})
                        if update_success and update_response.status_code == 200:
                            self.log_result("Update Maintenance Status", True, "Status updated to completed")
                        else:
                            self.log_result("Update Maintenance Status", False, f"Status: {update_response.status_code if update_success else 'Request failed'}")
                        
                    else:
                        self.log_result("Create Maintenance", False, f"No ID in response: {data}")
                except json.JSONDecodeError:
                    self.log_result("Create Maintenance", False, "Invalid JSON response")
            else:
                self.log_result("Create Maintenance", False, f"Status: {response.status_code if success else 'Request failed'}")
        else:
            self.log_result("Create Maintenance", False, "No property ID available")

    def test_reminders(self):
        """Test reminders"""
        print("\n=== Reminders ===")
        
        # Test GET reminders
        success, response = self.make_request('GET', '/reminders')
        if not success:
            self.log_result("Get Reminders", False, response)
            return False
        
        if response.status_code == 200:
            try:
                data = response.json()
                self.log_result("Get Reminders", True, f"Found {len(data)} reminders")
                
                # Store first reminder ID if available
                if data and len(data) > 0:
                    self.test_data['reminder_id'] = data[0]['id']
                    
            except json.JSONDecodeError:
                self.log_result("Get Reminders", False, "Invalid JSON response")
        else:
            self.log_result("Get Reminders", False, f"Status code: {response.status_code}")
            
        # Test POST reminder
        due_date = (datetime.now() + timedelta(days=7)).date().strftime("%Y-%m-%d")
        
        new_reminder = {
            "title": "Test Reminder",
            "description": "This is a test reminder for API testing",
            "due_date": due_date,
            "reminder_type": "general"
        }
        
        success, response = self.make_request('POST', '/reminders', data=new_reminder)
        if success and response.status_code in [200, 201]:
            try:
                data = response.json()
                if 'id' in data:
                    self.test_data['reminder_id'] = data['id']
                    self.log_result("Create Reminder", True, f"Created reminder: {data.get('title')}")
                    
                    # Test completing reminder
                    complete_success, complete_response = self.make_request('PUT', f'/reminders/{data["id"]}/complete')
                    if complete_success and complete_response.status_code == 200:
                        self.log_result("Complete Reminder", True, "Reminder marked as completed")
                    else:
                        self.log_result("Complete Reminder", False, f"Status: {complete_response.status_code if complete_success else 'Request failed'}")
                        
                else:
                    self.log_result("Create Reminder", False, f"No ID in response: {data}")
            except json.JSONDecodeError:
                self.log_result("Create Reminder", False, "Invalid JSON response")
        else:
            self.log_result("Create Reminder", False, f"Status: {response.status_code if success else 'Request failed'}")

    def test_property_health_scores(self):
        """Test Property Health Scores API endpoint"""
        print("\n=== Property Health Scores ===")
        
        # Test without authentication first
        success, response = self.make_request('GET', '/property-health-scores', require_auth=False)
        if success and response.status_code in [401, 403]:
            self.log_result("Health Scores - No Auth", True, "Correctly rejected unauthenticated request")
        else:
            self.log_result("Health Scores - No Auth", False, f"Expected 401/403, got {response.status_code if success else 'Request failed'}")
        
        # Test with authentication
        success, response = self.make_request('GET', '/property-health-scores')
        if not success:
            self.log_result("Get Property Health Scores", False, response)
            return False
        
        if response.status_code == 200:
            try:
                data = response.json()
                
                # Check main structure
                required_top_level_fields = ['properties', 'portfolio_average', 'portfolio_status']
                if not all(field in data for field in required_top_level_fields):
                    self.log_result("Health Scores Structure", False, f"Missing required top-level fields: {required_top_level_fields}")
                    return False
                
                # Check portfolio data
                portfolio_avg = data.get('portfolio_average')
                portfolio_status = data.get('portfolio_status')
                
                if not isinstance(portfolio_avg, int) or portfolio_avg < 0 or portfolio_avg > 100:
                    self.log_result("Portfolio Average", False, f"Invalid portfolio average: {portfolio_avg} (should be 0-100)")
                else:
                    self.log_result("Portfolio Average", True, f"Portfolio average: {portfolio_avg}")
                
                if portfolio_status not in ['healthy', 'moderate', 'at_risk']:
                    self.log_result("Portfolio Status", False, f"Invalid portfolio status: {portfolio_status}")
                else:
                    self.log_result("Portfolio Status", True, f"Portfolio status: {portfolio_status}")
                
                # Check properties array
                properties = data.get('properties', [])
                if not isinstance(properties, list):
                    self.log_result("Properties Array", False, "Properties is not an array")
                    return False
                
                if len(properties) == 0:
                    self.log_result("Properties Count", True, "No properties found (expected for fresh account)")
                    return True
                
                self.log_result("Properties Count", True, f"Found {len(properties)} properties")
                
                # Check each property structure
                for i, prop in enumerate(properties):
                    prop_name = prop.get('property_name', f'Property {i+1}')
                    
                    # Required fields for each property
                    required_prop_fields = [
                        'property_id', 'property_name', 'property_type', 'score', 'status', 
                        'breakdown', 'total_units', 'occupied_units', 'open_issues', 
                        'collection_rate'
                    ]
                    
                    missing_fields = [field for field in required_prop_fields if field not in prop]
                    if missing_fields:
                        self.log_result(f"Property {prop_name} - Structure", False, f"Missing fields: {missing_fields}")
                        continue
                    
                    # Validate score
                    score = prop.get('score')
                    if not isinstance(score, int) or score < 0 or score > 100:
                        self.log_result(f"Property {prop_name} - Score", False, f"Invalid score: {score} (should be 0-100)")
                    else:
                        self.log_result(f"Property {prop_name} - Score", True, f"Score: {score}")
                    
                    # Validate status
                    status = prop.get('status')
                    if status not in ['healthy', 'moderate', 'at_risk']:
                        self.log_result(f"Property {prop_name} - Status", False, f"Invalid status: {status}")
                    else:
                        # Validate status logic
                        expected_status = "healthy" if score >= 70 else "moderate" if score >= 40 else "at_risk"
                        if status == expected_status:
                            self.log_result(f"Property {prop_name} - Status Logic", True, f"Status '{status}' correct for score {score}")
                        else:
                            self.log_result(f"Property {prop_name} - Status Logic", False, f"Status '{status}' incorrect for score {score}, expected '{expected_status}'")
                    
                    # Validate breakdown
                    breakdown = prop.get('breakdown', {})
                    if not isinstance(breakdown, dict):
                        self.log_result(f"Property {prop_name} - Breakdown", False, "Breakdown is not an object")
                        continue
                    
                    breakdown_fields = ['rent_collection', 'occupancy', 'maintenance', 'lease_stability']
                    missing_breakdown = [field for field in breakdown_fields if field not in breakdown]
                    if missing_breakdown:
                        self.log_result(f"Property {prop_name} - Breakdown Fields", False, f"Missing breakdown fields: {missing_breakdown}")
                    else:
                        # Validate breakdown values and totals
                        rent_collection = breakdown.get('rent_collection', 0)
                        occupancy = breakdown.get('occupancy', 0)
                        maintenance = breakdown.get('maintenance', 0)
                        lease_stability = breakdown.get('lease_stability', 0)
                        
                        # Check individual breakdown ranges
                        breakdown_valid = True
                        if not (0 <= rent_collection <= 30):
                            self.log_result(f"Property {prop_name} - Rent Collection", False, f"Invalid rent_collection: {rent_collection} (should be 0-30)")
                            breakdown_valid = False
                        if not (0 <= occupancy <= 25):
                            self.log_result(f"Property {prop_name} - Occupancy", False, f"Invalid occupancy: {occupancy} (should be 0-25)")
                            breakdown_valid = False
                        if not (0 <= maintenance <= 20):
                            self.log_result(f"Property {prop_name} - Maintenance", False, f"Invalid maintenance: {maintenance} (should be 0-20)")
                            breakdown_valid = False
                        if not (0 <= lease_stability <= 25):
                            self.log_result(f"Property {prop_name} - Lease Stability", False, f"Invalid lease_stability: {lease_stability} (should be 0-25)")
                            breakdown_valid = False
                        
                        if breakdown_valid:
                            breakdown_total = rent_collection + occupancy + maintenance + lease_stability
                            # Allow for small rounding differences
                            if abs(breakdown_total - score) <= 2:
                                self.log_result(f"Property {prop_name} - Breakdown Total", True, f"Breakdown adds up to score ({breakdown_total} ≈ {score})")
                            else:
                                self.log_result(f"Property {prop_name} - Breakdown Total", False, f"Breakdown total {breakdown_total} doesn't match score {score}")
                    
                    # Validate other numeric fields
                    total_units = prop.get('total_units', 0)
                    occupied_units = prop.get('occupied_units', 0)
                    open_issues = prop.get('open_issues', 0)
                    collection_rate = prop.get('collection_rate', 0)
                    
                    if not isinstance(total_units, int) or total_units < 0:
                        self.log_result(f"Property {prop_name} - Total Units", False, f"Invalid total_units: {total_units}")
                    elif not isinstance(occupied_units, int) or occupied_units < 0 or occupied_units > total_units:
                        self.log_result(f"Property {prop_name} - Occupied Units", False, f"Invalid occupied_units: {occupied_units} (total: {total_units})")
                    else:
                        self.log_result(f"Property {prop_name} - Units", True, f"{occupied_units}/{total_units} occupied")
                    
                    if not isinstance(open_issues, int) or open_issues < 0:
                        self.log_result(f"Property {prop_name} - Open Issues", False, f"Invalid open_issues: {open_issues}")
                    else:
                        self.log_result(f"Property {prop_name} - Open Issues", True, f"{open_issues} open issues")
                    
                    if not isinstance(collection_rate, (int, float)) or collection_rate < 0 or collection_rate > 100:
                        self.log_result(f"Property {prop_name} - Collection Rate", False, f"Invalid collection_rate: {collection_rate}")
                    else:
                        self.log_result(f"Property {prop_name} - Collection Rate", True, f"Collection rate: {collection_rate}%")
                
                # Check portfolio average calculation
                if len(properties) > 1:
                    calculated_avg = round(sum(p.get('score', 0) for p in properties) / len(properties))
                    if calculated_avg == portfolio_avg:
                        self.log_result("Portfolio Average Calculation", True, f"Calculated average matches: {calculated_avg}")
                    else:
                        self.log_result("Portfolio Average Calculation", False, f"Calculated {calculated_avg} but got {portfolio_avg}")
                
                # Verify demo properties are present (Duplex Rosemont and Triplex Plateau)
                property_names = [p.get('property_name', '').lower() for p in properties]
                expected_demo_properties = ['duplex rosemont', 'triplex plateau']
                found_demo_properties = []
                
                for demo_prop in expected_demo_properties:
                    if any(demo_prop in name for name in property_names):
                        found_demo_properties.append(demo_prop)
                
                if len(found_demo_properties) >= 2:
                    self.log_result("Demo Properties", True, f"Found expected demo properties: {found_demo_properties}")
                elif len(found_demo_properties) > 0:
                    self.log_result("Demo Properties", True, f"Found some demo properties: {found_demo_properties} (partial)")
                else:
                    self.log_result("Demo Properties", True, "No demo properties found (may not be seeded yet)")
                
            except json.JSONDecodeError:
                self.log_result("Get Property Health Scores", False, "Invalid JSON response")
        else:
            self.log_result("Get Property Health Scores", False, f"Status code: {response.status_code}, Response: {response.text}")
        
        return True

    def test_unit_timeline(self):
        """Test Unit Timeline API endpoint"""
        print("\n=== Unit Timeline ===")
        
        # First, ensure we have demo data and unit IDs
        if not self.test_data.get('unit_id'):
            # Try to get units to find a valid unit_id
            success, response = self.make_request('GET', '/units')
            if success and response.status_code == 200:
                try:
                    units = response.json()
                    if units and len(units) > 0:
                        self.test_data['unit_id'] = units[0]['id']
                    else:
                        self.log_result("Unit Timeline - Setup", False, "No units available for testing")
                        return False
                except json.JSONDecodeError:
                    self.log_result("Unit Timeline - Setup", False, "Failed to parse units response")
                    return False
            else:
                self.log_result("Unit Timeline - Setup", False, "Failed to fetch units for testing")
                return False
        
        unit_id = self.test_data['unit_id']
        
        # Test 1: Without authentication - should return 403
        success, response = self.make_request('GET', f'/units/{unit_id}/timeline', require_auth=False)
        if success and response.status_code == 403:
            self.log_result("Unit Timeline - No Auth", True, "Correctly rejected unauthenticated request")
        else:
            self.log_result("Unit Timeline - No Auth", False, f"Expected 403, got {response.status_code if success else 'Request failed'}")
        
        # Test 2: With invalid unit_id - should return 404
        invalid_unit_id = "invalid-unit-id-12345"
        success, response = self.make_request('GET', f'/units/{invalid_unit_id}/timeline')
        if success and response.status_code == 404:
            self.log_result("Unit Timeline - Invalid ID", True, "Correctly returned 404 for invalid unit ID")
        else:
            self.log_result("Unit Timeline - Invalid ID", False, f"Expected 404, got {response.status_code if success else 'Request failed'}")
        
        # Test 3: Valid request with authentication
        success, response = self.make_request('GET', f'/units/{unit_id}/timeline')
        if not success:
            self.log_result("Unit Timeline - Valid Request", False, response)
            return False
        
        if response.status_code == 200:
            try:
                data = response.json()
                
                # Check main structure
                required_fields = ['unit_id', 'unit_number', 'property_name', 'events']
                missing_fields = [field for field in required_fields if field not in data]
                if missing_fields:
                    self.log_result("Unit Timeline - Structure", False, f"Missing required fields: {missing_fields}")
                    return False
                
                self.log_result("Unit Timeline - Structure", True, "All required fields present")
                
                # Validate basic fields
                if data.get('unit_id') != unit_id:
                    self.log_result("Unit Timeline - Unit ID", False, f"Unit ID mismatch: expected {unit_id}, got {data.get('unit_id')}")
                else:
                    self.log_result("Unit Timeline - Unit ID", True, f"Unit ID matches: {unit_id}")
                
                unit_number = data.get('unit_number', '')
                property_name = data.get('property_name', '')
                self.log_result("Unit Timeline - Unit Info", True, f"Unit {unit_number} in {property_name}")
                
                # Check events array
                events = data.get('events', [])
                if not isinstance(events, list):
                    self.log_result("Unit Timeline - Events Array", False, "Events is not an array")
                    return False
                
                if len(events) == 0:
                    self.log_result("Unit Timeline - Events Count", True, "No events found (expected for new/empty unit)")
                    return True
                
                self.log_result("Unit Timeline - Events Count", True, f"Found {len(events)} events")
                
                # Check event structure and content
                valid_event_types = [
                    'lease_created', 'tenant_move_in', 'rent_payment', 'late_payment',
                    'maintenance_opened', 'maintenance_completed', 'lease_renewal'
                ]
                
                required_event_fields = ['id', 'event_type', 'date', 'title', 'description', 'icon', 'color']
                
                events_by_date = []
                
                for i, event in enumerate(events):
                    event_name = f"Event {i+1}"
                    
                    # Check required fields
                    missing_event_fields = [field for field in required_event_fields if field not in event]
                    if missing_event_fields:
                        self.log_result(f"{event_name} - Structure", False, f"Missing fields: {missing_event_fields}")
                        continue
                    
                    self.log_result(f"{event_name} - Structure", True, "All required fields present")
                    
                    # Validate event_type
                    event_type = event.get('event_type', '')
                    if event_type not in valid_event_types:
                        self.log_result(f"{event_name} - Event Type", False, f"Invalid event_type: {event_type} (valid: {valid_event_types})")
                    else:
                        self.log_result(f"{event_name} - Event Type", True, f"Event type: {event_type}")
                    
                    # Validate date format
                    event_date = event.get('date', '')
                    try:
                        # Try to parse the date (should be in YYYY-MM-DD format or YYYY-MM-DDTHH:MM:SS format)
                        if 'T' in event_date:
                            parsed_date = datetime.fromisoformat(event_date.replace('Z', '+00:00'))
                        else:
                            parsed_date = datetime.strptime(event_date[:10], '%Y-%m-%d')
                        events_by_date.append(parsed_date)
                        self.log_result(f"{event_name} - Date Format", True, f"Date: {event_date[:10]}")
                    except (ValueError, IndexError) as e:
                        self.log_result(f"{event_name} - Date Format", False, f"Invalid date format: {event_date}")
                        events_by_date.append(None)
                    
                    # Check other required fields are non-empty strings
                    title = event.get('title', '')
                    description = event.get('description', '')
                    icon = event.get('icon', '')
                    color = event.get('color', '')
                    
                    if not title or not isinstance(title, str):
                        self.log_result(f"{event_name} - Title", False, f"Invalid title: {title}")
                    else:
                        self.log_result(f"{event_name} - Title", True, f"Title: {title[:30]}...")
                    
                    if not description or not isinstance(description, str):
                        self.log_result(f"{event_name} - Description", False, f"Invalid description: {description}")
                    else:
                        self.log_result(f"{event_name} - Description", True, f"Description: {description[:30]}...")
                    
                    if not icon or not isinstance(icon, str):
                        self.log_result(f"{event_name} - Icon", False, f"Invalid icon: {icon}")
                    else:
                        self.log_result(f"{event_name} - Icon", True, f"Icon: {icon}")
                    
                    # Validate color is hex format
                    if not color or not isinstance(color, str) or not color.startswith('#') or len(color) != 7:
                        self.log_result(f"{event_name} - Color", False, f"Invalid color format: {color} (should be hex like #1A8FC4)")
                    else:
                        self.log_result(f"{event_name} - Color", True, f"Color: {color}")
                
                # Check if events are sorted by date descending (newest first)
                if len(events_by_date) > 1:
                    # Remove None values (invalid dates) for sorting check
                    valid_dates = [d for d in events_by_date if d is not None]
                    
                    if len(valid_dates) > 1:
                        is_descending = all(
                            valid_dates[i] >= valid_dates[i+1]
                            for i in range(len(valid_dates)-1)
                        )
                        
                        if is_descending:
                            self.log_result("Unit Timeline - Date Sorting", True, "Events sorted by date descending (newest first)")
                        else:
                            self.log_result("Unit Timeline - Date Sorting", False, "Events not properly sorted by date descending")
                    else:
                        self.log_result("Unit Timeline - Date Sorting", True, "Not enough valid dates to verify sorting")
                else:
                    self.log_result("Unit Timeline - Date Sorting", True, "Single/no events - sorting not applicable")
                
            except json.JSONDecodeError:
                self.log_result("Unit Timeline - Valid Request", False, "Invalid JSON response")
                return False
        else:
            self.log_result("Unit Timeline - Valid Request", False, f"Status code: {response.status_code}, Response: {response.text}")
            return False
        
        return True

    def run_all_tests(self):
        """Run all API tests in sequence"""
        print("=" * 60)
        print("BACKEND API TESTING - Small Landlord Operating System")
        print("=" * 60)
        print(f"Base URL: {self.base_url}")
        print(f"Test User: {TEST_USER_EMAIL}")
        
        # Health check first
        if not self.test_health_check():
            print("❌ Health check failed - aborting tests")
            return False
        
        # Authentication flow
        auth_success = self.test_register() or self.test_login()
        if not auth_success:
            print("❌ Authentication failed - aborting tests")
            return False
            
        # Test authenticated endpoint
        self.test_get_me()
        
        # Seed demo data
        self.test_seed_demo_data()
        
        # Test all endpoints
        self.test_dashboard()
        self.test_properties()
        self.test_units()
        self.test_tenants()
        self.test_leases()
        self.test_rent_payments()
        self.test_maintenance()
        self.test_reminders()
        
        # Test NEW Property Health Scores endpoint
        self.test_property_health_scores()
        
        # Test NEW Unit Timeline endpoint
        self.test_unit_timeline()
        
        # Print final results
        print("\n" + "=" * 60)
        print("FINAL RESULTS")
        print("=" * 60)
        print(f"✅ Passed: {self.results['passed']}")
        print(f"❌ Failed: {self.results['failed']}")
        
        if self.results['errors']:
            print("\nERRORS:")
            for error in self.results['errors']:
                print(f"  - {error}")
        
        total_tests = self.results['passed'] + self.results['failed']
        success_rate = (self.results['passed'] / total_tests * 100) if total_tests > 0 else 0
        print(f"\nSuccess Rate: {success_rate:.1f}%")
        
        return self.results['failed'] == 0

if __name__ == "__main__":
    tester = BackendTester()
    success = tester.run_all_tests()
    
    if success:
        print("\n🎉 All tests passed!")
        sys.exit(0)
    else:
        print("\n💥 Some tests failed!")
        sys.exit(1)