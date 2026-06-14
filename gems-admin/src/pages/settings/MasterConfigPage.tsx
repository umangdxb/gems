import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/lib/api'

const VALID_ACTIONS = [
  'picking',
  'packing',
  'commissioning',
  'decommissioning',
  'shipping',
  'receiving',
] as const
type Action = typeof VALID_ACTIONS[number]

interface ValueMapping {
  sourceValue: string
  action: Action | ''
}

interface OperationalKey {
  fieldName: string
  label: string
  valueMappings: ValueMapping[]
}

interface MasterConfigResponse {
  operationalKeys: OperationalKey[]
}

// The known set of fields that can be marked as operational.
// Add more entries here as new operational fields are introduced.
const KNOWN_OPERATIONAL_FIELDS: Pick<OperationalKey, 'fieldName' | 'label'>[] = [
  { fieldName: 'processType', label: 'Warehouse Process Type' },
]

export function MasterConfigPage() {
  const { user } = useAuth()
  const qc = useQueryClient()

  const { data, isLoading } = useQuery<MasterConfigResponse>({
    queryKey: ['master-config', user?.tenantId],
    queryFn: () => api.get<MasterConfigResponse>(`/tenants/${user!.tenantId}/master-config`),
    enabled: !!user?.tenantId,
  })

  const [keys, setKeys] = useState<OperationalKey[]>([])

  useEffect(() => {
    if (data) {
      // Merge server data with the known field list so all known fields are always visible
      const serverMap = new Map(data.operationalKeys.map(k => [k.fieldName, k]))
      setKeys(
        KNOWN_OPERATIONAL_FIELDS.map(f => serverMap.get(f.fieldName) ?? { ...f, valueMappings: [] })
      )
    }
  }, [data])

  const { mutate: save, isPending: isSaving } = useMutation({
    mutationFn: (payload: OperationalKey[]) =>
      api.put(`/tenants/${user!.tenantId}/master-config`, { operationalKeys: payload }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['master-config', user?.tenantId] })
      toast.success('Master configuration saved.')
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to save configuration.')
    },
  })

  function addValueMapping(fieldName: string) {
    setKeys(prev =>
      prev.map(k =>
        k.fieldName === fieldName
          ? { ...k, valueMappings: [...k.valueMappings, { sourceValue: '', action: '' }] }
          : k
      )
    )
  }

  function updateValueMapping(fieldName: string, index: number, patch: Partial<ValueMapping>) {
    setKeys(prev =>
      prev.map(k =>
        k.fieldName === fieldName
          ? {
              ...k,
              valueMappings: k.valueMappings.map((vm, i) => i === index ? { ...vm, ...patch } : vm),
            }
          : k
      )
    )
  }

  function removeValueMapping(fieldName: string, index: number) {
    setKeys(prev =>
      prev.map(k =>
        k.fieldName === fieldName
          ? { ...k, valueMappings: k.valueMappings.filter((_, i) => i !== index) }
          : k
      )
    )
  }

  function handleSave() {
    // Validate: all rows must have both sourceValue and action filled
    for (const key of keys) {
      for (const vm of key.valueMappings) {
        if (!vm.sourceValue.trim() || !vm.action) {
          toast.error('All value mappings must have a source value and an action.')
          return
        }
      }
    }
    save(keys as OperationalKey[])
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Master Configuration</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Define operational keys and configure how their values map to warehouse actions.
          Operational keys are validated at import time.
        </p>
      </div>

      <Separator />

      {isLoading ? (
        <div className="space-y-6">
          {[1, 2].map(i => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      ) : (
        <div className="space-y-8">
          {keys.map(key => (
            <div key={key.fieldName} className="space-y-3">
              <div>
                <h2 className="text-base font-medium">{key.label}</h2>
                <p className="text-xs text-muted-foreground">
                  Field: <code className="bg-muted px-1 py-0.5 rounded text-[11px]">{key.fieldName}</code>
                </p>
              </div>

              {key.valueMappings.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No mappings configured yet.</p>
              ) : (
                <div className="rounded-md border divide-y">
                  <div className="grid grid-cols-[1fr_1fr_auto] gap-3 px-4 py-2 bg-muted/50 text-xs font-medium text-muted-foreground">
                    <span>Source value</span>
                    <span>Action</span>
                    <span />
                  </div>
                  {key.valueMappings.map((vm, i) => (
                    <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-3 px-4 py-2.5 items-center">
                      <Input
                        className="h-8 text-sm"
                        placeholder="e.g. Y214"
                        value={vm.sourceValue}
                        onChange={e => updateValueMapping(key.fieldName, i, { sourceValue: e.target.value })}
                      />
                      <Select
                        value={vm.action || undefined}
                        onValueChange={v => updateValueMapping(key.fieldName, i, { action: v as Action })}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Select action…" />
                        </SelectTrigger>
                        <SelectContent>
                          {VALID_ACTIONS.map(a => (
                            <SelectItem key={a} value={a}>
                              {a.charAt(0).toUpperCase() + a.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-destructive"
                        onClick={() => removeValueMapping(key.fieldName, i)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => addValueMapping(key.fieldName)}
              >
                <Plus className="size-3.5" />
                Add mapping
              </Button>

              <Separator />
            </div>
          ))}
        </div>
      )}

      <div className="pt-2">
        <Button onClick={handleSave} disabled={isSaving || isLoading}>
          {isSaving ? 'Saving…' : 'Save configuration'}
        </Button>
      </div>
    </div>
  )
}
