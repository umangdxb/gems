import { CompanyTheme } from '../types/theme';

export const defaultTheme: CompanyTheme = {
  companyName: 'GEMS',
  domain: 'default',
  colors: {
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
  },
  logo: require('../../assets/icon.png'),
  appName: 'GEMS Warehouse',
};

export const companyThemes: CompanyTheme[] = [
  {
    companyName: 'BAT',
    domain: 'bat',
    colors: {
      primary: '#003087',
      primaryDark: '#002060',
      primaryLight: '#1a4d9f',
      secondary: '#E31937',
      secondaryDark: '#b81329',
      secondaryLight: '#e8425a',
    },
    logo: require('../../assets/icon.png'),
    appName: 'BAT Warehouse',
  },
  {
    companyName: 'Arabian Ethicals',
    domain: 'arabianethicals',
    colors: {
      primary: '#0a5c36',
      primaryDark: '#064028',
      primaryLight: '#0d7345',
      secondary: '#d4af37',
      secondaryDark: '#b8962e',
      secondaryLight: '#ddbf52',
    },
    logo: require('../../assets/icon.png'),
    appName: 'Arabian Ethicals Warehouse',
  },
];

export const getThemeByDomain = (domain: string): CompanyTheme => {
  const theme = companyThemes.find(t => t.domain.toLowerCase() === domain.toLowerCase());
  return theme || defaultTheme;
};

export const extractDomainFromEmail = (email: string): string => {
  const match = email.match(/@([^.]+)/);
  return match ? match[1] : 'default';
};
