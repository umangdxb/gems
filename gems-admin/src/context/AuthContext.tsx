import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { api } from '@/lib/api'

export interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'operator'
  tenantId: string
}

interface AuthContextValue {
  user: User | null
  token: string | null
  login: (user: User, token: string) => void
  logout: () => void
  isAuthenticated: boolean
}

const TOKEN_KEY = 'gems_token'
const USER_KEY = 'gems_user'

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem(TOKEN_KEY)
  )
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem(USER_KEY)
    if (saved) {
      try { return JSON.parse(saved) as User } catch { return null }
    }
    return null
  })

  // Restore user from server when token exists but user isn't in localStorage
  // (e.g. sessions created before the user-persistence fix)
  useEffect(() => {
    if (token && !user) {
      api.get<User>('/auth/me')
        .then(u => {
          setUser(u)
          localStorage.setItem(USER_KEY, JSON.stringify(u))
        })
        .catch(() => {
          // Token is invalid or expired — clear everything
          setToken(null)
          localStorage.removeItem(TOKEN_KEY)
        })
    }
  }, [token, user])

  function login(u: User, t: string) {
    setUser(u)
    setToken(t)
    localStorage.setItem(TOKEN_KEY, t)
    localStorage.setItem(USER_KEY, JSON.stringify(u))
  }

  function logout() {
    setUser(null)
    setToken(null)
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
