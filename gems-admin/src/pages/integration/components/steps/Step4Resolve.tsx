import { CheckCircle2, AlertTriangle, SkipForward } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import type { OrderType, ProcessTypeResolution } from '../../types'

const ORDER_TYPE_OPTIONS: { value: OrderType; label: string }[] = [
  { value: 'picking', label: 'Picking' },
  { value: 'packing', label: 'Packing' },
  { value: 'commissioning', label: 'Commissioning' },
  { value: 'decommissioning', label: 'Decommissioning' },
  { value: 'shipping', label: 'Shipping' },
  { value: 'receiving', label: 'Receiving' },
]

export interface ProcessTypeGroup {
  processTypeValue: string
  deliveryCount: number
  /** Resolved from master config — present if already mapped */
  resolvedAction?: OrderType
}

interface Props {
  groups: ProcessTypeGroup[]
  resolution: ProcessTypeResolution
  onChange: (resolution: ProcessTypeResolution) => void
}

export function Step4Resolve({ groups, resolution, onChange }: Props) {
  const unmapped = groups.filter(g => !g.resolvedAction)
  const mapped = groups.filter(g => g.resolvedAction)

  function set(processTypeValue: string, value: OrderType | 'skip') {
    onChange({ ...resolution, [processTypeValue]: value })
  }

  const totalDeliveries = groups.reduce((s, g) => s + g.deliveryCount, 0)
  const skippedDeliveries = unmapped
    .filter(g => resolution[g.processTypeValue] === 'skip')
    .reduce((s, g) => s + g.deliveryCount, 0)
  const unresolvedCount = unmapped.filter(g => !resolution[g.processTypeValue]).length

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-muted-foreground">
          The file contains <strong>{groups.length}</strong> unique process type{groups.length !== 1 ? 's' : ''} across{' '}
          <strong>{totalDeliveries}</strong> deliveries.
          {unmapped.length > 0 && (
            <span className="block mt-1 text-amber-600">
              {unmapped.length} process type{unmapped.length !== 1 ? 's are' : ' is'} not in Master Configuration. Assign an order type or explicitly skip those deliveries before proceeding.
            </span>
          )}
        </p>
      </div>

      <div className="rounded-md border divide-y">
        {/* Already-mapped process types */}
        {mapped.map(g => (
          <div key={g.processTypeValue} className="px-4 py-3 flex items-center gap-4">
            <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium font-mono">{g.processTypeValue || <span className="text-muted-foreground italic">empty</span>}</p>
              <p className="text-xs text-muted-foreground">{g.deliveryCount} delivery{g.deliveryCount !== 1 ? ' groups' : ' group'}</p>
            </div>
            <Badge variant="secondary" className="capitalize shrink-0">
              {g.resolvedAction}
            </Badge>
            <span className="text-xs text-muted-foreground shrink-0">from Master Config</span>
          </div>
        ))}

        {/* Unmapped process types — require user decision */}
        {unmapped.map(g => {
          const decision = resolution[g.processTypeValue]
          const isSkipped = decision === 'skip'
          const isAssigned = decision && decision !== 'skip'

          return (
            <div
              key={g.processTypeValue}
              className={cn(
                'px-4 py-3 flex items-center gap-4',
                isSkipped && 'bg-muted/40'
              )}
            >
              {isAssigned ? (
                <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
              ) : isSkipped ? (
                <SkipForward className="size-4 text-muted-foreground shrink-0" />
              ) : (
                <AlertTriangle className="size-4 text-amber-500 shrink-0" />
              )}

              <div className="flex-1 min-w-0">
                <p className={cn('text-sm font-medium font-mono', isSkipped && 'line-through text-muted-foreground')}>
                  {g.processTypeValue || <span className="italic">empty</span>}
                </p>
                <p className="text-xs text-muted-foreground">
                  {g.deliveryCount} delivery{g.deliveryCount !== 1 ? ' groups' : ' group'}
                  {isSkipped && ' — will be excluded from this import'}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Select
                  value={isSkipped ? 'skip' : (decision as string | undefined) ?? ''}
                  onValueChange={v => set(g.processTypeValue, v as OrderType | 'skip')}
                >
                  <SelectTrigger className={cn('w-44 text-sm', !decision && 'border-amber-300 text-muted-foreground')}>
                    <SelectValue placeholder="Select action…" />
                  </SelectTrigger>
                  <SelectContent>
                    {ORDER_TYPE_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value} className="capitalize">
                        {o.label}
                      </SelectItem>
                    ))}
                    <SelectItem value="skip" className="text-muted-foreground">
                      Skip these deliveries
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )
        })}
      </div>

      {/* Summary footer */}
      {unmapped.length > 0 && (
        <div className="text-xs text-muted-foreground space-y-0.5">
          {unresolvedCount > 0 ? (
            <p className="text-amber-600">
              {unresolvedCount} process type{unresolvedCount !== 1 ? 's' : ''} still need{unresolvedCount === 1 ? 's' : ''} a decision.
            </p>
          ) : skippedDeliveries > 0 ? (
            <p>
              {skippedDeliveries} delivery{skippedDeliveries !== 1 ? ' groups' : ' group'} will be skipped by your choice.{' '}
              {totalDeliveries - skippedDeliveries} will be imported.
            </p>
          ) : (
            <p className="text-emerald-600">All process types resolved — ready to import.</p>
          )}
        </div>
      )}
    </div>
  )
}
