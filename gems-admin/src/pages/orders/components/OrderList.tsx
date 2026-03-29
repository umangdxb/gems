import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download, Loader2, RefreshCw, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { api } from '@/lib/api'
import type { DeliveryOrder, OrderStatus, OrderType, OrdersListResponse } from '../types'

const STATUS_BADGE: Record<OrderStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Pending', variant: 'secondary' },
  in_progress: { label: 'In Progress', variant: 'default' },
  completed: { label: 'Completed', variant: 'outline' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
}

const ORDER_TYPES: OrderType[] = ['picking', 'packing', 'commissioning', 'decommissioning', 'shipping']

interface Props {
  refreshTrigger?: number
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function OrderList({ refreshTrigger }: Props) {
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')

  const params = new URLSearchParams({ limit: '50' })
  if (statusFilter !== 'all') params.set('status', statusFilter)
  if (typeFilter !== 'all') params.set('orderType', typeFilter)

  const { data, isLoading, isError, refetch, isFetching } = useQuery<OrdersListResponse>({
    queryKey: ['delivery-orders', statusFilter, typeFilter, refreshTrigger],
    queryFn: () => api.get<OrdersListResponse>(`/delivery-orders?${params.toString()}`),
  })

  async function downloadEpcis(order: DeliveryOrder) {
    try {
      const token = localStorage.getItem('gems_token')
      const baseUrl = import.meta.env.VITE_API_BASE_URL ?? ''
      const res = await fetch(`${baseUrl}/delivery-orders/${order._id}/epcis`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: res.statusText }))
        throw new Error(err.message ?? 'Download failed')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `EPCIS_${order.orderNumber}.xml`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Download failed')
    }
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
        <CardTitle className="text-base">Orders</CardTitle>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status filter */}
          <Select value={statusFilter} onValueChange={v => setStatusFilter(v ?? 'all')}>
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          {/* Type filter */}
          <Select value={typeFilter} onValueChange={v => setTypeFilter(v ?? 'all')}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {ORDER_TYPES.map(t => (
                <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`size-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-auto p-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-40 gap-2 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            <span className="text-sm">Loading orders…</span>
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3 text-muted-foreground">
            <AlertCircle className="size-5" />
            <span className="text-sm">Failed to load orders</span>
            <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
          </div>
        ) : !data?.orders.length ? (
          <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
            No orders found
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Warehouse</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.orders.map(order => {
                const badge = STATUS_BADGE[order.status]
                return (
                  <TableRow key={order._id}>
                    <TableCell className="font-mono text-xs">{order.orderNumber}</TableCell>
                    <TableCell className="capitalize text-sm">{order.orderType}</TableCell>
                    <TableCell className="text-sm">{order.warehouse || '—'}</TableCell>
                    <TableCell>
                      <Badge variant={badge.variant} className="text-xs">
                        {order.status === 'in_progress' && (
                          <Loader2 className="size-3 mr-1 animate-spin" />
                        )}
                        {badge.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(order.createdAt)}
                    </TableCell>
                    <TableCell>
                      {order.status === 'completed' && order.epcisGeneratedAt && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          onClick={() => downloadEpcis(order)}
                          title="Download EPCIS XML"
                        >
                          <Download className="size-3.5" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {data && (
        <div className="px-6 py-3 border-t text-xs text-muted-foreground">
          {data.total} order{data.total !== 1 ? 's' : ''} total
        </div>
      )}
    </Card>
  )
}
