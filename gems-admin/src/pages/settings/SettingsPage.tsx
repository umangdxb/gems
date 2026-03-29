import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { BrandPreview } from '@/components/branding/BrandPreview'
import { LogoUpload, ColorField } from '@/pages/auth/steps/Step2Branding'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { api } from '@/lib/api'

interface BrandingResponse {
  tenantId: string
  tenantName: string
  primaryColor: string
  secondaryColor: string
  logoUrl: string | null
}

export function SettingsPage() {
  const { user } = useAuth()
  const { theme, applyTheme } = useTheme()

  // Fetch current branding from API
  const { data: brandingData, isLoading } = useQuery<BrandingResponse>({
    queryKey: ['branding', user?.tenantId],
    queryFn: () => api.get<BrandingResponse>(`/tenants/${user!.tenantId}/branding`),
    enabled: !!user?.tenantId,
    staleTime: Infinity,
  })

  // Sync form with fresh server values on first load
  useEffect(() => {
    if (brandingData) {
      setPrimaryColor(brandingData.primaryColor)
      setSecondaryColor(brandingData.secondaryColor)
      setLogoPreviewUrl(brandingData.logoUrl)
    }
  }, [brandingData])

  // Local form state — initialise from persisted theme so there's no flash
  const [primaryColor, setPrimaryColor] = useState(
    theme.primaryColor.startsWith('#') ? theme.primaryColor : '#2563eb'
  )
  const [secondaryColor, setSecondaryColor] = useState(
    theme.secondaryColor.startsWith('#') ? theme.secondaryColor : '#f1f5f9'
  )
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(theme.logoUrl ?? null)
  const [isSaving, setIsSaving] = useState(false)

  async function handleSave() {
    if (!user?.tenantId) return
    setIsSaving(true)
    try {
      const formData = new FormData()
      formData.append('primaryColor', primaryColor)
      formData.append('secondaryColor', secondaryColor)
      if (logoFile) {
        formData.append('logo', logoFile)
      } else if (!logoPreviewUrl) {
        // User cleared the logo — tell the backend to remove it
        formData.append('removeLogo', 'true')
      }

      const res = await api.uploadForm<BrandingResponse>(
        `/tenants/${user.tenantId}/branding`,
        formData
      )

      applyTheme({
        primaryColor: res.primaryColor,
        secondaryColor: res.secondaryColor,
        logoUrl: res.logoUrl ?? undefined,
        tenantName: theme.tenantName,
      })

      // Update local preview with server-resolved logo URL
      setLogoPreviewUrl(res.logoUrl)
      setLogoFile(null)

      toast.success('Branding updated successfully.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save branding.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your organisation's branding and appearance.
        </p>
      </div>

      <Separator />

      {/* Branding section */}
      <section className="space-y-6">
        <div>
          <h2 className="text-base font-semibold">Branding</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Customise how your portal looks. Changes take effect immediately after saving.
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-8">
            {/* Controls */}
            <div className="space-y-5">
              <LogoUpload
                label="Brand Logo"
                previewUrl={logoPreviewUrl}
                onFile={(file, url) => { setLogoFile(file); setLogoPreviewUrl(url) }}
                onClear={() => { setLogoFile(null); setLogoPreviewUrl(null) }}
              />

              <ColorField
                label="Primary Colour"
                value={primaryColor}
                onChange={setPrimaryColor}
                description="Used for the sidebar active state, buttons, and accents."
              />

              <ColorField
                label="Secondary Colour"
                value={secondaryColor}
                onChange={setSecondaryColor}
                description="Used for backgrounds and subtle highlights."
              />
            </div>

            {/* Live preview */}
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs uppercase tracking-wide">Live Preview</Label>
              <BrandPreview
                orgName={theme.tenantName}
                primaryColor={primaryColor}
                logoPreviewUrl={logoPreviewUrl}
              />
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2 border-t">
          <Button onClick={handleSave} disabled={isSaving || isLoading}>
            {isSaving ? 'Saving…' : 'Save Branding'}
          </Button>
        </div>
      </section>
    </div>
  )
}
