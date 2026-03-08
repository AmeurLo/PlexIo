// Premium Design System - Emaar One inspired
export const theme = {
  colors: {
    // Primary palette
    primary: '#0066CC',
    primaryLight: '#E6F0FA',
    primaryDark: '#004C99',
    
    // Accent
    accent: '#00A896',
    accentLight: '#E6F7F5',
    
    // Backgrounds
    background: '#F8FAFC',
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    
    // Text
    textPrimary: '#1E293B',
    textSecondary: '#64748B',
    textTertiary: '#94A3B8',
    textInverse: '#FFFFFF',
    
    // Borders
    border: '#E2E8F0',
    borderLight: '#F1F5F9',
    
    // Status colors
    success: '#059669',
    successLight: '#D1FAE5',
    warning: '#D97706',
    warningLight: '#FEF3C7',
    error: '#DC2626',
    errorLight: '#FEE2E2',
    info: '#0284C7',
    infoLight: '#E0F2FE',
    
    // Occupancy
    occupied: '#059669',
    vacant: '#DC2626',
    
    // Overlay
    overlay: 'rgba(0, 0, 0, 0.5)',
  },
  
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
  },
  
  typography: {
    // Headings
    h1: {
      fontSize: 32,
      fontWeight: '700' as const,
      lineHeight: 40,
    },
    h2: {
      fontSize: 24,
      fontWeight: '600' as const,
      lineHeight: 32,
    },
    h3: {
      fontSize: 20,
      fontWeight: '600' as const,
      lineHeight: 28,
    },
    h4: {
      fontSize: 18,
      fontWeight: '600' as const,
      lineHeight: 24,
    },
    
    // Body
    bodyLarge: {
      fontSize: 16,
      fontWeight: '400' as const,
      lineHeight: 24,
    },
    body: {
      fontSize: 14,
      fontWeight: '400' as const,
      lineHeight: 20,
    },
    bodySmall: {
      fontSize: 12,
      fontWeight: '400' as const,
      lineHeight: 16,
    },
    
    // Labels
    label: {
      fontSize: 14,
      fontWeight: '500' as const,
      lineHeight: 20,
    },
    labelSmall: {
      fontSize: 12,
      fontWeight: '500' as const,
      lineHeight: 16,
    },
    
    // Numbers/Stats
    stat: {
      fontSize: 28,
      fontWeight: '700' as const,
      lineHeight: 36,
    },
    statSmall: {
      fontSize: 20,
      fontWeight: '600' as const,
      lineHeight: 28,
    },
  },
  
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 5,
    },
  },
};

export type Theme = typeof theme;
