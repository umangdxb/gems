import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from '@/components/ui/sonner'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import { ThemeProvider } from '@/context/ThemeContext'
import { queryClient } from '@/lib/queryClient'
import { AppShell } from '@/components/layout/AppShell'
import { LoginPage } from '@/pages/auth/LoginPage'
import { SignupPage } from '@/pages/auth/SignupPage'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { IntegrationPage } from '@/pages/integration/IntegrationPage'
import { OrdersPage } from '@/pages/orders/OrdersPage'
import { UsersPage } from '@/pages/users/UsersPage'
import { SettingsPage } from '@/pages/settings/SettingsPage'

function ProtectedRoutes() {
  const { isAuthenticated, user } = useAuth()
  const isAdmin = user?.role === 'admin'
  if (!isAuthenticated) return <Navigate to="/login" replace />

  return (
    <AppShell>
      <Routes>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route
          path="/users"
          element={isAdmin ? <UsersPage /> : <Navigate to="/dashboard" replace />}
        />
        <Route path="/integration" element={<IntegrationPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AppShell>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/*" element={<ProtectedRoutes />} />
            </Routes>
          </BrowserRouter>
          <Toaster />
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
