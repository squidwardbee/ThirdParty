/**
 * Settler Design System
 * Colors, typography, and spacing tokens
 */

export const colors = {
  // Primary - Deep purple/indigo for authority
  primary: '#5B4CDB',
  primaryLight: '#7B6EE8',
  primaryDark: '#4338B8',

  // Secondary - Warm gold for verdicts/highlights
  secondary: '#F5A623',
  secondaryLight: '#FFB84D',
  secondaryDark: '#D4880F',

  // Backgrounds
  bgPrimary: '#0A0A0F',
  bgSecondary: '#12121A',
  bgTertiary: '#1A1A24',
  bgCard: '#1E1E2A',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0B0',
  textMuted: '#606070',
  textInverse: '#0A0A0F',

  // Status
  success: '#34C759',
  error: '#FF3B30',
  warning: '#FF9500',
  info: '#5AC8FA',

  // Participant colors
  personA: '#FF6B6B',  // Coral red
  personB: '#4ECDC4',  // Teal

  // Borders
  border: '#2A2A3A',
  borderLight: '#3A3A4A',
};

export const fonts = {
  // System fonts - will use default React Native fonts
  regular: 'System',
  medium: 'System',
  semiBold: 'System',
  bold: 'System',
};

export const typography = {
  hero: {
    fontSize: 40,
    fontWeight: '700' as const,
    lineHeight: 48,
  },
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
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  bodyMedium: {
    fontSize: 16,
    fontWeight: '500' as const,
    lineHeight: 24,
  },
  caption: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  small: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
};
