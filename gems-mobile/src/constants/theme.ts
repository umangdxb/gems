export const colors = {
  primary: '#1a2942',
  primaryDark: '#0f1b2e',
  primaryLight: '#2a3f5f',
  secondary: '#ffc857',
  secondaryDark: '#f4a900',
  secondaryLight: '#ffd978',
  background: '#ffffff',
  backgroundDark: '#f8f9fa',
  surface: '#ffffff',
  surfaceElevated: '#ffffff',
  textPrimary: '#1a1a1a',
  textSecondary: '#6b7280',
  textTertiary: '#9ca3af',
  textInverse: '#ffffff',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  border: '#e5e7eb',
  borderLight: '#f3f4f6',
  divider: '#e5e7eb',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const borderRadius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

export const typography = {
  h1: { fontSize: 32, fontWeight: 'bold' as const, lineHeight: 40 },
  h2: { fontSize: 24, fontWeight: 'bold' as const, lineHeight: 32 },
  h3: { fontSize: 20, fontWeight: '600' as const, lineHeight: 28 },
  body: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
  bodySmall: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
  caption: { fontSize: 12, fontWeight: '400' as const, lineHeight: 16 },
};

export const shadows = {
  none: {},
  subtle: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
};
