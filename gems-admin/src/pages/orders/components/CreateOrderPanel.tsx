import { useRef, useState } from 'react'
import { Upload, FileJson, CheckCircle2, Loader2, X, AlertTriangle, SlidersHorizontal } from 'lucide-react'
import { toast } from 'sonner'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { api } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import type { ImportResult } from '../types'
import type { OrderType, ProcessTypeResolution } from '@/pages/integration/types'

interface Props {
  onImported: () => void
}

interface ParsedPreview {
  file: File
  deliveryNumbers: string[]
  processTypes: string[]
  totalRecords: number
}

interface MasterConfig {
  operationalKeys: Array<{
    fieldName: string
    valueMappings: Array<{ sourceValue: string; action: string }>
  }>
}

const ORDER_TYPE_OPTIONS: { value: OrderType; label: string }[] = [
  { value: 'picking', label: 'Picking' },
  { value: 'packing', label: 'Packing' },
  { value: 'commissioning', label: 'Commissioning' },
  { value: 'decommissioning', label: 'Decommissioning' },
  { value: 'shipping', label: 'Shipping' },
  { value: 'receiving', label: 'Receiving' },
]

export function CreateOrderPanel({ onImported }: Props) {
  const [preview, setPreview] = useState<ParsedPreview | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showResolutionModal, setShowResolutionModal] = useState(false)
  const [resolution, setResolution] = useState<ProcessTypeResolution>({})
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { user } = useAuth()
  const navigate = useNavigate()

  const { data: masterConfig } = useQuery<MasterConfig>({
    queryKey: ['master-config', user?.tenantId],
    queryFn: () => api.get<MasterConfig>(`/tenants/${user!.tenantId}/master-config`),
    enabled: !!user?.tenantId,
    staleTime: 60_000,
  })

  // Process types from the file that have no master config mapping
  function getUnmappedTypes(processTypes: string[]): string[] {
    const ptKey = masterConfig?.operationalKeys.find(k => k.fieldName === 'processType')
    const mapped = new Set(ptKey?.valueMappings.map(m => m.sourceValue) ?? [])
    return processTypes.filter(pt => !mapped.has(pt))
  }

  function parseFile(file: File) {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string
        const parsed = JSON.parse(text)
        const records: Record<string, unknown>[] = Array.isArray(parsed)
          ? parsed
          : parsed?.value ?? []

        const deliverySet = new Set<string>()
        const processTypeSet = new Set<string>()
        for (const r of records) {
          const dn = String(r['EWMDelivery'] ?? '').trim()
          if (dn) deliverySet.add(dn)
          const pt = String(r['WarehouseProcessType'] ?? '').trim()
          if (pt) processTypeSet.add(pt)
        }

        setPreview({
          file,
          deliveryNumbers: Array.from(deliverySet),
          processTypes: Array.from(processTypeSet),
          totalRecords: records.length,
        })
        setResolution({})
      } catch {
        toast.error('Could not parse JSON file. Please check the format.')
      }
    }
    reader.readAsText(file)
  }

  function handleFiles(files: FileList | null) {
    if (!files?.length) return
    const file = files[0]
    if (!file.name.endsWith('.json')) {
      toast.error('Only JSON files are accepted.')
      return
    }
    parseFile(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  function handleImportClick() {
    if (!preview) return
    const unmapped = getUnmappedTypes(preview.processTypes)
    if (unmapped.length > 0) {
      setShowResolutionModal(true)
    } else {
      runImport({})
    }
  }

  async function runImport(overrides: ProcessTypeResolution) {
    if (!preview) return
    setIsLoading(true)
    setShowResolutionModal(false)
    try {
      const formData = new FormData()
      formData.append('file', preview.file)
      if (Object.keys(overrides).length > 0) {
        formData.append('processTypeOverrides', JSON.stringify(overrides))
      }

      const result = await api.uploadForm<ImportResult & { warnings?: string[] }>('/delivery-orders/import', formData)

      if (result.warnings?.length) {
        toast.warning(`${result.ordersCreated} order${result.ordersCreated !== 1 ? 's' : ''} imported`, {
          description: result.warnings[0],
        })
      } else {
        toast.success(`${result.ordersCreated} order${result.ordersCreated !== 1 ? 's' : ''} imported successfully`)
      }

      setPreview(null)
      setResolution({})
      onImported()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setIsLoading(false)
    }
  }

  function handleResolutionProceed() {
    // Merge master config resolutions + user resolutions
    const ptKey = masterConfig?.operationalKeys.find(k => k.fieldName === 'processType')
    const allOverrides: ProcessTypeResolution = {}
    for (const pt of preview?.processTypes ?? []) {
      const masterMatch = ptKey?.valueMappings.find(m => m.sourceValue === pt)
      if (masterMatch) {
        allOverrides[pt] = masterMatch.action as OrderType
      } else if (resolution[pt]) {
        allOverrides[pt] = resolution[pt]
      }
    }
    runImport(allOverrides)
  }

  function clearFile() {
    setPreview(null)
    setResolution({})
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const unmappedTypes = preview ? getUnmappedTypes(preview.processTypes) : []
  const allUnmappedResolved = unmappedTypes.every(pt => !!resolution[pt])
  const canImport = !!preview && preview.deliveryNumbers.length > 0

  return (
    <>
      <Card className="h-full flex flex-col">
        <CardHeader>
          <CardTitle className="text-base">Create Orders</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5 flex-1">
          {/* File drop zone */}
          {!preview ? (
            <div
              className={`flex-1 flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed cursor-pointer transition-colors min-h-[180px] ${
                isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
              }`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              <Upload className="size-8 text-muted-foreground" />
              <div className="text-center">
                <p className="text-sm font-medium">Drop SAP EWM JSON file here</p>
                <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={e => handleFiles(e.target.files)}
              />
            </div>
          ) : (
            <div className="flex-1 flex flex-col gap-3">
              {/* File info */}
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <FileJson className="size-5 text-primary shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{preview.file.name}</p>
                  <p className="text-xs text-muted-foreground">{preview.totalRecords} records</p>
                </div>
                <Button variant="ghost" size="icon" className="size-6 shrink-0" onClick={clearFile}>
                  <X className="size-3.5" />
                </Button>
              </div>

              {/* Delivery numbers */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {preview.deliveryNumbers.length} Deliveries Found
                  </span>
                  <CheckCircle2 className="size-4 text-green-500" />
                </div>
                <div className="max-h-[160px] overflow-y-auto flex flex-wrap gap-1.5 p-2 rounded-md border bg-background">
                  {preview.deliveryNumbers.map(dn => (
                    <Badge key={dn} variant="secondary" className="text-xs font-mono">
                      {dn}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Process types — show warning if any unmapped */}
              {preview.processTypes.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Process Types</span>
                  <div className="flex flex-wrap gap-1.5">
                    {preview.processTypes.map(pt => {
                      const isUnmapped = unmappedTypes.includes(pt)
                      return (
                        <Badge
                          key={pt}
                          variant={isUnmapped ? 'outline' : 'secondary'}
                          className={`text-xs font-mono ${isUnmapped ? 'border-amber-300 text-amber-700 bg-amber-50' : ''}`}
                        >
                          {isUnmapped && <AlertTriangle className="size-2.5 mr-1" />}
                          {pt}
                        </Badge>
                      )
                    })}
                  </div>
                  {unmappedTypes.length > 0 && (
                    <p className="text-xs text-amber-600">
                      {unmappedTypes.length} process type{unmappedTypes.length !== 1 ? 's' : ''} not in Master Configuration — you'll be prompted to resolve before import.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <Button onClick={handleImportClick} disabled={!canImport || isLoading} className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Importing…
              </>
            ) : (
              `Import ${preview ? `${preview.deliveryNumbers.length} Order${preview.deliveryNumbers.length !== 1 ? 's' : ''}` : 'Orders'}`
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Resolution modal — shown when unmapped process types are detected */}
      <Dialog open={showResolutionModal} onOpenChange={setShowResolutionModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-amber-500" />
              Unresolved Process Types
            </DialogTitle>
            <DialogDescription>
              The following process types were found in the file but are not configured in Master Configuration. Choose how to handle each one before proceeding.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-md border divide-y">
            {unmappedTypes.map(pt => (
              <div key={pt} className="px-4 py-3 flex items-center gap-3">
                <code className="text-sm font-mono flex-1">{pt}</code>
                <Select
                  value={resolution[pt] ?? ''}
                  onValueChange={v => setResolution(prev => ({ ...prev, [pt]: v as OrderType | 'skip' }))}
                >
                  <SelectTrigger className={`w-48 text-sm ${!resolution[pt] ? 'border-amber-300' : ''}`}>
                    <SelectValue placeholder="Select action…" />
                  </SelectTrigger>
                  <SelectContent>
                    {ORDER_TYPE_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                    <SelectItem value="skip" className="text-muted-foreground">Skip these deliveries</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              className="text-muted-foreground sm:mr-auto"
              onClick={() => {
                setShowResolutionModal(false)
                navigate('/master-config')
              }}
            >
              <SlidersHorizontal className="size-3.5 mr-1.5" />
              Fix Master Configuration
            </Button>
            <Button variant="outline" onClick={() => setShowResolutionModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleResolutionProceed} disabled={!allUnmappedResolved}>
              Proceed with Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
