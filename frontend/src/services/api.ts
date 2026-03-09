import axios, { AxiosInstance, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  User,
  PropertyWithStats,
  Unit,
  TenantWithDetails,
  LeaseWithDetails,
  RentPayment,
  RentOverview,
  MaintenanceRequestWithDetails,
  Reminder,
  DashboardStats,
  PortfolioInsights,
  HealthScoreResponse,
} from '../types';

const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: `${BASE_URL}/api`,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add auth interceptor
    this.client.interceptors.request.use(async (config) => {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Handle unauthorized - could trigger logout
          console.log('Unauthorized request');
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  async register(email: string, password: string, fullName: string): Promise<{ access_token: string; user: User }> {
    const response = await this.client.post('/auth/register', {
      email,
      password,
      full_name: fullName,
    });
    return response.data;
  }

  async login(email: string, password: string): Promise<{ access_token: string; user: User }> {
    const response = await this.client.post('/auth/login', { email, password });
    return response.data;
  }

  async getMe(): Promise<User> {
    const response = await this.client.get('/auth/me');
    return response.data;
  }

  // Dashboard
  async getDashboard(): Promise<DashboardStats> {
    const response = await this.client.get('/dashboard');
    return response.data;
  }

  // Properties
  async getProperties(): Promise<PropertyWithStats[]> {
    const response = await this.client.get('/properties');
    return response.data;
  }

  async getProperty(id: string): Promise<PropertyWithStats> {
    const response = await this.client.get(`/properties/${id}`);
    return response.data;
  }

  async createProperty(data: {
    name: string;
    address: string;
    city: string;
    province?: string;
    postal_code: string;
    property_type?: string;
    year_built?: number;
    notes?: string;
  }): Promise<PropertyWithStats> {
    const response = await this.client.post('/properties', data);
    return response.data;
  }

  async updateProperty(id: string, data: any): Promise<PropertyWithStats> {
    const response = await this.client.put(`/properties/${id}`, data);
    return response.data;
  }

  async deleteProperty(id: string): Promise<void> {
    await this.client.delete(`/properties/${id}`);
  }

  // Units
  async getUnits(propertyId?: string): Promise<Unit[]> {
    const params = propertyId ? { property_id: propertyId } : {};
    const response = await this.client.get('/units', { params });
    return response.data;
  }

  async getUnit(id: string): Promise<Unit> {
    const response = await this.client.get(`/units/${id}`);
    return response.data;
  }

  async createUnit(data: {
    property_id: string;
    unit_number: string;
    bedrooms?: number;
    bathrooms?: number;
    square_feet?: number;
    rent_amount?: number;
    notes?: string;
  }): Promise<Unit> {
    const response = await this.client.post('/units', data);
    return response.data;
  }

  async updateUnit(id: string, data: any): Promise<Unit> {
    const response = await this.client.put(`/units/${id}`, data);
    return response.data;
  }

  async deleteUnit(id: string): Promise<void> {
    await this.client.delete(`/units/${id}`);
  }

  // Tenants
  async getTenants(): Promise<TenantWithDetails[]> {
    const response = await this.client.get('/tenants');
    return response.data;
  }

  async getTenant(id: string): Promise<TenantWithDetails> {
    const response = await this.client.get(`/tenants/${id}`);
    return response.data;
  }

  async createTenant(data: {
    first_name: string;
    last_name: string;
    email?: string;
    phone?: string;
    unit_id?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    notes?: string;
  }): Promise<TenantWithDetails> {
    const response = await this.client.post('/tenants', data);
    return response.data;
  }

  async updateTenant(id: string, data: any): Promise<TenantWithDetails> {
    const response = await this.client.put(`/tenants/${id}`, data);
    return response.data;
  }

  async deleteTenant(id: string): Promise<void> {
    await this.client.delete(`/tenants/${id}`);
  }

  // Leases
  async getLeases(activeOnly: boolean = true): Promise<LeaseWithDetails[]> {
    const response = await this.client.get('/leases', { params: { active_only: activeOnly } });
    return response.data;
  }

  async getLease(id: string): Promise<LeaseWithDetails> {
    const response = await this.client.get(`/leases/${id}`);
    return response.data;
  }

  async createLease(data: {
    tenant_id: string;
    unit_id: string;
    start_date: string;
    end_date: string;
    rent_amount: number;
    security_deposit?: number;
    payment_due_day?: number;
    notes?: string;
  }): Promise<LeaseWithDetails> {
    const response = await this.client.post('/leases', data);
    return response.data;
  }

  async updateLease(id: string, data: any): Promise<LeaseWithDetails> {
    const response = await this.client.put(`/leases/${id}`, data);
    return response.data;
  }

  async deleteLease(id: string): Promise<void> {
    await this.client.delete(`/leases/${id}`);
  }

  // Rent Payments
  async getRentPayments(monthYear?: string, tenantId?: string): Promise<RentPayment[]> {
    const params: any = {};
    if (monthYear) params.month_year = monthYear;
    if (tenantId) params.tenant_id = tenantId;
    const response = await this.client.get('/rent-payments', { params });
    return response.data;
  }

  async createRentPayment(data: {
    lease_id: string;
    tenant_id: string;
    unit_id: string;
    amount: number;
    payment_date: string;
    payment_method?: string;
    month_year: string;
    notes?: string;
  }): Promise<RentPayment> {
    const response = await this.client.post('/rent-payments', data);
    return response.data;
  }

  async deleteRentPayment(id: string): Promise<void> {
    await this.client.delete(`/rent-payments/${id}`);
  }

  async getRentOverview(): Promise<RentOverview[]> {
    const response = await this.client.get('/rent-overview');
    return response.data;
  }

  // Maintenance
  async getMaintenanceRequests(status?: string, propertyId?: string): Promise<MaintenanceRequestWithDetails[]> {
    const params: any = {};
    if (status) params.status = status;
    if (propertyId) params.property_id = propertyId;
    const response = await this.client.get('/maintenance', { params });
    return response.data;
  }

  async getMaintenanceRequest(id: string): Promise<MaintenanceRequestWithDetails> {
    const response = await this.client.get(`/maintenance/${id}`);
    return response.data;
  }

  async createMaintenanceRequest(data: {
    property_id: string;
    unit_id?: string;
    title: string;
    description: string;
    priority?: string;
    reported_by?: string;
  }): Promise<MaintenanceRequestWithDetails> {
    const response = await this.client.post('/maintenance', data);
    return response.data;
  }

  async updateMaintenanceRequest(
    id: string,
    status: string,
    cost?: number,
    notes?: string
  ): Promise<MaintenanceRequestWithDetails> {
    const params: any = { status };
    if (cost !== undefined) params.cost = cost;
    if (notes !== undefined) params.notes = notes;
    const response = await this.client.put(`/maintenance/${id}`, null, { params });
    return response.data;
  }

  async deleteMaintenanceRequest(id: string): Promise<void> {
    await this.client.delete(`/maintenance/${id}`);
  }

  // Reminders
  async getReminders(includeCompleted: boolean = false): Promise<Reminder[]> {
    const response = await this.client.get('/reminders', { params: { include_completed: includeCompleted } });
    return response.data;
  }

  async createReminder(data: {
    title: string;
    description?: string;
    due_date: string;
    reminder_type?: string;
    related_id?: string;
  }): Promise<Reminder> {
    const response = await this.client.post('/reminders', data);
    return response.data;
  }

  async completeReminder(id: string): Promise<void> {
    await this.client.put(`/reminders/${id}/complete`);
  }

  async deleteReminder(id: string): Promise<void> {
    await this.client.delete(`/reminders/${id}`);
  }

  // Insights
  async getInsights(): Promise<PortfolioInsights> {
    const response = await this.client.get('/insights');
    return response.data;
  }

  // Property Health Scores
  async getHealthScores(): Promise<HealthScoreResponse> {
    const response = await this.client.get('/property-health-scores');
    return response.data;
  }

  // Demo data
  async seedDemoData(): Promise<{ message: string; seeded: boolean; data?: any }> {
    const response = await this.client.post('/seed-demo-data');
    return response.data;
  }
}

export const api = new ApiService();
