import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Theme, CompanyTheme } from '../types/theme';
import { spacing, borderRadius, typography, shadows } from '../constants/theme';
import { defaultTheme, getThemeByDomain } from '../constants/companyThemes';

interface ThemeContextType {
  theme: Theme;
  setThemeByDomain: (domain: string) => Promise<void>;
  resetTheme: () => Promise<void>;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
const THEME_STORAGE_KEY = '@gems_theme_domain';

const createTheme = (companyTheme: CompanyTheme): Theme => ({
  colors: {
    primary: companyTheme.colors.primary,
    primaryDark: companyTheme.colors.primaryDark,
    primaryLight: companyTheme.colors.primaryLight,
    secondary: companyTheme.colors.secondary,
    secondaryDark: companyTheme.colors.secondaryDark,
    secondaryLight: companyTheme.colors.secondaryLight,
    background: companyTheme.colors.background || defaultTheme.colors.background!,
    backgroundDark: companyTheme.colors.backgroundDark || defaultTheme.colors.backgroundDark!,
    surface: companyTheme.colors.surface || defaultTheme.colors.surface!,
    surfaceElevated: companyTheme.colors.surfaceElevated || defaultTheme.colors.surfaceElevated!,
    textPrimary: companyTheme.colors.textPrimary || defaultTheme.colors.textPrimary!,
    textSecondary: companyTheme.colors.textSecondary || defaultTheme.colors.textSecondary!,
    textTertiary: companyTheme.colors.textTertiary || defaultTheme.colors.textTertiary!,
    textInverse: companyTheme.colors.textInverse || defaultTheme.colors.textInverse!,
    success: companyTheme.colors.success || defaultTheme.colors.success!,
    warning: companyTheme.colors.warning || defaultTheme.colors.warning!,
    error: companyTheme.colors.error || defaultTheme.colors.error!,
    info: companyTheme.colors.info || defaultTheme.colors.info!,
    border: companyTheme.colors.border || defaultTheme.colors.border!,
    borderLight: companyTheme.colors.borderLight || defaultTheme.colors.borderLight!,
    divider: companyTheme.colors.divider || defaultTheme.colors.divider!,
  },
  spacing,
  borderRadius,
  typography,
  shadows,
  companyName: companyTheme.companyName,
  logo: companyTheme.logo,
  appName: companyTheme.appName || defaultTheme.appName!,
});

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(createTheme(defaultTheme));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then(domain => {
        if (domain) setTheme(createTheme(getThemeByDomain(domain)));
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const setThemeByDomain = async (domain: string) => {
    setTheme(createTheme(getThemeByDomain(domain)));
    await AsyncStorage.setItem(THEME_STORAGE_KEY, domain);
  };

  const resetTheme = async () => {
    setTheme(createTheme(defaultTheme));
    await AsyncStorage.removeItem(THEME_STORAGE_KEY);
  };

  return (
    <ThemeContext.Provider value={{ theme, setThemeByDomain, resetTheme, isLoading }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};
