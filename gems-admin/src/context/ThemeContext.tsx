import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

export interface TenantTheme {
  primaryColor: string
  secondaryColor: string
  logoUrl?: string
  tenantName: string
}

interface ThemeContextValue {
  theme: TenantTheme
  applyTheme: (theme: TenantTheme) => void
  resetTheme: () => void
}

const STORAGE_KEY = 'gems_theme'

const DEFAULT_THEME: TenantTheme = {
  primaryColor: 'oklch(0.205 0 0)',
  secondaryColor: 'oklch(0.97 0 0)',
  tenantName: 'GEMS',
}

function applyCSSVars(theme: TenantTheme) {
  const root = document.documentElement
  root.style.setProperty('--primary', theme.primaryColor)
  root.style.setProperty('--secondary', theme.secondaryColor)
}

function clearCSSVars() {
  const root = document.documentElement
  root.style.removeProperty('--primary')
  root.style.removeProperty('--secondary')
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<TenantTheme>(() => {
    // Restore persisted theme synchronously to avoid flash
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) return JSON.parse(saved) as TenantTheme
    } catch {
      // ignore malformed JSON
    }
    return DEFAULT_THEME
  })

  // Apply CSS variables whenever theme changes (including on first render)
  useEffect(() => {
    if (theme === DEFAULT_THEME) {
      clearCSSVars()
    } else {
      applyCSSVars(theme)
    }
  }, [theme])

  function applyTheme(incoming: TenantTheme) {
    setTheme(incoming)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(incoming))
  }

  function resetTheme() {
    setTheme(DEFAULT_THEME)
    localStorage.removeItem(STORAGE_KEY)
    clearCSSVars()
  }

  return (
    <ThemeContext.Provider value={{ theme, applyTheme, resetTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider')
  return ctx
}
