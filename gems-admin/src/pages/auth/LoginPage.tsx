import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { api } from '@/lib/api'
import type { User } from '@/context/AuthContext'

interface LoginResponse {
  token: string
  user: User
  branding: {
    tenantName: string
    primaryColor: string
    secondaryColor: string
    logoUrl: string | null
  }
}

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})
type FormValues = z.infer<typeof schema>

export function LoginPage() {
  const { login } = useAuth()
  const { applyTheme } = useTheme()
  const navigate = useNavigate()
  const [authError, setAuthError] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormValues) {
    setAuthError('')
    try {
      const res = await api.post<LoginResponse>('/auth/login', {
        email: data.email,
        password: data.password,
      })

      login(res.user, res.token)

      applyTheme({
        primaryColor: res.branding.primaryColor,
        secondaryColor: res.branding.secondaryColor,
        logoUrl: res.branding.logoUrl ?? undefined,
        tenantName: res.branding.tenantName,
      })

      navigate('/dashboard', { replace: true })
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Sign in failed. Please try again.')
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">GEMS Admin</CardTitle>
          <CardDescription>Sign in to your account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                {...register('email')}
                onChange={() => setAuthError('')}
              />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                {...register('password')}
                onChange={() => setAuthError('')}
              />
              {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
            </div>
            {authError && <p className="text-sm text-destructive">{authError}</p>}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        New organisation?{' '}
        <Link to="/signup" className="text-primary underline-offset-4 hover:underline">
          Register here
        </Link>
      </p>
      <p className="fixed bottom-4 text-xs text-muted-foreground">Powered by GEMS</p>
    </div>
  )
}
