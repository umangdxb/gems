import { useState } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { api } from '@/lib/api'
import { Step1Upload } from './steps/Step1Upload'
import { Step2Preview } from './steps/Step2Preview'
import { Step3Map } from './steps/Step3Map'
import { Step4Load } from './steps/Step4Load'
import type { MappingConfig, ParsedFile } from '../types'
import { UI_KEY_TO_TARGET } from '../types'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImported: () => void
}

const STEPS = ['Upload', 'Preview', 'Map Fields', 'Load']

const EMPTY_MAPPING: MappingConfig = {
  orderNumber: null,
  material: null,
  batch: null,
  sourceBin: null,
  quantity: null,
}

function toFieldMappings(mapping: MappingConfig) {
  return (Object.entries(mapping) as [keyof MappingConfig, string | null][])
    .filter(([, v]) => v !== null)
    .map(([k, v]) => ({ sourceField: v!, targetField: UI_KEY_TO_TARGET[k] }))
}

export function UploadWizard({ open, onOpenChange, onImported }: Props) {
  const [step, setStep] = useState(0)
  const [parsedFile, setParsedFile] = useState<ParsedFile | null>(null)
  const [mapping, setMapping] = useState<MappingConfig>(EMPTY_MAPPING)
  const [mappingName, setMappingName] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  function reset() {
    setStep(0)
    setParsedFile(null)
    setMapping(EMPTY_MAPPING)
    setMappingName('')
  }

  function handleClose(open: boolean) {
    if (!open) reset()
    onOpenChange(open)
  }

  function canAdvance() {
    if (step === 0) return parsedFile !== null
    if (step === 2) return mapping.orderNumber !== null && mapping.material !== null
    return true
  }

  async function handleLoad() {
    if (!parsedFile) return
    setIsLoading(true)
    try {
      // 1. Import the file
      const formData = new FormData()
      formData.append('file', parsedFile.rawFile)
      formData.append('mapping', JSON.stringify({
        orderNumber: mapping.orderNumber,
        material: mapping.material,
        batch: mapping.batch,
        sourceBin: mapping.sourceBin,
        quantity: mapping.quantity,
      }))

      const res = await api.uploadForm<{ rowCount: number; filename: string }>(
        '/orders/import',
        formData
      )

      // 2. Optionally save the mapping for future use
      if (mappingName.trim()) {
        try {
          await api.post('/orders/mappings', {
            name: mappingName.trim(),
            sourceFormat: 'json',
            arrayRootPath: parsedFile.arrayRootPath,
            fieldMappings: toFieldMappings(mapping),
          })
        } catch {
          // Non-fatal — import succeeded, just notify about the mapping save failure
          toast.warning('Import succeeded but mapping could not be saved.')
        }
      }

      onImported()
      handleClose(false)
      toast.success(`${res.rowCount} rows loaded successfully`, {
        description: res.filename,
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Import failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const isLastStep = step === STEPS.length - 1

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>New Upload</DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center mb-6">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center flex-1 last:flex-none min-w-0">
              <div className="flex items-center gap-1.5 shrink-0">
                <div
                  className={cn(
                    'flex size-6 items-center justify-center rounded-full text-[11px] font-semibold border-2 transition-colors shrink-0',
                    i < step && 'bg-primary border-primary text-primary-foreground',
                    i === step && 'border-primary text-primary',
                    i > step && 'border-muted-foreground/30 text-muted-foreground/50'
                  )}
                >
                  {i + 1}
                </div>
                <span
                  className={cn(
                    'text-xs font-medium hidden sm:block whitespace-nowrap',
                    i === step ? 'text-foreground' : 'text-muted-foreground'
                  )}
                >
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={cn(
                    'flex-1 h-px mx-2 min-w-[12px]',
                    i < step ? 'bg-primary' : 'bg-border'
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="min-h-[260px] min-w-0 w-full overflow-hidden">
          {step === 0 && (
            <Step1Upload parsedFile={parsedFile} onParsed={file => { setParsedFile(file); setStep(1) }} />
          )}
          {step === 1 && parsedFile && (
            <Step2Preview parsedFile={parsedFile} />
          )}
          {step === 2 && parsedFile && (
            <Step3Map parsedFile={parsedFile} mapping={mapping} onChange={setMapping} />
          )}
          {step === 3 && parsedFile && (
            <Step4Load
              parsedFile={parsedFile}
              mapping={mapping}
              mappingName={mappingName}
              onMappingNameChange={setMappingName}
            />
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-2 border-t mt-4">
          <Button
            variant="outline"
            onClick={() => (step === 0 ? handleClose(false) : setStep(s => s - 1))}
            disabled={isLoading}
          >
            {step === 0 ? 'Cancel' : '← Back'}
          </Button>
          {isLastStep ? (
            <Button onClick={handleLoad} disabled={isLoading}>
              {isLoading ? 'Loading…' : 'Load to System'}
            </Button>
          ) : (
            <Button onClick={() => setStep(s => s + 1)} disabled={!canAdvance()}>
              Next →
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
