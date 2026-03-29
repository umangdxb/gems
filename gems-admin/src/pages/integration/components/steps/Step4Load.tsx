import { ArrowRight, Save } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import type { MappingConfig, ParsedFile } from '../../types'

interface Props {
  parsedFile: ParsedFile
  mapping: MappingConfig
  mappingName: string
  onMappingNameChange: (name: string) => void
}

const FIELD_LABELS: Record<keyof MappingConfig, string> = {
  orderNumber: 'Order Number',
  material: 'Material',
  batch: 'Batch',
  sourceBin: 'Source Bin',
  quantity: 'Quantity',
}

export function Step4Load({ parsedFile, mapping, mappingName, onMappingNameChange }: Props) {
  const mappedCount = Object.values(mapping).filter(Boolean).length

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="rounded-md border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">File</span>
          <span className="text-sm font-medium truncate max-w-[260px]" title={parsedFile.rawFile.name}>
            {parsedFile.rawFile.name}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Rows to load</span>
          <Badge variant="secondary">{parsedFile.rows.length.toLocaleString()}</Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Fields mapped</span>
          <Badge variant="secondary">{mappedCount} / 5</Badge>
        </div>
        {parsedFile.arrayRootPath && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Data envelope</span>
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{parsedFile.arrayRootPath}</code>
          </div>
        )}
      </div>

      {/* Field mapping detail */}
      <div className="space-y-2">
        <p className="text-sm font-medium">Field Mapping</p>
        <div className="space-y-1.5">
          {(Object.keys(FIELD_LABELS) as (keyof MappingConfig)[]).map(key => (
            mapping[key] ? (
              <div key={key} className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground w-28 shrink-0">{FIELD_LABELS[key]}</span>
                <ArrowRight className="size-3.5 text-muted-foreground shrink-0" />
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs truncate">{mapping[key]}</code>
              </div>
            ) : null
          ))}
        </div>
      </div>

      <Separator />

      {/* Save mapping */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Save className="size-4 text-muted-foreground" />
          <p className="text-sm font-medium">Save mapping for future use</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Give this mapping a name to reuse it when new data arrives from the same source.
          Leave blank to skip saving.
        </p>
        <Input
          placeholder="e.g. SAP EWM Warehouse Tasks"
          value={mappingName}
          onChange={e => onMappingNameChange(e.target.value)}
          className="h-8 text-sm"
        />
      </div>
    </div>
  )
}
