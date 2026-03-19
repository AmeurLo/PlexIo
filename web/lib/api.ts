import type {
  DashboardStats, PortfolioInsights, HealthScoreResponse,
  PropertyWithStats, Unit, TenantWithDetails, LeaseWithDetails,
  RentPayment, RentOverview, MaintenanceRequestWithDetails,
  Reminder, Expense, PropertyFinancials, Notification,
  Contractor, TeamMember, Mortgage, Insurance, Inspection, Applicant,
} from "./types";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

// ─── Core fetch wrapper ───────────────────────────────────────────────────────
async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("domely_token") : null;

  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });

  if (res.status === 401) {
    if (typeof window !== "undefined") {
      localStorage.removeItem("domely_token");
      localStorage.removeItem("domely_user");
      window.location.href = "/login";
    }
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { detail?: string }).detail ?? `HTTP ${res.status}`);
  }

  // Handle 204 No Content
  if (res.status === 204) return undefined as unknown as T;

  return res.json() as Promise<T>;
}

function qs(params: Record<string, string | number | boolean | undefined>): string {
  const p = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");
  return p ? `?${p}` : "";
}

function body(data: unknown): RequestInit {
  return { body: JSON.stringify(data) };
}

// ─── API methods ──────────────────────────────────────────────────────────────
export const api = {
  // Dashboard
  getDashboard: () => apiFetch<DashboardStats>("/dashboard"),
  getInsights:  () => apiFetch<PortfolioInsights>("/insights"),
  getHealthScores: () => apiFetch<HealthScoreResponse>("/property-health-scores"),

  // Reminders
  getReminders: (includeCompleted = false) =>
    apiFetch<Reminder[]>(`/reminders${qs({ include_completed: includeCompleted })}`),
  createReminder: (data: Omit<Reminder, "id" | "user_id" | "is_completed" | "created_at">) =>
    apiFetch<Reminder>("/reminders", { method: "POST", ...body(data) }),
  completeReminder: (id: string) =>
    apiFetch<void>(`/reminders/${id}/complete`, { method: "PUT" }),
  deleteReminder: (id: string) =>
    apiFetch<void>(`/reminders/${id}`, { method: "DELETE" }),

  // Properties
  getProperties: () => apiFetch<PropertyWithStats[]>("/properties"),
  getProperty:   (id: string) => apiFetch<PropertyWithStats>(`/properties/${id}`),
  createProperty: (data: {
    name: string; address: string; city: string; province?: string;
    postal_code: string; property_type?: string; year_built?: number; notes?: string;
  }) => apiFetch<PropertyWithStats>("/properties", { method: "POST", ...body(data) }),
  updateProperty: (id: string, data: Partial<PropertyWithStats>) =>
    apiFetch<PropertyWithStats>(`/properties/${id}`, { method: "PUT", ...body(data) }),
  deleteProperty: (id: string) =>
    apiFetch<void>(`/properties/${id}`, { method: "DELETE" }),

  // Units
  getUnits: (propertyId?: string) =>
    apiFetch<Unit[]>(`/units${qs({ property_id: propertyId })}`),
  getUnit: (id: string) => apiFetch<Unit>(`/units/${id}`),
  createUnit: (data: {
    property_id: string; unit_number: string; bedrooms?: number;
    bathrooms?: number; square_feet?: number; rent_amount?: number; notes?: string;
  }) => apiFetch<Unit>("/units", { method: "POST", ...body(data) }),
  updateUnit: (id: string, data: Partial<Unit>) =>
    apiFetch<Unit>(`/units/${id}`, { method: "PUT", ...body(data) }),
  deleteUnit: (id: string) => apiFetch<void>(`/units/${id}`, { method: "DELETE" }),
  getUnitTimeline: (id: string) => apiFetch<unknown>(`/units/${id}/timeline`),
  getUnitsSummary: () => apiFetch<unknown[]>("/units-summary"),
  toggleListing: (id: string) =>
    apiFetch<{ listing_active: boolean }>(`/units/${id}/toggle-listing`, { method: "POST" }),

  // Tenants
  getTenants: () => apiFetch<TenantWithDetails[]>("/tenants"),
  getTenant:  (id: string) => apiFetch<TenantWithDetails>(`/tenants/${id}`),
  createTenant: (data: {
    first_name: string; last_name: string; email?: string; phone?: string;
    unit_id?: string; emergency_contact_name?: string; emergency_contact_phone?: string; notes?: string;
  }) => apiFetch<TenantWithDetails>("/tenants", { method: "POST", ...body(data) }),
  updateTenant: (id: string, data: Partial<TenantWithDetails>) =>
    apiFetch<TenantWithDetails>(`/tenants/${id}`, { method: "PUT", ...body(data) }),
  deleteTenant: (id: string) => apiFetch<void>(`/tenants/${id}`, { method: "DELETE" }),
  getTenantPayments: (id: string) => apiFetch<RentPayment[]>(`/tenants/${id}/payments`),
  getTenantMaintenance: (id: string) => apiFetch<MaintenanceRequestWithDetails[]>(`/tenants/${id}/maintenance`),
  getTenantDocuments: (id: string) => apiFetch<{ id: string; name: string; type: string; date: string; icon: string; color: string }[]>(`/tenants/${id}/documents`),

  // Leases
  getLeases: (activeOnly = true) =>
    apiFetch<LeaseWithDetails[]>(`/leases${qs({ active_only: activeOnly })}`),
  getLease: (id: string) => apiFetch<LeaseWithDetails>(`/leases/${id}`),
  createLease: (data: {
    tenant_id: string; unit_id: string; start_date: string; end_date: string;
    rent_amount: number; security_deposit?: number; payment_due_day?: number; notes?: string;
  }) => apiFetch<LeaseWithDetails>("/leases", { method: "POST", ...body(data) }),
  updateLease: (id: string, data: Partial<LeaseWithDetails>) =>
    apiFetch<LeaseWithDetails>(`/leases/${id}`, { method: "PUT", ...body(data) }),
  deleteLease: (id: string) => apiFetch<void>(`/leases/${id}`, { method: "DELETE" }),

  // Rent
  getRentOverview: () => apiFetch<RentOverview[]>("/rent-overview"),
  getRentPayment: (id: string) => apiFetch<RentPayment>(`/rent-payments/${id}`),
  getRentPayments: (monthYear?: string, tenantId?: string) =>
    apiFetch<RentPayment[]>(`/rent-payments${qs({ month_year: monthYear, tenant_id: tenantId })}`),
  createRentPayment: (data: {
    lease_id: string; tenant_id: string; unit_id: string; amount: number;
    payment_date: string; payment_method?: string; month_year: string; notes?: string;
  }) => apiFetch<RentPayment>("/rent-payments", { method: "POST", ...body(data) }),
  deleteRentPayment: (id: string) => apiFetch<void>(`/rent-payments/${id}`, { method: "DELETE" }),

  // Maintenance
  getMaintenanceRequests: (status?: string, propertyId?: string) =>
    apiFetch<MaintenanceRequestWithDetails[]>(`/maintenance${qs({ status, property_id: propertyId })}`),
  createMaintenanceRequest: (data: {
    property_id: string; unit_id?: string; title: string; description: string;
    priority?: string; reported_by?: string;
  }) => apiFetch<MaintenanceRequestWithDetails>("/maintenance", { method: "POST", ...body(data) }),
  updateMaintenanceRequest: (id: string, data: Partial<MaintenanceRequestWithDetails> | string, cost?: number, notes?: string) =>
    typeof data === "string"
      ? apiFetch<MaintenanceRequestWithDetails>(`/maintenance/${id}${qs({ status: data, cost, notes })}`, { method: "PUT" })
      : apiFetch<MaintenanceRequestWithDetails>(`/maintenance/${id}`, { method: "PUT", ...body(data) }),
  deleteMaintenanceRequest: (id: string) =>
    apiFetch<void>(`/maintenance/${id}`, { method: "DELETE" }),

  // Expenses
  getExpenses: (propertyId?: string, monthYear?: string, category?: string) =>
    apiFetch<Expense[]>(`/expenses${qs({ property_id: propertyId, month_year: monthYear, category })}`),
  createExpense: (data: {
    property_id: string; unit_id?: string; title: string; amount: number;
    category: string; expense_date: string; notes?: string;
  }) => apiFetch<Expense>("/expenses", { method: "POST", ...body(data) }),
  updateExpense: (id: string, data: Partial<Expense>) =>
    apiFetch<Expense>(`/expenses/${id}`, { method: "PUT", ...body(data) }),
  deleteExpense: (id: string) => apiFetch<void>(`/expenses/${id}`, { method: "DELETE" }),
  getPropertyFinancials: (id: string, monthYear?: string, period?: "monthly" | "ytd") =>
    apiFetch<PropertyFinancials>(`/properties/${id}/financials${qs({ month_year: monthYear, period })}`),

  // Messaging
  getConversations: () => apiFetch<unknown[]>("/messages/conversations"),
  getMessages: (tenantId: string) => apiFetch<unknown[]>(`/messages/${tenantId}`),
  sendMessage: (tenantId: string, content: string) =>
    apiFetch<unknown>("/messages", { method: "POST", ...body({ tenant_id: tenantId, content, sender_type: "landlord" }) }),
  markMessagesRead: (tenantId: string) =>
    apiFetch<void>(`/messages/${tenantId}/read`, { method: "PUT" }),

  // AI Chat
  aiChat: (messages: { role: "user" | "assistant"; content: string }[], context?: string) =>
    apiFetch<{ response: string }>("/ai/chat", { method: "POST", ...body({ messages, context }) }),
  chatWithAI: (messages: { role: "user" | "assistant"; content: string }[]) =>
    apiFetch<{ message: string; response: string }>("/ai/chat", { method: "POST", ...body({ messages }) }),

  // Notifications
  getNotifications: () => apiFetch<Notification[]>("/notifications"),
  markNotificationRead: (id: string) =>
    apiFetch<void>("/notifications/read-one", { method: "POST", ...body({ notification_id: id }) }),
  markAllNotificationsRead: (ids: string[]) =>
    apiFetch<void>("/notifications/read-all", { method: "POST", ...body({ ids }) }),
  getNotificationPrefs: () => apiFetch<Record<string, boolean>>("/notification-prefs"),
  saveNotificationPrefs: (prefs: Record<string, boolean>) =>
    apiFetch<void>("/notification-prefs", { method: "PUT", ...body(prefs) }),

  // Contractors
  getContractors: () => apiFetch<Contractor[]>("/contractors"),
  createContractor: (data: Partial<Contractor>) =>
    apiFetch<Contractor>("/contractors", { method: "POST", ...body(data) }),
  updateContractor: (id: string, data: Partial<Contractor>) =>
    apiFetch<void>(`/contractors/${id}`, { method: "PUT", ...body(data) }),
  deleteContractor: (id: string) => apiFetch<void>(`/contractors/${id}`, { method: "DELETE" }),

  // Team
  getTeam: () => apiFetch<TeamMember[]>("/team"),
  getTeamMembers: () => apiFetch<TeamMember[]>("/team"),
  addTeamMember: (data: Partial<TeamMember>) =>
    apiFetch<TeamMember>("/team", { method: "POST", ...body(data) }),
  inviteTeamMember: (data: Partial<TeamMember>) =>
    apiFetch<TeamMember>("/team", { method: "POST", ...body(data) }),
  updateTeamMember: (id: string, data: Partial<TeamMember>) =>
    apiFetch<void>(`/team/${id}`, { method: "PUT", ...body(data) }),
  deleteTeamMember: (id: string) => apiFetch<void>(`/team/${id}`, { method: "DELETE" }),
  removeTeamMember: (id: string) => apiFetch<void>(`/team/${id}`, { method: "DELETE" }),

  // Vacancies & Applicants
  getVacantUnits: () => apiFetch<unknown[]>("/vacant-units"),
  getAllApplicants: () => apiFetch<Applicant[]>("/applicants"),
  getApplicants: (unitId?: string) =>
    apiFetch<Applicant[]>(`/applicants${qs({ unit_id: unitId })}`),
  addApplicant: (data: { unit_id: string; name: string; email?: string; phone: string; income?: string; message?: string }) =>
    apiFetch<Applicant>("/applicants", { method: "POST", ...body(data) }),
  createApplicant: (data: Partial<Applicant>) =>
    apiFetch<Applicant>("/applicants", { method: "POST", ...body(data) }),
  updateApplicantStatus: (id: string, status: string) =>
    apiFetch<void>(`/applicants/${id}`, { method: "PUT", ...body({ status }) }),
  updateApplicant: (id: string, data: Partial<Applicant>) =>
    apiFetch<void>(`/applicants/${id}`, { method: "PUT", ...body(data) }),
  deleteApplicant: (id: string) => apiFetch<void>(`/applicants/${id}`, { method: "DELETE" }),

  // Mortgages
  getMortgages: () => apiFetch<Mortgage[]>("/mortgages"),
  createMortgage: (data: Partial<Mortgage>) =>
    apiFetch<Mortgage>("/mortgages", { method: "POST", ...body(data) }),
  updateMortgage: (id: string, data: Partial<Mortgage>) =>
    apiFetch<void>(`/mortgages/${id}`, { method: "PUT", ...body(data) }),
  deleteMortgage: (id: string) => apiFetch<void>(`/mortgages/${id}`, { method: "DELETE" }),

  // Insurance
  getInsurance: () => apiFetch<Insurance[]>("/insurance"),
  getInsurances: () => apiFetch<Insurance[]>("/insurance"),
  createInsurance: (data: Partial<Insurance>) =>
    apiFetch<Insurance>("/insurance", { method: "POST", ...body(data) }),
  updateInsurance: (id: string, data: Partial<Insurance>) =>
    apiFetch<void>(`/insurance/${id}`, { method: "PUT", ...body(data) }),
  deleteInsurance: (id: string) => apiFetch<void>(`/insurance/${id}`, { method: "DELETE" }),

  // Inspections
  getInspections: () => apiFetch<Inspection[]>("/inspections"),
  createInspection: (data: Partial<Inspection>) =>
    apiFetch<Inspection>("/inspections", { method: "POST", ...body(data) }),
  updateInspection: (id: string, data: Partial<Inspection>) =>
    apiFetch<Inspection>(`/inspections/${id}`, { method: "PUT", ...body(data) }),
  deleteInspection: (id: string) => apiFetch<void>(`/inspections/${id}`, { method: "DELETE" }),

  // Automations
  getAutomations: () =>
    apiFetch<{ automation_id: string; is_enabled: boolean; delay_days?: number }[]>("/automations"),
  saveAutomations: (settings: { automation_id: string; is_enabled: boolean; delay_days?: number | null }[]) =>
    apiFetch<void>("/automations", { method: "PUT", ...body({ settings }) }),
  toggleAutomation: (key: string, enabled: boolean) =>
    apiFetch<void>("/automations", { method: "PUT", ...body({ settings: [{ automation_id: key, is_enabled: enabled }] }) }),

  // Auth / Profile
  getProfile: () => apiFetch<unknown>("/auth/me"),
  updateProfile: (data: { full_name?: string; email?: string; phone?: string }) =>
    apiFetch<unknown>("/auth/me", { method: "PATCH", ...body(data) }),
  changePassword: (data: { current_password: string; new_password: string }) =>
    apiFetch<unknown>("/auth/change-password", { method: "POST", ...body(data) }),

  // Rent (additional)
  updateRentPayment: (id: string, data: Partial<RentPayment>) =>
    apiFetch<RentPayment>(`/rent-payments/${id}`, { method: "PUT", ...body(data) }),

  // Demo data
  seedDemoData: () =>
    apiFetch<{ message: string; seeded: boolean }>("/seed-demo-data", { method: "POST" }),
  resetDemoData: () =>
    apiFetch<{ message: string; seeded: boolean }>("/reset-demo-data", { method: "POST" }),
};
