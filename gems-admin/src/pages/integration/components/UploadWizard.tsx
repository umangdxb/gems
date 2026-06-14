import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
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
import { useAuth } from '@/context/AuthContext'
import { Step1Upload } from './steps/Step1Upload'
import { Step2Preview } from './steps/Step2Preview'
import { Step3Map } from './steps/Step3Map'
import { Step4Resolve, type ProcessTypeGroup } from './steps/Step4Resolve'
import { Step5Load } from './steps/Step5Load'
import type { MappingConfig, MappingFieldKey, ParsedFile, ProcessTypeResolution } from '../types'
import { UI_KEY_TO_TARGET } from '../types'

interface MasterConfig {
  operationalKeys: Array<{
    fieldName: string
    valueMappings: Array<{ sourceValue: string; action: string }>
  }>
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImported: () => void
}

// Steps shown in the indicator — 'Resolve' is conditionally inserted at runtime
const BASE_STEPS = ['Upload', 'Preview', 'Map Fields', 'Load']
const STEPS_WITH_RESOLVE = ['Upload', 'Preview', 'Map Fields', 'Resolve', 'Load']

const EMPTY_MAPPING: MappingConfig = {
  orderNumber: null,
  material: null,
  batch: null,
  sourceBin: null,
  quantity: null,
  destinationBin: null,
  warehouse: null,
  deliveryRef: null,
  processType: null,
  confirmedAt: null,
  defaultValues: {},
}

function toFieldMappings(mapping: MappingConfig) {
  const { defaultValues: _, ...fieldEntries } = mapping
  return (Object.entries(fieldEntries) as [MappingFieldKey, string | null][])
    .filter(([, v]) => v !== null)
    .map(([k, v]) => ({ sourceField: v!, targetField: UI_KEY_TO_TARGET[k] }))
}

export function UploadWizard({ open, onOpenChange, onImported }: Props) {
  const [step, setStep] = useState(0)
  const [parsedFile, setParsedFile] = useState<ParsedFile | null>(null)
  const [mapping, setMapping] = useState<MappingConfig>(EMPTY_MAPPING)
  const [mappingName, setMappingName] = useState('')
  const [resolution, setResolution] = useState<ProcessTypeResolution>({})
  const [isLoading, setIsLoading] = useState(false)
  const { user } = useAuth()

  // Fetch master config to identify already-mapped process type values
  const { data: masterConfig } = useQuery<MasterConfig>({
    queryKey: ['master-config', user?.tenantId],
    queryFn: () => api.get<MasterConfig>(`/tenants/${user!.tenantId}/master-config`),
    enabled: !!user?.tenantId,
    staleTime: 60_000,
  })

  // Build process type groups from parsed file — keyed by the mapped source column
  const processTypeGroups = useMemo<ProcessTypeGroup[]>(() => {
    if (!parsedFile || !mapping.processType) return []

    const sourceCol = mapping.processType
    const masterKeyConfig = masterConfig?.operationalKeys.find(k => k.fieldName === 'processType')
    const masterMappings = new Map(masterKeyConfig?.valueMappings.map(m => [m.sourceValue, m.action]) ?? [])

    // Count deliveries per unique process type value
    // Group by the delivery reference column if mapped, otherwise count rows
    const deliveryRefCol = mapping.deliveryRef
    const deliveryCounts = new Map<string, Set<string>>()

    for (const row of parsedFile.rows) {
      const ptValue = String(row[sourceCol] ?? '').trim()
      const deliveryId = deliveryRefCol ? String(row[deliveryRefCol] ?? '').trim() : `__row_${Math.random()}`
      if (!deliveryCounts.has(ptValue)) deliveryCounts.set(ptValue, new Set())
      deliveryCounts.get(ptValue)!.add(deliveryId)
    }

    return Array.from(deliveryCounts.entries()).map(([ptValue, deliveries]) => ({
      processTypeValue: ptValue,
      deliveryCount: deliveries.size,
      resolvedAction: masterMappings.get(ptValue) as ProcessTypeGroup['resolvedAction'],
    }))
  }, [parsedFile, mapping.processType, mapping.deliveryRef, masterConfig])

  // The resolve step is needed when processType is mapped AND any group lacks a master config resolution
  const needsResolveStep = processTypeGroups.some(g => !g.resolvedAction)
  const STEPS = needsResolveStep ? STEPS_WITH_RESOLVE : BASE_STEPS

  // Map logical step indices accounting for the optional Resolve step
  // step 0=Upload, 1=Preview, 2=Map, 3=Resolve(optional), 4=Load
  // When no resolve step: 0=Upload, 1=Preview, 2=Map, 3=Load
  const STEP_UPLOAD = 0
  const STEP_PREVIEW = 1
  const STEP_MAP = 2
  const STEP_RESOLVE = needsResolveStep ? 3 : -1
  const STEP_LOAD = needsResolveStep ? 4 : 3

  function reset() {
    setStep(0)
    setParsedFile(null)
    setMapping(EMPTY_MAPPING)
    setMappingName('')
    setResolution({})
  }

  function handleClose(open: boolean) {
    if (!open) reset()
    onOpenChange(open)
  }

  // All unmapped process types must have an explicit resolution to advance from resolve step
  const resolveStepComplete = processTypeGroups
    .filter(g => !g.resolvedAction)
    .every(g => !!resolution[g.processTypeValue])

  function canAdvance() {
    if (step === STEP_UPLOAD) return parsedFile !== null
    if (step === STEP_MAP) return mapping.orderNumber !== null && mapping.material !== null
    if (step === STEP_RESOLVE) return resolveStepComplete
    return true
  }

  async function handleLoad() {
    if (!parsedFile) return
    setIsLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', parsedFile.rawFile)
      const { defaultValues, ...fieldMappingKeys } = mapping
      formData.append('mapping', JSON.stringify({ ...fieldMappingKeys, defaultValues }))

      // Send user's explicit process type decisions alongside the file
      const allResolutions: ProcessTypeResolution = {}
      for (const g of processTypeGroups) {
        if (g.resolvedAction) {
          allResolutions[g.processTypeValue] = g.resolvedAction
        } else if (resolution[g.processTypeValue]) {
          allResolutions[g.processTypeValue] = resolution[g.processTypeValue]
        }
      }
      if (Object.keys(allResolutions).length > 0) {
        formData.append('processTypeOverrides', JSON.stringify(allResolutions))
      }

      const res = await api.uploadForm<{ rowCount: number; filename: string; warnings?: string[] }>(
        '/orders/import',
        formData
      )

      // Optionally save the mapping for future use
      if (mappingName.trim()) {
        try {
          await api.post('/orders/mappings', {
            name: mappingName.trim(),
            sourceFormat: 'json',
            arrayRootPath: parsedFile.arrayRootPath,
            fieldMappings: toFieldMappings(mapping),
            ...(Object.keys(mapping.defaultValues).length > 0 ? { defaultValues: mapping.defaultValues } : {}),
          })
        } catch {
          toast.warning('Import succeeded but mapping could not be saved.')
        }
      }

      onImported()
      handleClose(false)
      toast.success(`${res.rowCount} rows loaded successfully`, { description: res.filename })
      if (res.warnings?.length) {
        res.warnings.forEach(w => toast.warning(w))
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Import failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const isLastStep = step === STEPS.length - 1

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl flex flex-col max-h-[90vh]">
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
                <div className={cn('flex-1 h-px mx-2 min-w-[12px]', i < step ? 'bg-primary' : 'bg-border')} />
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto min-w-0 w-full pr-1">
          {step === STEP_UPLOAD && (
            <Step1Upload parsedFile={parsedFile} onParsed={file => { setParsedFile(file); setStep(1) }} />
          )}
          {step === STEP_PREVIEW && parsedFile && (
            <Step2Preview parsedFile={parsedFile} />
          )}
          {step === STEP_MAP && parsedFile && (
            <Step3Map parsedFile={parsedFile} mapping={mapping} onChange={setMapping} />
          )}
          {step === STEP_RESOLVE && parsedFile && (
            <Step4Resolve
              groups={processTypeGroups}
              resolution={resolution}
              onChange={setResolution}
            />
          )}
          {step === STEP_LOAD && parsedFile && (
            <Step5Load
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
