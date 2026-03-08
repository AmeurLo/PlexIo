// Formatting utilities for Canadian locale
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { enCA, frCA } from 'date-fns/locale';

// Currency formatting for CAD
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatCurrencyFull = (amount: number): string => {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

// Date formatting - Canadian friendly
export const formatDate = (dateString: string): string => {
  try {
    const date = parseISO(dateString);
    return format(date, 'MMM d, yyyy', { locale: enCA });
  } catch {
    return dateString;
  }
};

export const formatDateShort = (dateString: string): string => {
  try {
    const date = parseISO(dateString);
    return format(date, 'MMM d', { locale: enCA });
  } catch {
    return dateString;
  }
};

export const formatDateISO = (dateString: string): string => {
  try {
    const date = parseISO(dateString);
    return format(date, 'yyyy-MM-dd');
  } catch {
    return dateString;
  }
};

export const formatRelativeDate = (dateString: string): string => {
  try {
    const date = parseISO(dateString);
    return formatDistanceToNow(date, { addSuffix: true, locale: enCA });
  } catch {
    return dateString;
  }
};

// Get current month in YYYY-MM format
export const getCurrentMonthYear = (): string => {
  return format(new Date(), 'yyyy-MM');
};

// Get today's date in YYYY-MM-DD format
export const getTodayISO = (): string => {
  return format(new Date(), 'yyyy-MM-dd');
};

// Percentage formatting
export const formatPercentage = (value: number): string => {
  return `${Math.round(value)}%`;
};

// Phone number formatting (Canadian)
export const formatPhone = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
};

// Postal code formatting (Canadian)
export const formatPostalCode = (code: string): string => {
  const cleaned = code.replace(/\s/g, '').toUpperCase();
  if (cleaned.length === 6) {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
  }
  return code;
};

// Property type display names
export const getPropertyTypeLabel = (type: string): string => {
  const types: Record<string, string> = {
    duplex: 'Duplex',
    triplex: 'Triplex',
    fourplex: 'Fourplex',
    fiveplex: 'Fiveplex',
    sixplex: 'Sixplex',
    small_apartment: 'Small Apartment',
    single_family: 'Single Family',
    other: 'Other',
  };
  return types[type] || type;
};

// Rent status labels and colors
export const getRentStatusConfig = (status: string): { label: string; color: string; bgColor: string } => {
  switch (status) {
    case 'paid':
      return { label: 'Paid', color: '#059669', bgColor: '#D1FAE5' };
    case 'late':
      return { label: 'Late', color: '#DC2626', bgColor: '#FEE2E2' };
    case 'pending':
      return { label: 'Pending', color: '#D97706', bgColor: '#FEF3C7' };
    default:
      return { label: 'N/A', color: '#6B7280', bgColor: '#F3F4F6' };
  }
};

// Priority labels and colors
export const getPriorityConfig = (priority: string): { label: string; color: string; bgColor: string } => {
  switch (priority) {
    case 'urgent':
      return { label: 'Urgent', color: '#DC2626', bgColor: '#FEE2E2' };
    case 'high':
      return { label: 'High', color: '#EA580C', bgColor: '#FFEDD5' };
    case 'medium':
      return { label: 'Medium', color: '#D97706', bgColor: '#FEF3C7' };
    case 'low':
      return { label: 'Low', color: '#059669', bgColor: '#D1FAE5' };
    default:
      return { label: priority, color: '#6B7280', bgColor: '#F3F4F6' };
  }
};

// Maintenance status labels
export const getMaintenanceStatusConfig = (status: string): { label: string; color: string; bgColor: string } => {
  switch (status) {
    case 'open':
      return { label: 'Open', color: '#DC2626', bgColor: '#FEE2E2' };
    case 'in_progress':
      return { label: 'In Progress', color: '#D97706', bgColor: '#FEF3C7' };
    case 'completed':
      return { label: 'Completed', color: '#059669', bgColor: '#D1FAE5' };
    case 'cancelled':
      return { label: 'Cancelled', color: '#6B7280', bgColor: '#F3F4F6' };
    default:
      return { label: status, color: '#6B7280', bgColor: '#F3F4F6' };
  }
};
