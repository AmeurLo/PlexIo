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
  UnitTimeline,
} from '../types';
import { useAuthStore } from '../store/authStore';

const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';
if (!process.env.EXPO_PUBLIC_BACKEND_URL) {
  console.warn('[Domely] EXPO_PUBLIC_BACKEND_URL is not set. API calls will fail.');
}

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
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Token expired or invalid — trigger full logout (clears store + AsyncStorage)
          await useAuthStore.getState().logout();
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

  async updateProfile(data: { full_name?: string; email?: string }): Promise<User> {
    const response = await this.client.patch('/auth/me', data);
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

  async getTenantPayments(tenantId: string): Promise<any[]> {
    const response = await this.client.get(`/tenants/${tenantId}/payments`);
    return response.data;
  }

  async getTenantMaintenance(tenantId: string): Promise<any[]> {
    const response = await this.client.get(`/tenants/${tenantId}/maintenance`);
    return response.data;
  }

  async getTenantDocuments(tenantId: string): Promise<any[]> {
    const response = await this.client.get(`/tenants/${tenantId}/documents`);
    return response.data;
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
    photos?: string[];
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

  // Unit Timeline
  async getUnitTimeline(unitId: string): Promise<UnitTimeline> {
    const response = await this.client.get(`/units/${unitId}/timeline`);
    return response.data;
  }

  // Expenses
  async getExpenses(propertyId?: string, monthYear?: string, category?: string): Promise<any[]> {
    const params: any = {};
    if (propertyId) params.property_id = propertyId;
    if (monthYear) params.month_year = monthYear;
    if (category) params.category = category;
    const response = await this.client.get('/expenses', { params });
    return response.data;
  }

  async createExpense(data: {
    property_id: string;
    unit_id?: string;
    title: string;
    amount: number;
    category: string;
    expense_date: string;
    notes?: string;
  }): Promise<any> {
    const response = await this.client.post('/expenses', data);
    return response.data;
  }

  async updateExpense(id: string, data: any): Promise<any> {
    const response = await this.client.put(`/expenses/${id}`, data);
    return response.data;
  }

  async deleteExpense(id: string): Promise<void> {
    await this.client.delete(`/expenses/${id}`);
  }

  async scanReceipt(imageBase64: string): Promise<{
    title: string | null;
    amount: number | null;
    date: string | null;
    category: string | null;
    notes: string | null;
  }> {
    const response = await this.client.post('/expenses/scan-receipt', { image_base64: imageBase64 });
    return response.data;
  }

  async getPropertyFinancials(propertyId: string, monthYear?: string, period?: 'monthly' | 'ytd'): Promise<any> {
    const params: any = {};
    if (monthYear) params.month_year = monthYear;
    if (period) params.period = period;
    const response = await this.client.get(`/properties/${propertyId}/financials`, { params });
    return response.data;
  }

  async exportPropertyFinancials(propertyId: string, monthYear?: string, period?: 'monthly' | 'ytd'): Promise<string> {
    const params: any = {};
    if (monthYear) params.month_year = monthYear;
    if (period) params.period = period;
    const response = await this.client.get(`/properties/${propertyId}/financials/export`, { params, responseType: 'text' });
    return response.data;
  }

  // AI Chat
  async aiChat(messages: { role: 'user' | 'assistant'; content: string }[], context?: string): Promise<{ response: string }> {
    const response = await this.client.post('/ai/chat', { messages, context });
    return response.data;
  }

  // Messaging
  async getConversations(): Promise<any[]> {
    const response = await this.client.get('/messages/conversations');
    return response.data;
  }

  async getMessages(tenantId: string): Promise<any[]> {
    const response = await this.client.get(`/messages/${tenantId}`);
    return response.data;
  }

  async sendMessage(tenantId: string, content: string, senderType: 'landlord' | 'tenant' = 'landlord'): Promise<any> {
    const response = await this.client.post('/messages', {
      tenant_id: tenantId,
      content,
      sender_type: senderType,
    });
    return response.data;
  }

  async markMessagesRead(tenantId: string): Promise<void> {
    await this.client.put(`/messages/${tenantId}/read`);
  }

  async getAutomations(): Promise<{ automation_id: string; is_enabled: boolean; delay_days?: number }[]> {
    const response = await this.client.get('/automations');
    return response.data;
  }

  async saveAutomations(settings: { automation_id: string; is_enabled: boolean; delay_days?: number | null }[]): Promise<void> {
    await this.client.put('/automations', { settings });
  }

  async getNotifications(): Promise<any[]> {
    const response = await this.client.get('/notifications');
    return response.data;
  }

  async markNotificationRead(notificationId: string): Promise<void> {
    await this.client.post('/notifications/read-one', { notification_id: notificationId });
  }

  async markAllNotificationsRead(ids: string[]): Promise<void> {
    await this.client.post('/notifications/read-all', { ids });
  }

  async getNotificationPrefs(): Promise<Record<string, boolean>> {
    const response = await this.client.get('/notification-prefs');
    return response.data;
  }

  async saveNotificationPrefs(prefs: Record<string, boolean>): Promise<void> {
    await this.client.put('/notification-prefs', prefs);
  }

  async getVacantUnits(): Promise<any[]> {
    const response = await this.client.get('/vacant-units');
    return response.data;
  }

  async toggleListing(unitId: string): Promise<{ listing_active: boolean }> {
    const response = await this.client.post(`/units/${unitId}/toggle-listing`);
    return response.data;
  }

  async getApplicants(unitId: string): Promise<any[]> {
    const response = await this.client.get('/applicants', { params: { unit_id: unitId } });
    return response.data;
  }

  async addApplicant(data: { unit_id: string; name: string; email?: string; phone: string; income?: string; message?: string }): Promise<any> {
    const response = await this.client.post('/applicants', data);
    return response.data;
  }

  async updateApplicantStatus(id: string, status: string): Promise<void> {
    await this.client.put(`/applicants/${id}`, { status });
  }

  async deleteApplicant(id: string): Promise<void> {
    await this.client.delete(`/applicants/${id}`);
  }

  async getContractors(): Promise<any[]> {
    const response = await this.client.get('/contractors');
    return response.data;
  }

  async createContractor(data: any): Promise<any> {
    const response = await this.client.post('/contractors', data);
    return response.data;
  }

  async updateContractor(id: string, data: any): Promise<void> {
    await this.client.put(`/contractors/${id}`, data);
  }

  async deleteContractor(id: string): Promise<void> {
    await this.client.delete(`/contractors/${id}`);
  }

  async getTeam(): Promise<any[]> {
    const response = await this.client.get('/team');
    return response.data;
  }

  async addTeamMember(data: any): Promise<any> {
    const response = await this.client.post('/team', data);
    return response.data;
  }

  async updateTeamMember(id: string, data: any): Promise<void> {
    await this.client.put(`/team/${id}`, data);
  }

  async deleteTeamMember(id: string): Promise<void> {
    await this.client.delete(`/team/${id}`);
  }

  // Demo data
  async seedDemoData(): Promise<{ message: string; seeded: boolean; data?: any }> {
    const response = await this.client.post('/seed-demo-data');
    return response.data;
  }

  // Mortgages
  async getMortgages(): Promise<any[]> {
    const response = await this.client.get('/mortgages');
    return response.data;
  }
  async createMortgage(data: any): Promise<any> {
    const response = await this.client.post('/mortgages', data);
    return response.data;
  }
  async updateMortgage(id: string, data: any): Promise<void> {
    await this.client.put(`/mortgages/${id}`, data);
  }
  async deleteMortgage(id: string): Promise<void> {
    await this.client.delete(`/mortgages/${id}`);
  }

  // Insurance
  async getInsurance(): Promise<any[]> {
    const response = await this.client.get('/insurance');
    return response.data;
  }
  async createInsurance(data: any): Promise<any> {
    const response = await this.client.post('/insurance', data);
    return response.data;
  }
  async updateInsurance(id: string, data: any): Promise<void> {
    await this.client.put(`/insurance/${id}`, data);
  }
  async deleteInsurance(id: string): Promise<void> {
    await this.client.delete(`/insurance/${id}`);
  }

  // Inspections
  async getInspections(): Promise<any[]> {
    const response = await this.client.get('/inspections');
    return response.data;
  }
  async createInspection(data: any): Promise<any> {
    const response = await this.client.post('/inspections', data);
    return response.data;
  }
  async deleteInspection(id: string): Promise<void> {
    await this.client.delete(`/inspections/${id}`);
  }

  // Units summary (market-rent comparison)
  async getUnitsSummary(): Promise<any[]> {
    const response = await this.client.get('/units-summary');
    return response.data;
  }

  // All applicants (pipeline view)
  async getAllApplicants(): Promise<any[]> {
    const response = await this.client.get('/applicants');
    return response.data;
  }
  async updateApplicantStatus(id: string, status: string): Promise<void> {
    await this.client.put(`/applicants/${id}`, { status });
  }
  async deleteApplicant(id: string): Promise<void> {
    await this.client.delete(`/applicants/${id}`);
  }

  async registerPushToken(token: string): Promise<void> {
    await this.client.post('/push-token', { token });
  }
}

export const api = new ApiService();

// ─── Tenant Portal API (separate token management) ────────────────────────────

const TENANT_TOKEN_KEY = 'tenant_token';

function tenantClient(token: string) {
  return axios.create({
    baseURL: `${BASE_URL}/api`,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    timeout: 15000,
  });
}

export const tenantApi = {
  /** Request OTP — no auth needed */
  async requestCode(email: string): Promise<{ ok: boolean; dev_code?: string; message?: string }> {
    const res = await axios.post(`${BASE_URL}/api/auth/tenant/request-code`, { email });
    return res.data;
  },

  /** Verify OTP — returns token + profile */
  async verifyCode(email: string, code: string): Promise<{ access_token: string; profile: any }> {
    const res = await axios.post(`${BASE_URL}/api/auth/tenant/verify-code`, { email, code });
    await AsyncStorage.setItem(TENANT_TOKEN_KEY, res.data.access_token);
    return res.data;
  },

  async getStoredToken(): Promise<string | null> {
    return AsyncStorage.getItem(TENANT_TOKEN_KEY);
  },

  async logout() {
    await AsyncStorage.removeItem(TENANT_TOKEN_KEY);
  },

  async getProfile(token: string): Promise<any> {
    const res = await tenantClient(token).get('/tenant/profile');
    return res.data;
  },

  async getPayments(token: string): Promise<any[]> {
    const res = await tenantClient(token).get('/tenant/payments');
    return res.data;
  },

  async getMaintenance(token: string): Promise<any[]> {
    const res = await tenantClient(token).get('/tenant/maintenance');
    return res.data;
  },

  async submitMaintenance(token: string, data: { title: string; description?: string; category: string; urgency: string }): Promise<any> {
    const res = await tenantClient(token).post('/tenant/maintenance', data);
    return res.data;
  },

  async getMessages(token: string): Promise<any[]> {
    const res = await tenantClient(token).get('/tenant/messages');
    return res.data;
  },

  async sendMessage(token: string, content: string): Promise<any> {
    const res = await tenantClient(token).post('/tenant/messages', { content });
    return res.data;
  },
};
