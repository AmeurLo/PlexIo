// Formatting utilities for Canadian locale
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { enCA, frCA } from 'date-fns/locale';
import { getT } from '../i18n/useTranslation';

// Current date-fns locale based on app language
const getDateLocale = () =>
  getT()('language') === 'Langue' ? frCA : enCA; // FR when in French

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

// Date formatting - locale-aware
export const formatDate = (dateString: string): string => {
  try {
    const date = parseISO(dateString);
    return format(date, 'MMM d, yyyy', { locale: getDateLocale() });
  } catch {
    return dateString;
  }
};

export const formatDateShort = (dateString: string): string => {
  try {
    const date = parseISO(dateString);
    return format(date, 'MMM d', { locale: getDateLocale() });
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
    return formatDistanceToNow(date, { addSuffix: true, locale: getDateLocale() });
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

// Property type display names — locale-aware
export const getPropertyTypeLabel = (type: string): string => {
  const t = getT();
  const types: Record<string, string> = {
    duplex: t('typeDuplex'),
    triplex: t('typeTriplex'),
    fourplex: t('typeFourplex'),
    fiveplex: t('typeFiveplex'),
    sixplex: t('typeSixplex'),
    small_apartment: t('typeSmallApartment'),
    single_family: t('typeSingleFamily'),
    condo: 'Condo',
    other: t('typeOther'),
  };
  return types[type] || type;
};

// Rent status labels — locale-aware
export const getRentStatusConfig = (status: string): { label: string; color: string; bgColor: string } => {
  const t = getT();
  switch (status) {
    case 'paid':
      return { label: t('statusPaid'), color: '#00C48C', bgColor: '#E6F9F4' };
    case 'late':
      return { label: t('statusLate'), color: '#E85D5D', bgColor: '#FDE8E8' };
    case 'pending':
      return { label: t('statusPending'), color: '#F5A623', bgColor: '#FFF6E6' };
    default:
      return { label: t('statusNA'), color: '#6B7D93', bgColor: '#F0F3F7' };
  }
};

// Priority labels — locale-aware
export const getPriorityConfig = (priority: string): { label: string; color: string; bgColor: string } => {
  const t = getT();
  switch (priority) {
    case 'urgent':
      return { label: t('priorityUrgent'), color: '#E85D5D', bgColor: '#FDE8E8' };
    case 'high':
      return { label: t('priorityHigh'), color: '#E87D3E', bgColor: '#FFF0E6' };
    case 'medium':
      return { label: t('priorityMedium'), color: '#F5A623', bgColor: '#FFF6E6' };
    case 'low':
      return { label: t('priorityLow'), color: '#00C48C', bgColor: '#E6F9F4' };
    default:
      return { label: priority, color: '#6B7D93', bgColor: '#F0F3F7' };
  }
};

// Maintenance status labels — locale-aware
export const getMaintenanceStatusConfig = (status: string): { label: string; color: string; bgColor: string } => {
  const t = getT();
  switch (status) {
    case 'open':
      return { label: t('maintOpen'), color: '#E85D5D', bgColor: '#FDE8E8' };
    case 'in_progress':
      return { label: t('maintInProgress'), color: '#F5A623', bgColor: '#FFF6E6' };
    case 'completed':
      return { label: t('maintCompleted'), color: '#00C48C', bgColor: '#E6F9F4' };
    case 'cancelled':
      return { label: t('maintCancelled'), color: '#6B7D93', bgColor: '#F0F3F7' };
    default:
      return { label: status, color: '#6B7D93', bgColor: '#F0F3F7' };
  }
};
