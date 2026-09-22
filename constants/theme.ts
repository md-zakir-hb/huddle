export const colors = {
  primary: '#091540',
  accent: '#7692FF',
  background: '#FFFFFF',
  surface: '#F5F5F7',
  textPrimary: '#14142B',
  textSecondary: '#6B6B76',
  textMuted: '#9A9AA6',
  border: '#E6E6EC',
  success: '#2FAE60',
  warning: '#F5A623',
  error: '#E5484D',
  white: '#FFFFFF',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
} as const;

export const typography = {
  h1: { fontSize: 24, fontWeight: '700' } as const,
  h2: { fontSize: 18, fontWeight: '700' } as const,
  body: { fontSize: 14, fontWeight: '500' } as const,
  bodyStrong: { fontSize: 14, fontWeight: '700' } as const,
  caption: { fontSize: 12, fontWeight: '500' } as const,
  button: { fontSize: 15, fontWeight: '700' } as const,
} as const;

export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
} as const;

const theme = { colors, spacing, radius, typography, shadow };

export default theme;
