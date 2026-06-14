import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Check, ChevronsUpDown, X, BookOpen, AlertTriangle, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { api } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import type { MappingConfig, MappingFieldKey, ParsedFile, SavedMapping } from '../../types'
import { TARGET_TO_UI_KEY, UI_KEY_TO_TARGET } from '../../types'

interface MasterConfig {
  operationalKeys: Array<{ fieldName: string; label: string; valueMappings: Array<{ sourceValue: string; action: string }> }>
}

interface Props {
  parsedFile: ParsedFile
  mapping: MappingConfig
  onChange: (mapping: MappingConfig) => void
}

const TARGET_FIELDS: {
  key: MappingFieldKey
  label: string
  description: string
  required?: boolean
  aliases: string[]
}[] = [
  {
    key: 'orderNumber',
    label: 'Order Number',
    description: 'Unique identifier for the warehouse task or order',
    required: true,
    aliases: ['warehousetask', 'ordernumber', 'ordernum', 'orderid', 'order_no', 'taskid', 'task'],
  },
  {
    key: 'material',
    label: 'Material',
    description: 'Product or material number',
    required: true,
    aliases: ['material', 'product', 'materialnumber', 'productid', 'sku', 'itemid'],
  },
  {
    key: 'batch',
    label: 'Batch',
    description: 'Batch or lot number',
    aliases: ['batch', 'lot', 'batchid', 'lotnumber', 'batchnumber'],
  },
  {
    key: 'sourceBin',
    label: 'Source Bin',
    description: 'Source storage location or bin',
    aliases: ['sourcestoragebin', 'sourcebin', 'source_bin', 'bin', 'sourcelocation', 'storagebinid'],
  },
  {
    key: 'destinationBin',
    label: 'Destination Bin',
    description: 'Destination storage location or bin',
    aliases: ['destinationstoragebin', 'destbin', 'destinationbin', 'destlocation', 'destinationstoragebinid'],
  },
  {
    key: 'quantity',
    label: 'Quantity',
    description: 'Number of units for this task',
    aliases: ['targetquantityinbaseunit', 'actualquantityinbaseunit', 'qty', 'quantity', 'amount', 'units', 'count'],
  },
  {
    key: 'warehouse',
    label: 'Warehouse',
    description: 'Warehouse identifier (e.g. EWMWarehouse)',
    aliases: ['ewmwarehouse', 'warehouse', 'warehouseid', 'whse'],
  },
  {
    key: 'deliveryRef',
    label: 'Delivery Reference',
    description: 'Delivery or shipment reference (e.g. EWMDelivery)',
    aliases: ['ewmdelivery', 'deliveryref', 'deliverynumber', 'delivery', 'shipmentref'],
  },
  {
    key: 'processType',
    label: 'Warehouse Process Type',
    description: 'Process type code that determines the warehouse operation (e.g. Y214, Y220)',
    aliases: ['warehouseprocesstype', 'processtype', 'whsprocesstype', 'wh_process_type'],
  },
  {
    key: 'confirmedAt',
    label: 'Confirmed At',
    description: 'Date/time the warehouse task was confirmed (used as EPCIS event time)',
    aliases: ['whsetaskconfutcdatetime', 'confirmedat', 'confirmedtime', 'confirmeddatetime', 'taskconfirmedtime'],
  },
]

function autoSuggest(headers: string[], aliases: string[]): string | null {
  const normalise = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
  return (
    headers.find(h => aliases.includes(normalise(h))) ??
    headers.find(h => aliases.some(a => normalise(h).includes(a))) ??
    null
  )
}

const EMPTY_FIELD_VALUES: Omit<MappingConfig, 'defaultValues'> = {
  orderNumber: null, material: null, batch: null, sourceBin: null, quantity: null,
  destinationBin: null, warehouse: null, deliveryRef: null, processType: null, confirmedAt: null,
}

function applySaved(saved: SavedMapping): MappingConfig {
  const config: MappingConfig = { ...EMPTY_FIELD_VALUES, defaultValues: (saved as SavedMapping & { defaultValues?: Record<string, string> }).defaultValues ?? {} }
  for (const { sourceField, targetField } of saved.fieldMappings) {
    const uiKey = TARGET_TO_UI_KEY[targetField]
    if (uiKey) config[uiKey] = sourceField
  }
  return config
}

// ── Searchable field picker ───────────────────────────────────────
function FieldCombobox({
  headers,
  sampleValues,
  value,
  onChange,
}: {
  headers: string[]
  sampleValues: Record<string, string>
  value: string | null
  onChange: (v: string | null) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger render={
          <Button
            variant="outline"
            role="combobox"
            className={cn('w-52 justify-between font-normal', !value && 'text-muted-foreground')}
          />
        }>
          <span className="truncate">{value ?? 'Select a field…'}</span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <Command>
            <CommandInput placeholder="Search fields…" />
            <CommandList className="max-h-64">
              <CommandEmpty>No fields match your search.</CommandEmpty>
              <CommandGroup>
                {headers.map(h => (
                  <CommandItem
                    key={h}
                    value={h}
                    onSelect={() => { onChange(h); setOpen(false) }}
                    className="flex items-start gap-2 py-2"
                  >
                    <Check className={cn('size-4 mt-0.5 shrink-0', value === h ? 'opacity-100' : 'opacity-0')} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{h}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        e.g. {sampleValues[h] ?? '—'}
                      </p>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {value && (
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-muted-foreground hover:text-foreground"
          onClick={() => onChange(null)}
        >
          <X className="size-4" />
        </Button>
      )}
    </div>
  )
}

// ── Step 3 ────────────────────────────────────────────────────────
export function Step3Map({ parsedFile, mapping, onChange }: Props) {
  const [savedOpen, setSavedOpen] = useState(false)
  const { user } = useAuth()

  // Fetch saved mappings for this tenant
  const { data: savedMappings } = useQuery<SavedMapping[]>({
    queryKey: ['integration-mappings'],
    queryFn: () => api.get<SavedMapping[]>('/orders/mappings'),
    staleTime: 60_000,
  })

  // Fetch master config to identify operational keys
  const { data: masterConfig } = useQuery<MasterConfig>({
    queryKey: ['master-config', user?.tenantId],
    queryFn: () => api.get<MasterConfig>(`/tenants/${user!.tenantId}/master-config`),
    enabled: !!user?.tenantId,
    staleTime: 60_000,
  })

  const operationalKeyMap = new Map(
    (masterConfig?.operationalKeys ?? []).map(k => [k.fieldName, k])
  )

  // Auto-suggest on mount
  useEffect(() => {
    const suggested: MappingConfig = { ...EMPTY_FIELD_VALUES, defaultValues: mapping.defaultValues }
    for (const field of TARGET_FIELDS) {
      suggested[field.key] = autoSuggest(parsedFile.headers, field.aliases)
    }
    onChange(suggested)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsedFile.headers])

  function setField(key: MappingFieldKey, value: string | null) {
    onChange({ ...mapping, [key]: value })
  }

  function setDefault(targetField: string, value: string) {
    onChange({ ...mapping, defaultValues: { ...mapping.defaultValues, [targetField]: value } })
  }

  function clearDefault(targetField: string) {
    const next = { ...mapping.defaultValues }
    delete next[targetField]
    onChange({ ...mapping, defaultValues: next })
  }

  const autoSuggested = TARGET_FIELDS.reduce<Partial<Record<MappingFieldKey, string | null>>>((acc, f) => {
    acc[f.key] = autoSuggest(parsedFile.headers, f.aliases)
    return acc
  }, {})

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Map fields from your JSON file to the GEMS schema.
          <span className="block mt-0.5 text-xs">
            {parsedFile.headers.length} fields detected · {parsedFile.rows.length.toLocaleString()} records
          </span>
        </p>

        {savedMappings && savedMappings.length > 0 && (
          <Popover open={savedOpen} onOpenChange={setSavedOpen}>
            <PopoverTrigger render={
              <Button variant="outline" size="sm" className="shrink-0 gap-1.5" />
            }>
              <BookOpen className="size-3.5" />
              Load saved
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0" align="end">
              <Command>
                <CommandInput placeholder="Search mappings…" />
                <CommandList>
                  <CommandEmpty>No saved mappings.</CommandEmpty>
                  <CommandGroup>
                    {savedMappings.map(m => (
                      <CommandItem
                        key={m._id}
                        value={m.name}
                        onSelect={() => { onChange(applySaved(m)); setSavedOpen(false) }}
                        className="flex flex-col items-start gap-0.5 py-2"
                      >
                        <span className="text-sm font-medium">{m.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {m.fieldMappings.length} fields mapped
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        )}
      </div>

      <div className="rounded-md border divide-y">
        {TARGET_FIELDS.map(({ key, label, description, required }) => {
          const targetFieldName = UI_KEY_TO_TARGET[key]
          const sourceValue = mapping[key]
          const isSuggested = sourceValue !== null && sourceValue === autoSuggested[key]
          const opKey = operationalKeyMap.get(targetFieldName)
          const hasNoMappings = opKey && opKey.valueMappings.length === 0
          const currentDefault = mapping.defaultValues[targetFieldName]

          return (
            <div key={key} className="px-4 py-3 space-y-2">
              <div className="flex items-center justify-between gap-4">
                {/* Target field info */}
                <div className="w-40 shrink-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-sm font-medium">{label}</p>
                    {required && (
                      <span className="text-[10px] text-destructive font-medium">Required</span>
                    )}
                    {opKey && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                        <Zap className="size-2.5" />
                        Operational
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                </div>

                {/* Source field picker */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <FieldCombobox
                    headers={parsedFile.headers}
                    sampleValues={parsedFile.sampleValues}
                    value={sourceValue}
                    onChange={v => setField(key, v)}
                  />
                  {isSuggested && (
                    <span className="text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
                      auto-matched
                    </span>
                  )}
                </div>
              </div>

              {/* Operational key warning */}
              {opKey && hasNoMappings && (
                <div className="flex items-center gap-1.5 text-[11px] text-amber-600 pl-0.5">
                  <AlertTriangle className="size-3 shrink-0" />
                  No value mappings configured — add them in Settings → Master Configuration
                </div>
              )}

              {/* Default value input (shown when a source field is selected) */}
              {sourceValue && (
                <div className="flex items-center gap-2 pl-0.5">
                  <span className="text-[11px] text-muted-foreground shrink-0 w-40">Default value</span>
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <Input
                      className="h-7 text-xs w-44"
                      placeholder="Used when source is empty…"
                      value={currentDefault ?? ''}
                      onChange={e => {
                        if (e.target.value) setDefault(targetFieldName, e.target.value)
                        else clearDefault(targetFieldName)
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {(!mapping.orderNumber || !mapping.material) && (
        <p className="text-sm text-destructive">
          {!mapping.orderNumber && !mapping.material
            ? 'Order Number and Material must be mapped to continue.'
            : !mapping.orderNumber
            ? 'Order Number must be mapped to continue.'
            : 'Material must be mapped to continue.'}
        </p>
      )}
    </div>
  )
}
