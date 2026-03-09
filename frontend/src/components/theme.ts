// Plexio Design System - Premium Real Estate Inspired
// Inspired by Emaar One: calm, elegant, card-based, luxury feel

export const theme = {
  colors: {
    // Primary - Ocean Blue (trust, professional, premium)
    primary: '#1A8FC4',
    primaryLight: '#E8F4FA',
    primaryDark: '#0D6E9E',

    // Accent - Emerald Green (fresh, modern actions)
    accent: '#00C48C',
    accentLight: '#E6F9F4',

    // Gold - Luxury touch
    gold: '#C9A96E',
    goldLight: '#FDF6E9',

    // Backgrounds - Clean, airy
    background: '#F5F7FA',
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    surfaceWarm: '#FBF8F3',

    // Text - Deep navy hierarchy
    textPrimary: '#1B2838',
    textSecondary: '#6B7D93',
    textTertiary: '#A0AEC0',
    textInverse: '#FFFFFF',

    // Borders - Subtle, refined
    border: '#E2E8F0',
    borderLight: '#F0F3F7',

    // Status colors
    success: '#00C48C',
    successLight: '#E6F9F4',
    warning: '#F5A623',
    warningLight: '#FFF6E6',
    error: '#E85D5D',
    errorLight: '#FDE8E8',
    info: '#1A8FC4',
    infoLight: '#E8F4FA',

    // Occupancy
    occupied: '#00C48C',
    vacant: '#E85D5D',

    // Overlay
    overlay: 'rgba(27, 40, 56, 0.5)',
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
    sm: 10,
    md: 14,
    lg: 18,
    xl: 24,
    full: 9999,
  },

  typography: {
    h1: {
      fontSize: 32,
      fontWeight: '700' as const,
      lineHeight: 40,
      letterSpacing: -0.5,
    },
    h2: {
      fontSize: 24,
      fontWeight: '700' as const,
      lineHeight: 32,
      letterSpacing: -0.3,
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
    stat: {
      fontSize: 28,
      fontWeight: '700' as const,
      lineHeight: 36,
      letterSpacing: -0.5,
    },
    statSmall: {
      fontSize: 20,
      fontWeight: '600' as const,
      lineHeight: 28,
    },
  },

  shadows: {
    sm: {
      shadowColor: '#1B2838',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 2,
    },
    md: {
      shadowColor: '#1B2838',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
      elevation: 4,
    },
    lg: {
      shadowColor: '#1B2838',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 24,
      elevation: 6,
    },
  },
};

export type Theme = typeof theme;
