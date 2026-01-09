/**
 * THIRDPARTY DESIGN SYSTEM
 * "Chaos Arbiter" — Bold & Playful
 *
 * A fun, energetic design system with electric green and hot pink.
 * Bold typography, playful shapes, maximum vibes.
 */

// ============================================================================
// COLOR PALETTE
// ============================================================================

export const colors = {
  // === BACKGROUNDS — Deep Space ===
  bgDeep: '#050508',        // Deepest black - modals
  bgPrimary: '#0A0A0F',     // Primary background - deep navy black
  bgSecondary: '#12121A',   // Elevated surfaces
  bgTertiary: '#1A1A26',    // Cards, inputs
  bgCard: '#1E1E2D',        // Highlighted cards
  bgElevated: '#262638',    // Floating elements

  // Glass effects
  bgGlass: 'rgba(26, 26, 38, 0.8)',
  bgGlassLight: 'rgba(255, 255, 255, 0.05)',
  bgGlassBorder: 'rgba(255, 255, 255, 0.1)',

  // === PRIMARY — Soft Mint Green ===
  primary: '#34D399',        // Main accent - softer mint green
  primaryLight: '#6EE7B7',   // Lighter variant
  primaryDark: '#10B981',    // Darker variant
  primaryMuted: '#34D39940', // 25% opacity
  primaryGlow: '#34D39920',  // Subtle glow

  // === SECONDARY — Hot Pink ===
  secondary: '#FF2E97',      // Secondary accent - hot pink
  secondaryLight: '#FF6BB3',
  secondaryDark: '#CC2579',
  secondaryMuted: '#FF2E9740',

  // === PARTICIPANT COLORS — Bold Duo ===
  personA: '#FF2E97',        // Hot pink - bold, passionate
  personALight: '#FF6BB3',
  personADark: '#CC2579',
  personABg: 'rgba(255, 46, 151, 0.15)',

  personB: '#34D399',        // Soft mint green - fresh, calm
  personBLight: '#6EE7B7',
  personBDark: '#10B981',
  personBBg: 'rgba(52, 211, 153, 0.15)',

  // === TEXT HIERARCHY ===
  textPrimary: '#FFFFFF',    // Pure white
  textSecondary: '#B4B4C7',  // Cool gray
  textMuted: '#6E6E85',      // Muted purple-gray
  textDisabled: '#4A4A5A',   // Disabled state
  textInverse: '#0A0A0F',    // On light backgrounds
  textGreen: '#34D399',      // Accent text
  textPink: '#FF2E97',       // Pink accent text

  // === STATUS COLORS ===
  success: '#34D399',        // Green (same as primary)
  successBg: 'rgba(52, 211, 153, 0.15)',
  error: '#FF4757',          // Coral red
  errorBg: 'rgba(255, 71, 87, 0.15)',
  warning: '#FFD93D',        // Bright yellow
  warningBg: 'rgba(255, 217, 61, 0.15)',
  info: '#6C5CE7',           // Purple
  infoBg: 'rgba(108, 92, 231, 0.15)',

  // === BORDERS & DIVIDERS ===
  border: 'rgba(255, 255, 255, 0.08)',
  borderLight: 'rgba(255, 255, 255, 0.15)',
  borderGreen: 'rgba(52, 211, 153, 0.4)',
  borderPink: 'rgba(255, 46, 151, 0.4)',
  divider: 'rgba(255, 255, 255, 0.06)',

  // === SPECIAL EFFECTS ===
  spotlight: 'rgba(52, 211, 153, 0.1)',
  spotlightPink: 'rgba(255, 46, 151, 0.1)',
  shimmer: 'rgba(255, 255, 255, 0.08)',
  overlay: 'rgba(5, 5, 8, 0.9)',

  // === GRADIENTS (as arrays for LinearGradient) ===
  gradientGreen: ['#34D399', '#10B981'],
  gradientPink: ['#FF2E97', '#CC2579'],
  gradientDuo: ['#FF2E97', '#34D399'],
  gradientBg: ['#0A0A0F', '#12121A', '#0A0A0F'],
};

export const fonts = {
  // Use system fonts with bold weights
  display: 'System',
  displayMedium: 'System',
  displaySemiBold: 'System',
  displayBold: 'System',
  body: 'System',
  bodyMedium: 'System',
  bodySemiBold: 'System',
  bodyBold: 'System',
};

export const typography = {
  // Hero - Massive, bold
  hero: {
    fontSize: 56,
    fontWeight: '900' as const,
    lineHeight: 62,
    letterSpacing: -2,
  },

  // H1 - Screen titles - BOLD
  h1: {
    fontSize: 36,
    fontWeight: '800' as const,
    lineHeight: 42,
    letterSpacing: -1,
  },

  // H2 - Section headers
  h2: {
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 34,
    letterSpacing: -0.5,
  },

  // H3 - Card titles
  h3: {
    fontSize: 22,
    fontWeight: '700' as const,
    lineHeight: 28,
    letterSpacing: -0.3,
  },

  // Body Large
  bodyLarge: {
    fontSize: 18,
    fontWeight: '500' as const,
    lineHeight: 26,
    letterSpacing: 0,
  },

  // Body - Standard
  body: {
    fontSize: 16,
    fontWeight: '500' as const,
    lineHeight: 24,
    letterSpacing: 0.1,
  },

  // Body Medium - Emphasized
  bodyMedium: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 24,
    letterSpacing: 0.1,
  },

  // Body Small
  bodySmall: {
    fontSize: 14,
    fontWeight: '500' as const,
    lineHeight: 20,
    letterSpacing: 0.1,
  },

  // Caption
  caption: {
    fontSize: 13,
    fontWeight: '600' as const,
    lineHeight: 18,
    letterSpacing: 0.3,
  },

  // Small
  small: {
    fontSize: 11,
    fontWeight: '700' as const,
    lineHeight: 16,
    letterSpacing: 0.5,
  },

  // Overline - Category labels (BOLD)
  overline: {
    fontSize: 12,
    fontWeight: '800' as const,
    lineHeight: 16,
    letterSpacing: 2,
    textTransform: 'uppercase' as const,
  },

  // Button text - BOLD
  button: {
    fontSize: 16,
    fontWeight: '700' as const,
    lineHeight: 24,
    letterSpacing: 0.5,
  },

  // Label
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 20,
    letterSpacing: 0.2,
  },
};

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,

  // Semantic
  screenPadding: 20,
  cardPadding: 20,
  sectionGap: 36,
  itemGap: 14,
};

export const borderRadius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 32,
  full: 9999,

  // Semantic
  card: 24,
  button: 16,
  input: 14,
  badge: 10,
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 5,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.35,
    shadowRadius: 28,
    elevation: 12,
  },

  // Green glow
  glow: {
    shadowColor: '#34D399',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },

  // Pink glow
  glowPink: {
    shadowColor: '#FF2E97',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
};

// Animation constants
export const animation = {
  instant: 100,
  fast: 150,
  normal: 250,
  slow: 400,
  dramatic: 600,
  scalePressed: 0.95,
  scaleBounce: 1.05,
};

// Utility function
export function withOpacity(color: string, opacity: number): string {
  if (color.startsWith('#')) {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
  return color;
}

export function getParticipantColors(participant: 'person_a' | 'person_b') {
  return participant === 'person_a'
    ? { main: colors.personA, light: colors.personALight, dark: colors.personADark, bg: colors.personABg }
    : { main: colors.personB, light: colors.personBLight, dark: colors.personBDark, bg: colors.personBBg };
}
