import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { Step1OrgDetails, type OrgDetailsValues } from './steps/Step1OrgDetails'
import { Step2Branding, type BrandingValues } from './steps/Step2Branding'
import type { User } from '@/context/AuthContext'

const STEPS = ['Organisation', 'Branding']

const DEFAULT_BRANDING: BrandingValues = {
  primaryColor: '#2563eb',
  secondaryColor: '#f1f5f9',
  logoFile: null,
  logoPreviewUrl: null,
}

interface RegisterResponse {
  tenantId: string
  userId: string
  token: string
  user: User
}

interface BrandingResponse {
  tenantId: string
  primaryColor: string
  secondaryColor: string
  logoUrl: string | null
}

export function SignupPage() {
  const { login } = useAuth()
  const { applyTheme } = useTheme()
  const navigate = useNavigate()

  const [step, setStep] = useState(0)
  const [orgDetails, setOrgDetails] = useState<OrgDetailsValues | null>(null)
  const [branding, setBranding] = useState<BrandingValues>(DEFAULT_BRANDING)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function handleOrgNext(values: OrgDetailsValues) {
    setOrgDetails(values)
    setStep(1)
  }

  async function handleComplete() {
    if (!orgDetails) return
    setIsSubmitting(true)

    try {
      // Step 1: Register tenant + admin user
      const reg = await api.post<RegisterResponse>('/auth/register', {
        orgName: orgDetails.orgName,
        adminEmail: orgDetails.adminEmail,
        password: orgDetails.password,
      })

      // Step 2: Upload branding (multipart) using the token from registration
      const formData = new FormData()
      formData.append('primaryColor', branding.primaryColor)
      formData.append('secondaryColor', branding.secondaryColor)
      if (branding.logoFile) {
        formData.append('logo', branding.logoFile)
      }

      let logoUrl: string | null = null
      try {
        const brandingRes = await api.uploadForm<BrandingResponse>(
          `/tenants/${reg.tenantId}/branding`,
          formData,
          reg.token // pass token explicitly — not yet in localStorage
        )
        logoUrl = brandingRes.logoUrl
      } catch {
        // Non-fatal: branding upload failed, defaults will be used
        toast.warning('Branding could not be saved — you can update it later in Settings.')
      }

      // Authenticate and apply theme
      login(reg.user, reg.token)
      applyTheme({
        primaryColor: branding.primaryColor,
        secondaryColor: branding.secondaryColor,
        logoUrl: logoUrl ?? undefined,
        tenantName: orgDetails.orgName,
      })

      toast.success(`Welcome, ${orgDetails.orgName}!`, {
        description: 'Your account has been created.',
      })
      navigate('/dashboard', { replace: true })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Registration failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 py-12 px-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">Get started with GEMS</h1>
          <p className="text-muted-foreground mt-2">
            Register your organisation and set up your branding.
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-0 mb-8">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'flex size-8 items-center justify-center rounded-full text-sm font-semibold border-2 transition-colors',
                    i < step && 'bg-primary border-primary text-primary-foreground',
                    i === step && 'border-primary text-primary',
                    i > step && 'border-muted-foreground/30 text-muted-foreground/40'
                  )}
                >
                  {i + 1}
                </div>
                <span className={cn('text-sm font-medium', i === step ? 'text-foreground' : 'text-muted-foreground')}>
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={cn('w-16 h-px mx-4', i < step ? 'bg-primary' : 'bg-border')} />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="rounded-xl border bg-card shadow-sm p-8">
          {step === 0 && (
            <Step1OrgDetails
              defaultValues={orgDetails ?? undefined}
              onNext={handleOrgNext}
            />
          )}
          {step === 1 && orgDetails && (
            <Step2Branding
              orgName={orgDetails.orgName}
              values={branding}
              onChange={setBranding}
              onBack={() => setStep(0)}
              onSubmit={handleComplete}
              isSubmitting={isSubmitting}
            />
          )}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-primary underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
        <p className="text-center text-xs text-muted-foreground mt-8">Powered by GEMS</p>
      </div>
    </div>
  )
}
