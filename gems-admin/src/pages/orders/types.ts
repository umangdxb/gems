export type OrderType = 'picking' | 'packing' | 'commissioning' | 'decommissioning' | 'shipping'
export type OrderStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'

export interface DeliveryOrder {
  _id: string
  orderNumber: string
  orderType: OrderType
  warehouse: string
  status: OrderStatus
  importBatchId: string
  sourceFormat: string
  createdAt: string
  updatedAt: string
  completedAt: string | null
  epcisGeneratedAt: string | null
}

export interface ImportResult {
  importBatchId: string
  ordersCreated: number
  orderNumbers: string[]
}

export interface OrdersListResponse {
  orders: DeliveryOrder[]
  total: number
  page: number
  limit: number
}
