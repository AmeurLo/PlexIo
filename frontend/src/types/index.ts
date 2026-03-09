// Type definitions for Small Landlord OS

export interface User {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
}

export interface Property {
  id: string;
  user_id: string;
  name: string;
  address: string;
  city: string;
  province: string;
  postal_code: string;
  property_type: string;
  year_built?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface PropertyWithStats extends Property {
  total_units: number;
  occupied_units: number;
  vacant_units: number;
  rent_collected: number;
  rent_expected: number;
  open_maintenance: number;
  next_lease_expiry?: string;
}

export interface Unit {
  id: string;
  property_id: string;
  unit_number: string;
  bedrooms: number;
  bathrooms: number;
  square_feet?: number;
  rent_amount: number;
  is_occupied: boolean;
  current_tenant_id?: string;
  notes?: string;
  created_at: string;
}

export interface Tenant {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  unit_id?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  notes?: string;
  created_at: string;
}

export interface TenantWithDetails extends Tenant {
  unit_number?: string;
  property_name?: string;
  lease_end_date?: string;
  rent_status: 'paid' | 'late' | 'pending' | 'N/A';
}

export interface Lease {
  id: string;
  user_id: string;
  tenant_id: string;
  unit_id: string;
  start_date: string;
  end_date: string;
  rent_amount: number;
  security_deposit: number;
  payment_due_day: number;
  is_active: boolean;
  notes?: string;
  created_at: string;
}

export interface LeaseWithDetails extends Lease {
  tenant_name?: string;
  unit_number?: string;
  property_name?: string;
  days_until_expiry: number;
}

export interface RentPayment {
  id: string;
  user_id: string;
  lease_id: string;
  tenant_id: string;
  unit_id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  month_year: string;
  status: string;
  notes?: string;
  created_at: string;
}

export interface RentOverview {
  tenant_id: string;
  tenant_name: string;
  unit_number?: string;
  property_name?: string;
  rent_amount: number;
  payment_due_day: number;
  status: 'paid' | 'late' | 'pending';
  payment_date?: string;
  amount_paid: number;
  lease_id: string;
}

export interface MaintenanceRequest {
  id: string;
  user_id: string;
  property_id: string;
  unit_id?: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  reported_by?: string;
  cost?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface MaintenanceRequestWithDetails extends MaintenanceRequest {
  property_name?: string;
  unit_number?: string;
}

export interface Reminder {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  due_date: string;
  reminder_type: string;
  related_id?: string;
  is_completed: boolean;
  created_at: string;
}

export interface DashboardStats {
  total_properties: number;
  total_units: number;
  occupied_units: number;
  vacant_units: number;
  occupancy_rate: number;
  total_rent_expected: number;
  total_rent_collected: number;
  collection_rate: number;
  open_maintenance: number;
  leases_expiring_soon: number;
  overdue_rent_count: number;
  current_month: string;
}

// Insights Types
export interface PropertyPerformance {
  property_id: string;
  property_name: string;
  property_type: string;
  total_units: number;
  occupied_units: number;
  occupancy_rate: number;
  rent_collected: number;
  rent_expected: number;
  collection_rate: number;
  maintenance_expenses: number;
  open_issues: number;
  estimated_profit: number;
}

export interface InsightAlert {
  id: string;
  type: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  related_id?: string;
  action_label?: string;
}

export interface InsightRecommendation {
  id: string;
  type: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  action_label: string;
  related_id?: string;
}

export interface PortfolioInsights {
  total_rent_collected: number;
  total_rent_expected: number;
  collection_rate: number;
  maintenance_expenses: number;
  net_cash_flow: number;
  occupancy_rate: number;
  total_properties: number;
  total_units: number;
  occupied_units: number;
  vacant_units: number;
  current_month: string;
  property_performance: PropertyPerformance[];
  alerts: InsightAlert[];
  recommendations: InsightRecommendation[];
}

// Property Health Score Types
export interface HealthScoreBreakdown {
  rent_collection: number;  // out of 30
  occupancy: number;        // out of 25
  maintenance: number;      // out of 20
  lease_stability: number;  // out of 25
}

export interface PropertyHealthScore {
  property_id: string;
  property_name: string;
  property_type: string;
  score: number;            // 0-100
  status: 'healthy' | 'moderate' | 'at_risk';
  breakdown: HealthScoreBreakdown;
  total_units: number;
  occupied_units: number;
  open_issues: number;
  collection_rate: number;
  days_to_nearest_expiry: number | null;
}

export interface HealthScoreResponse {
  properties: PropertyHealthScore[];
  portfolio_average: number;
  portfolio_status: 'healthy' | 'moderate' | 'at_risk';
}
