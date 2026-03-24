// ─── Core types ─────────────────────────────────────────────────────────────
// The API serializes MongoDB _id as `id`. Pages also accept _id for raw responses.

export interface User {
  id: string;
  _id?: string;
  email: string;
  full_name: string;
  plan?: string;
  plan_status?: string;
  created_at?: string;
}

export interface Property {
  id: string;
  _id?: string;
  user_id?: string;
  name: string;
  address?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  property_type?: string;
  year_built?: number;
  total_units?: number;
  occupied_units?: number;
  purchase_price?: number;
  current_value?: number;
  description?: string;
  status?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PropertyWithStats extends Property {
  vacant_units?: number;
  rent_collected?: number;
  rent_expected?: number;
  monthly_revenue?: number;
  total_expenses?: number;
  net_cash_flow?: number;
  open_maintenance?: number;
  next_lease_expiry?: string;
}

export interface Unit {
  id: string;
  _id?: string;
  property_id: string;
  unit_number: string;
  bedrooms?: number;
  bathrooms?: number;
  square_feet?: number;
  rent_amount?: number;
  is_occupied?: boolean;
  current_tenant_id?: string;
  notes?: string;
  created_at?: string;
}

export interface Tenant {
  id: string;
  _id?: string;
  user_id?: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  unit_id?: string;
  property_id?: string;
  unit_number?: string;
  move_in_date?: string;
  status?: string;
  emergency_contact?: { name?: string; phone?: string };
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  notes?: string;
  created_at?: string;
}

export interface TenantWithDetails extends Tenant {
  property_name?: string;
  lease_end_date?: string;
  rent_status?: "paid" | "late" | "pending" | "N/A";
}

export interface Lease {
  id: string;
  _id?: string;
  user_id?: string;
  tenant_id?: string;
  unit_id?: string;
  property_id?: string;
  unit_number?: string;
  start_date?: string;
  end_date?: string;
  rent_amount?: number;
  monthly_rent?: number;
  security_deposit?: number;
  deposit_amount?: number;
  payment_due_day?: number;
  lease_type?: string;
  is_active?: boolean;
  status?: string;
  notes?: string;
  created_at?: string;
}

export interface LeaseWithDetails extends Lease {
  tenant_name?: string;
  property_name?: string;
  days_until_expiry?: number;
}

export interface RentPayment {
  id: string;
  _id?: string;
  user_id?: string;
  lease_id?: string;
  tenant_id?: string;
  unit_id?: string;
  property_id?: string;
  tenant_name?: string;
  property_name?: string;
  amount?: number;
  payment_date?: string;
  due_date?: string;
  payment_method?: string;
  month_year?: string;
  status?: string;
  notes?: string;
  created_at?: string;
}

export interface RentOverview {
  tenant_id: string;
  tenant_name: string;
  unit_number?: string;
  property_name?: string;
  rent_amount: number;
  payment_due_day: number;
  status: "paid" | "late" | "pending";
  payment_date?: string;
  amount_paid: number;
  lease_id?: string;
}

export interface MaintenanceRequest {
  id: string;
  _id?: string;
  user_id?: string;
  property_id?: string;
  unit_id?: string;
  unit_number?: string;
  title: string;
  description?: string;
  priority?: string;
  status?: string;
  reported_by?: string;
  cost?: number;
  estimated_cost?: number;
  assigned_contractor?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  completed_at?: string;
}

export interface MaintenanceRequestWithDetails extends MaintenanceRequest {
  property_name?: string;
}

export interface Reminder {
  id: string;
  user_id?: string;
  title: string;
  description?: string;
  due_date: string;
  reminder_type: string;
  related_id?: string;
  is_completed: boolean;
  created_at?: string;
}

export interface DashboardStats {
  total_properties?: number;
  total_tenants?: number;
  total_units?: number;
  occupied_units?: number;
  vacant_units?: number;
  occupancy_rate?: number;
  total_rent_expected?: number;
  total_rent_collected?: number;
  monthly_revenue?: number;
  collected_this_month?: number;
  pending_rent?: number;
  collection_rate?: number;
  open_maintenance_requests?: number;
  open_maintenance?: number;
  leases_expiring_soon?: number;
  overdue_rent_count?: number;
  current_month?: string;
  recent_payments?: any[];
  alerts?: any[];
}

export interface PropertyPerformance {
  property_id: string;
  property_name: string;
  property_type?: string;
  total_units?: number;
  occupied_units?: number;
  occupancy_rate?: number;
  rent_collected?: number;
  revenue?: number;
  rent_expected?: number;
  collection_rate?: number;
  maintenance_expenses?: number;
  expenses?: number;
  open_issues?: number;
  estimated_profit?: number;
}

export interface InsightAlert {
  id: string;
  type: string;
  severity?: "info" | "warning" | "critical";
  title?: string;
  description: string;
  related_id?: string;
  action_label?: string;
}

export interface InsightRecommendation {
  id: string;
  type: string;
  title: string;
  description: string;
  priority?: "high" | "medium" | "low";
  action_label?: string;
  related_id?: string;
}

export interface PortfolioInsights {
  total_rent_collected?: number;
  total_rent_expected?: number;
  collection_rate?: number;
  maintenance_expenses?: number;
  net_cash_flow?: number;
  occupancy_rate?: number;
  total_properties?: number;
  total_units?: number;
  occupied_units?: number;
  vacant_units?: number;
  current_month?: string;
  property_performance?: PropertyPerformance[];
  property_breakdown?: PropertyPerformance[];
  expense_breakdown?: { category: string; total: number }[];
  alerts?: InsightAlert[];
  recommendations?: InsightRecommendation[];
  summary?: Record<string, number>;
}

export interface Expense {
  id: string;
  _id?: string;
  user_id?: string;
  property_id?: string;
  unit_id?: string;
  title: string;
  amount?: number;
  category?: string;
  expense_date?: string;
  date?: string;
  vendor?: string;
  is_tax_deductible?: boolean;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PropertyFinancials {
  property_id: string;
  property_name: string;
  month_year?: string;
  expected_rent?: number;
  collected_rent?: number;
  total_expenses?: number;
  maintenance_expenses?: number;
  net_cash_flow?: number;
  occupancy_rate?: number;
  expense_ratio?: number;
  expenses?: Expense[];
}

export interface HealthScoreBreakdown {
  rent_collection: number;
  occupancy: number;
  maintenance: number;
  lease_stability: number;
  financial_performance: number;
}

export interface PropertyHealthScore {
  property_id: string;
  property_name: string;
  property_type?: string;
  score: number;
  status: "healthy" | "moderate" | "at_risk";
  breakdown?: HealthScoreBreakdown;
  total_units?: number;
  occupied_units?: number;
  open_issues?: number;
  collection_rate?: number;
  days_to_nearest_expiry?: number | null;
}

export interface HealthScoreResponse {
  properties: PropertyHealthScore[];
  portfolio_average?: number;
  portfolio_status?: "healthy" | "moderate" | "at_risk";
}

export interface Contractor {
  id: string;
  _id?: string;
  name: string;
  trade?: string;
  company?: string;
  specialty?: string;
  phone?: string;
  email?: string;
  hourly_rate?: number;
  rating?: number;
  notes?: string;
  created_at?: string;
}

export interface TeamMember {
  id: string;
  _id?: string;
  name?: string;
  full_name?: string;
  email: string;
  role?: string;
  status?: string;
  permissions?: Record<string, boolean>;
  created_at?: string;
}

export interface Mortgage {
  id: string;
  _id?: string;
  property_id?: string;
  lender?: string;
  original_amount?: number;
  original_principal?: number;
  current_balance?: number;
  interest_rate?: number;
  monthly_payment?: number;
  maturity_date?: string;
  start_date?: string;
  end_date?: string;
  mortgage_type?: string;
  amortization_years?: number;
  notes?: string;
}

export interface Insurance {
  id: string;
  _id?: string;
  property_id?: string;
  insurer?: string;
  policy_number?: string;
  coverage_type?: string;
  insurance_type?: string;
  coverage_amount?: number;
  annual_premium?: number;
  renewal_date?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
  contact_info?: string;
  notes?: string;
}

export interface Inspection {
  id: string;
  type: string;
  unit?: string;
  tenant?: string;
  date: string;
  status: string;
  items_done?: number;
  total_items?: number;
  created_at?: string;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  body?: string;
  is_read: boolean;
  created_at: string;
  related_id?: string;
}

export interface Applicant {
  id: string;
  _id?: string;
  unit_id?: string;
  property_id?: string;
  name?: string;
  full_name?: string;
  email?: string;
  phone?: string;
  income?: string;
  monthly_income?: number;
  credit_score?: number;
  unit_number?: string;
  message?: string;
  notes?: string;
  status?: "pending" | "reviewing" | "approved" | "rejected";
  applied_at?: string;
  created_at?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

export const EXPENSE_CATEGORIES = [
  { value: "repairs",      fr: "Réparations",       en: "Repairs" },
  { value: "maintenance",  fr: "Maintenance",        en: "Maintenance" },
  { value: "insurance",    fr: "Assurance",          en: "Insurance" },
  { value: "property_tax", fr: "Taxes foncières",   en: "Property Tax" },
  { value: "utilities",    fr: "Services publics",  en: "Utilities" },
  { value: "mortgage",     fr: "Hypothèque",         en: "Mortgage" },
  { value: "cleaning",     fr: "Nettoyage",          en: "Cleaning" },
  { value: "renovation",   fr: "Rénovation",         en: "Renovation" },
  { value: "management",   fr: "Gestion",            en: "Management" },
  { value: "legal",        fr: "Frais juridiques",  en: "Legal fees" },
  { value: "other",        fr: "Autre",              en: "Other" },
] as const;

export const PROVINCES = [
  { value: "QC" }, { value: "ON" }, { value: "BC" }, { value: "AB" },
  { value: "MB" }, { value: "SK" }, { value: "NS" }, { value: "NB" },
  { value: "NL" }, { value: "PE" }, { value: "NT" }, { value: "NU" }, { value: "YT" },
] as const;

export const PROPERTY_TYPES = [
  { value: "duplex",     fr: "Duplex",              en: "Duplex" },
  { value: "triplex",    fr: "Triplex",             en: "Triplex" },
  { value: "fourplex",   fr: "Quadruplex",          en: "Fourplex" },
  { value: "condo",      fr: "Condo",               en: "Condo" },
  { value: "house",      fr: "Maison unifamiliale", en: "Single Family" },
  { value: "apartment",  fr: "Appartement",         en: "Apartment" },
  { value: "commercial", fr: "Commercial",           en: "Commercial" },
  { value: "other",      fr: "Autre",               en: "Other" },
] as const;

export interface LeaseSignature {
  id: string;
  lease_id: string;
  user_id: string;
  signer_type: "landlord" | "tenant";
  signature_data: string;   // base64 PNG data-URL
  signer_name: string;
  signed_at: string;        // ISO 8601
}
