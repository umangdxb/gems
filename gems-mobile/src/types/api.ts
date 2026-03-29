export type OrderType = 'picking' | 'packing' | 'commissioning' | 'decommissioning' | 'shipping';
export type OrderStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export interface OrderItem {
  lineNumber: string;
  warehouseTask: string;
  product: string;
  batch: string;
  quantity: number;
  actualQuantity: number;
  unit: string;
  sourceBin: string;
  sourceStorageType: string;
  destinationBin: string;
  destinationStorageType: string;
  weight: number;
  weightUnit: string;
  scannedEpcs: string[];
}

export interface DeliveryOrder {
  _id: string;
  orderNumber: string;
  orderType: OrderType;
  warehouse: string;
  status: OrderStatus;
  importBatchId: string;
  items: OrderItem[];
  epcisGeneratedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrdersListResponse {
  orders: Omit<DeliveryOrder, 'items'>[];
  total: number;
  page: number;
  limit: number;
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    tenantId: string;
  };
}

export interface CompleteOrderPayload {
  items: Array<{ lineNumber: string; scannedEpcs: string[] }>;
}

export interface CompleteOrderResponse {
  id: string;
  status: OrderStatus;
  epcisGeneratedAt: string;
}
