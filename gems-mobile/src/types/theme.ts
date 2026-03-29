export interface ThemeColors {
  primary: string;
  primaryDark: string;
  primaryLight: string;
  secondary: string;
  secondaryDark: string;
  secondaryLight: string;
  background?: string;
  backgroundDark?: string;
  surface?: string;
  surfaceElevated?: string;
  textPrimary?: string;
  textSecondary?: string;
  textTertiary?: string;
  textInverse?: string;
  success?: string;
  warning?: string;
  error?: string;
  info?: string;
  border?: string;
  borderLight?: string;
  divider?: string;
}

export interface CompanyTheme {
  companyName: string;
  domain: string;
  colors: ThemeColors;
  logo?: any;
  appName?: string;
}

export interface Theme {
  colors: Required<ThemeColors>;
  spacing: typeof import('../constants/theme').spacing;
  borderRadius: typeof import('../constants/theme').borderRadius;
  typography: typeof import('../constants/theme').typography;
  shadows: typeof import('../constants/theme').shadows;
  companyName: string;
  logo?: any;
  appName: string;
}
