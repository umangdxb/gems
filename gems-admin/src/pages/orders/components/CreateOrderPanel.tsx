import { useRef, useState } from 'react'
import { Upload, FileJson, CheckCircle2, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/api'
import type { OrderType, ImportResult } from '../types'

const ORDER_TYPES: { value: OrderType; label: string }[] = [
  { value: 'picking', label: 'Picking' },
  { value: 'packing', label: 'Packing' },
  { value: 'commissioning', label: 'Commissioning' },
  { value: 'decommissioning', label: 'Decommissioning' },
  { value: 'shipping', label: 'Shipping' },
]

interface Props {
  onImported: () => void
}

interface ParsedPreview {
  file: File
  deliveryNumbers: string[]
  totalRecords: number
}

export function CreateOrderPanel({ onImported }: Props) {
  const [orderType, setOrderType] = useState<OrderType | ''>('')
  const [preview, setPreview] = useState<ParsedPreview | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
        for (const r of records) {
          const dn = String((r as Record<string, unknown>)['EWMDelivery'] ?? '').trim()
          if (dn) deliverySet.add(dn)
        }

        setPreview({
          file,
          deliveryNumbers: Array.from(deliverySet),
          totalRecords: records.length,
        })
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

  async function handleImport() {
    if (!preview || !orderType) return
    setIsLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', preview.file)
      formData.append('orderType', orderType)
      const result = await api.uploadForm<ImportResult>('/delivery-orders/import', formData)
      toast.success(`${result.ordersCreated} order${result.ordersCreated !== 1 ? 's' : ''} imported successfully`)
      setPreview(null)
      setOrderType('')
      onImported()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setIsLoading(false)
    }
  }

  function clearFile() {
    setPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const canImport = !!preview && !!orderType && preview.deliveryNumbers.length > 0

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="text-base">Create Orders</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5 flex-1">
        {/* Order type */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Order Type</label>
          <Select value={orderType} onValueChange={v => setOrderType(v as OrderType)}>
            <SelectTrigger>
              <SelectValue placeholder="Select order type…" />
            </SelectTrigger>
            <SelectContent>
              {ORDER_TYPES.map(t => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

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

            {/* Delivery numbers preview */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {preview.deliveryNumbers.length} Deliveries Found
                </span>
                <CheckCircle2 className="size-4 text-green-500" />
              </div>
              <div className="max-h-[200px] overflow-y-auto flex flex-wrap gap-1.5 p-2 rounded-md border bg-background">
                {preview.deliveryNumbers.map(dn => (
                  <Badge key={dn} variant="secondary" className="text-xs font-mono">
                    {dn}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Import button */}
        <Button onClick={handleImport} disabled={!canImport || isLoading} className="w-full">
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
  )
}
