import { useRef, useState } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { BrandPreview } from '@/components/branding/BrandPreview'

export interface BrandingValues {
  primaryColor: string
  secondaryColor: string
  logoFile: File | null
  logoPreviewUrl: string | null
}

interface Props {
  orgName: string
  values: BrandingValues
  onChange: (values: BrandingValues) => void
  onBack: () => void
  onSubmit: () => void
  isSubmitting: boolean
}

export function LogoUpload({
  previewUrl,
  label,
  onFile,
  onClear,
}: {
  previewUrl: string | null
  label: string
  onFile: (file: File, url: string) => void
  onClear: () => void
}) {
  const ref = useRef<HTMLInputElement>(null)

  function handle(file: File) {
    const url = URL.createObjectURL(file)
    onFile(file, url)
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {previewUrl ? (
        <div className="relative inline-flex items-center justify-center rounded-md border bg-muted/30 p-3 w-full h-20">
          <img src={previewUrl} alt="logo" className="max-h-12 max-w-full object-contain" />
          <button
            type="button"
            onClick={onClear}
            className="absolute top-1.5 right-1.5 rounded-full bg-background border p-0.5 hover:bg-muted"
          >
            <X className="size-3" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className="flex w-full flex-col items-center justify-center gap-1.5 rounded-md border-2 border-dashed h-20 text-muted-foreground hover:border-primary/50 hover:bg-muted/30 transition-colors"
        >
          <ImagePlus className="size-5" />
          <span className="text-xs">Click to upload</span>
        </button>
      )}
      <input
        ref={ref}
        type="file"
        accept="image/png,image/jpeg,image/svg+xml,image/webp"
        className="hidden"
        onChange={e => { if (e.target.files?.[0]) handle(e.target.files[0]) }}
      />
    </div>
  )
}

export function ColorField({
  label,
  value,
  onChange,
  description,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  description?: string
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <div className="relative size-9 shrink-0 rounded-md border overflow-hidden cursor-pointer">
          <input
            type="color"
            value={value}
            onChange={e => onChange(e.target.value)}
            className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
          />
          <div className="size-full rounded-md" style={{ backgroundColor: value }} />
        </div>
        <Input
          value={value}
          onChange={e => onChange(e.target.value)}
          className="font-mono text-sm uppercase"
          maxLength={7}
        />
      </div>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
  )
}

export function Step2Branding({ orgName, values, onChange, onBack, onSubmit, isSubmitting }: Props) {
  const [dragOver, setDragOver] = useState(false)

  function update(patch: Partial<BrandingValues>) {
    onChange({ ...values, ...patch })
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-8">
        {/* Left: controls */}
        <div className="space-y-5">
          <LogoUpload
            label="Brand Logo"
            previewUrl={values.logoPreviewUrl}
            onFile={(file, url) => update({ logoFile: file, logoPreviewUrl: url })}
            onClear={() => update({ logoFile: null, logoPreviewUrl: null })}
          />

          <div
            className={cn(
              'rounded-md border-2 border-dashed p-3 text-xs text-muted-foreground text-center transition-colors',
              dragOver && 'border-primary/50 bg-primary/5'
            )}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => {
              e.preventDefault()
              setDragOver(false)
              const file = e.dataTransfer.files[0]
              if (file) {
                const url = URL.createObjectURL(file)
                update({ logoFile: file, logoPreviewUrl: url })
              }
            }}
          >
            Or drag & drop your logo here
          </div>

          <ColorField
            label="Primary Colour"
            value={values.primaryColor}
            onChange={v => update({ primaryColor: v })}
            description="Used for the sidebar, buttons, and active states."
          />

          <ColorField
            label="Secondary / Accent Colour"
            value={values.secondaryColor}
            onChange={v => update({ secondaryColor: v })}
            description="Used for highlights and badges."
          />
        </div>

        {/* Right: live preview */}
        <div className="space-y-2">
          <Label className="text-muted-foreground text-xs uppercase tracking-wide">Live Preview</Label>
          <BrandPreview
            orgName={orgName}
            primaryColor={values.primaryColor}
            logoPreviewUrl={values.logoPreviewUrl}
          />
          <p className="text-xs text-muted-foreground">
            You can update your branding anytime from Settings.
          </p>
        </div>
      </div>

      <div className="flex justify-between pt-2 border-t">
        <Button type="button" variant="outline" onClick={onBack}>← Back</Button>
        <Button onClick={onSubmit} disabled={isSubmitting}>
          {isSubmitting ? 'Creating account…' : 'Complete Setup'}
        </Button>
      </div>
    </div>
  )
}
