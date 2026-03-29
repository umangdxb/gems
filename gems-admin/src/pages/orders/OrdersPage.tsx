import { useState } from 'react'
import { CreateOrderPanel } from './components/CreateOrderPanel'
import { OrderList } from './components/OrderList'

export function OrdersPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  function handleImported() {
    setRefreshTrigger(t => t + 1)
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      <h1 className="text-xl font-semibold">Orders</h1>
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 flex-1 min-h-0">
        <CreateOrderPanel onImported={handleImported} />
        <OrderList refreshTrigger={refreshTrigger} />
      </div>
    </div>
  )
}
