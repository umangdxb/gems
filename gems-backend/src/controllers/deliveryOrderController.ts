import { Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { DeliveryOrder, type OrderType, type IOrderItem } from '../models/DeliveryOrder'
import { MasterConfig } from '../models/MasterConfig'
import { parseJson } from '../services/fileParserService'

// ── EPCIS ────────────────────────────────────────────────────────────────────

const BIZSTEP: Record<OrderType, string> = {
  picking:         'urn:epcglobal:cbv:bizstep:picking',
  packing:         'urn:epcglobal:cbv:bizstep:packing',
  commissioning:   'urn:epcglobal:cbv:bizstep:commissioning',
  decommissioning: 'urn:epcglobal:cbv:bizstep:decommissioning',
  shipping:        'urn:epcglobal:cbv:bizstep:shipping',
  receiving:       'urn:epcglobal:cbv:bizstep:receiving',
}

function generateEpcisXml(order: InstanceType<typeof DeliveryOrder>): string {
  const now = new Date().toISOString()
  const bizStep = BIZSTEP[order.orderType]
  const allEpcs = order.items.flatMap(i => i.scannedEpcs)
  const epcListXml = allEpcs.length
    ? allEpcs.map(e => `        <epc>${e}</epc>`).join('\n')
    : `        <epc>urn:epc:id:unknown:${order.orderNumber}</epc>`

  return `<?xml version="1.0" encoding="UTF-8"?>
<ns0:EPCISDocument creationDate="${now}" schemaVersion="1.2" xmlns:ns0="urn:epcglobal:epcis:xsd:1">
  <EPCISBody>
    <EventList>
      <ObjectEvent>
        <eventTime>${now}</eventTime>
        <eventTimeZoneOffset>+00:00</eventTimeZoneOffset>
        <epcList>
${epcListXml}
        </epcList>
        <action>OBSERVE</action>
        <bizStep>${bizStep}</bizStep>
        <disposition>urn:epcglobal:cbv:disp:completed</disposition>
        <readPoint>
          <id>urn:epc:id:sgln:${order.warehouse}.00000.0</id>
        </readPoint>
        <bizTransactionList>
          <bizTransaction type="urn:epcglobal:cbv:btt:desadv">${order.orderNumber}</bizTransaction>
        </bizTransactionList>
      </ObjectEvent>
    </EventList>
  </EPCISBody>
</ns0:EPCISDocument>`
}

// ── Parsing ───────────────────────────────────────────────────────────────────

interface DeliveryGroup {
  warehouse: string
  processType: string  // from WarehouseProcessType field — used to derive orderType via master config
  items: Omit<IOrderItem, 'scannedEpcs'>[]
}

/**
 * Parse SAP EWM WarehouseTask records and group them by EWMDelivery number.
 * Each unique delivery becomes one DeliveryOrder with its warehouse tasks as items.
 * processType is captured from the first record of each delivery group.
 */
function groupByDelivery(records: Record<string, unknown>[]): Map<string, DeliveryGroup> {
  const groups = new Map<string, DeliveryGroup>()

  for (const record of records) {
    const deliveryNumber = String(record['EWMDelivery'] ?? '').trim()
    if (!deliveryNumber) continue

    const item: Omit<IOrderItem, 'scannedEpcs'> = {
      lineNumber: String(record['EWMDeliveryItem'] ?? ''),
      warehouseTask: String(record['WarehouseTask'] ?? ''),
      product: String(record['Product'] ?? ''),
      batch: String(record['Batch'] ?? ''),
      quantity: Number(record['TargetQuantityInBaseUnit'] ?? 0),
      actualQuantity: Number(record['ActualQuantityInBaseUnit'] ?? 0),
      unit: String(record['BaseUnit'] ?? 'PC'),
      sourceBin: String(record['SourceStorageBin'] ?? ''),
      sourceStorageType: String(record['SourceStorageType'] ?? ''),
      destinationBin: String(record['DestinationStorageBin'] ?? ''),
      destinationStorageType: String(record['DestinationStorageType'] ?? ''),
      weight: Number(record['WhseTaskNetWeight'] ?? 0),
      weightUnit: String(record['WhseTaskNetWeightUnitOfMeasure'] ?? 'KG'),
      sourceData: record,
    }

    if (!groups.has(deliveryNumber)) {
      groups.set(deliveryNumber, {
        warehouse: String(record['EWMWarehouse'] ?? ''),
        processType: String(record['WarehouseProcessType'] ?? '').trim(),
        items: [],
      })
    }
    groups.get(deliveryNumber)!.items.push(item)
  }

  return groups
}

// ── Handlers ──────────────────────────────────────────────────────────────────

const VALID_ORDER_TYPES: OrderType[] = ['picking', 'packing', 'commissioning', 'decommissioning', 'shipping', 'receiving']

export const importDeliveryOrders = async (req: Request, res: Response) => {
  const tenantId = req.tenant!._id
  console.log(`[importDeliveryOrders] tenantId=${tenantId} file=${req.file?.originalname}`)

  if (!req.file) {
    return res.status(400).json({ message: 'A JSON file is required (field name: file)' })
  }

  // processTypeOverrides: user-explicit decisions from the frontend Resolve step
  // Format: { "Y214": "picking", "Y999": "skip" }
  let processTypeOverrides: Record<string, string> = {}
  if (req.body.processTypeOverrides) {
    try {
      processTypeOverrides = JSON.parse(req.body.processTypeOverrides)
    } catch {
      return res.status(400).json({ message: 'processTypeOverrides must be valid JSON' })
    }
  }

  let records: Record<string, unknown>[]
  try {
    records = parseJson(req.file.buffer.toString('utf-8'))
  } catch (err) {
    console.error('[importDeliveryOrders] JSON parse error:', err)
    return res.status(400).json({ message: `Failed to parse JSON: ${err instanceof Error ? err.message : 'Unknown error'}` })
  }

  const groups = groupByDelivery(records)
  console.log(`[importDeliveryOrders] grouped into ${groups.size} deliveries`)
  if (groups.size === 0) {
    return res.status(400).json({ message: 'No records with a valid EWMDelivery number found in the file.' })
  }

  try {
    // Fetch master config as fallback when no override is provided
    const masterConfig = await MasterConfig.findOne({ tenantId })
    const processTypeKey = masterConfig?.operationalKeys.find(k => k.fieldName === 'processType')
    console.log(`[importDeliveryOrders] masterConfig found=${!!masterConfig} processTypeKey found=${!!processTypeKey}`)

    const importBatchId = uuidv4()
    const created: InstanceType<typeof DeliveryOrder>[] = []
    const skipped: string[] = []

    for (const [orderNumber, { warehouse, processType, items }] of groups.entries()) {
      // Resolution priority: explicit user override → master config lookup
      const override = processTypeOverrides[processType]

      if (override === 'skip') {
        console.log(`[importDeliveryOrders] delivery=${orderNumber} processType="${processType}" — explicitly skipped by user`)
        skipped.push(orderNumber)
        continue
      }

      let orderType: OrderType | undefined

      if (override && VALID_ORDER_TYPES.includes(override as OrderType)) {
        orderType = override as OrderType
      } else if (processTypeKey && processType) {
        const vm = processTypeKey.valueMappings.find(m => m.sourceValue === processType)
        if (vm && VALID_ORDER_TYPES.includes(vm.action as OrderType)) {
          orderType = vm.action as OrderType
        }
      }

      console.log(`[importDeliveryOrders] delivery=${orderNumber} processType="${processType}" resolvedOrderType=${orderType ?? 'NONE'}`)

      if (!orderType) {
        // This should not happen if the frontend enforced resolution — guard defensively
        return res.status(400).json({
          message: `No order type resolved for delivery ${orderNumber} (WarehouseProcessType="${processType}"). Ensure all process types are mapped in Master Configuration or resolved during upload.`,
        })
      }

      const order = await DeliveryOrder.create({
        tenantId,
        orderNumber,
        orderType,
        warehouse,
        status: 'pending',
        importBatchId,
        sourceFormat: 'sap_ewm_warehouse_task',
        items: items.map(item => ({ ...item, scannedEpcs: [] })),
        epcisContent: null,
        epcisGeneratedAt: null,
        completedAt: null,
      })
      created.push(order)
    }

    if (created.length === 0) {
      return res.status(400).json({
        message: 'All deliveries were skipped. No orders were created.',
        skipped,
      })
    }

    console.log(`[importDeliveryOrders] created=${created.length} skipped=${skipped.length}`)
    return res.status(201).json({
      importBatchId,
      ordersCreated: created.length,
      orderNumbers: created.map(o => o.orderNumber),
      ...(skipped.length > 0 ? { warnings: [`${skipped.length} deliver${skipped.length !== 1 ? 'ies' : 'y'} skipped by user choice: ${skipped.join(', ')}`] } : {}),
    })
  } catch (err) {
    console.error('[importDeliveryOrders] error:', err)
    return res.status(500).json({ message: err instanceof Error ? err.message : 'Import failed' })
  }
}

export const listDeliveryOrders = async (req: Request, res: Response) => {
  const tenantId = req.tenant!._id
  const { status, orderType } = req.query as { status?: string; orderType?: string }
  const page = Math.max(1, parseInt(req.query['page'] as string) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(req.query['limit'] as string) || 20))

  const filter: Record<string, unknown> = { tenantId }

  const validStatuses = ['pending', 'in_progress', 'completed', 'cancelled']
  if (status && validStatuses.includes(status)) filter['status'] = status

  const validTypes = ['picking', 'packing', 'commissioning', 'decommissioning', 'shipping']
  if (orderType && validTypes.includes(orderType)) filter['orderType'] = orderType

  const [orders, total] = await Promise.all([
    DeliveryOrder.find(filter, { items: 0, epcisContent: 0, sourceData: 0 })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    DeliveryOrder.countDocuments(filter),
  ])

  return res.json({ orders, total, page, limit })
}

export const getDeliveryOrder = async (req: Request, res: Response) => {
  const order = await DeliveryOrder.findOne(
    { _id: req.params['id'], tenantId: req.tenant!._id },
    { epcisContent: 0 }
  )
  if (!order) return res.status(404).json({ message: 'Order not found' })
  return res.json(order)
}

export const updateDeliveryOrderStatus = async (req: Request, res: Response) => {
  const { status } = req.body as { status: string }
  const allowed = ['in_progress', 'cancelled']
  if (!status || !allowed.includes(status)) {
    return res.status(400).json({ message: `status must be one of: ${allowed.join(', ')}` })
  }

  const order = await DeliveryOrder.findOne({ _id: req.params['id'], tenantId: req.tenant!._id })
  if (!order) return res.status(404).json({ message: 'Order not found' })
  if (order.status === 'completed') {
    return res.status(400).json({ message: 'Completed orders cannot be updated.' })
  }

  order.status = status as 'in_progress' | 'cancelled'
  await order.save()
  return res.json({ id: order._id, status: order.status })
}

/**
 * Called by the mobile app when the operator has scanned all items and submits.
 * Accepts scanned EPCs per line item, generates the EPCIS XML, and marks the order complete.
 */
export const completeDeliveryOrder = async (req: Request, res: Response) => {
  const order = await DeliveryOrder.findOne({ _id: req.params['id'], tenantId: req.tenant!._id })
  if (!order) return res.status(404).json({ message: 'Order not found' })
  if (order.status === 'completed') {
    return res.status(400).json({ message: 'Order is already completed.' })
  }
  if (order.status === 'cancelled') {
    return res.status(400).json({ message: 'Cancelled orders cannot be completed.' })
  }

  // Apply scanned EPCs from request body
  const scannedItems = req.body.items as Array<{ lineNumber: string; scannedEpcs: string[]; sourceBin?: string; destinationBin?: string }> | undefined
  if (scannedItems && Array.isArray(scannedItems)) {
    for (const scanned of scannedItems) {
      const item = order.items.find(i => i.lineNumber === scanned.lineNumber)
      if (item) {
        item.scannedEpcs = scanned.scannedEpcs ?? []
        if (scanned.sourceBin !== undefined && scanned.sourceBin !== '') {
          item.sourceBin = scanned.sourceBin
        }
        if (scanned.destinationBin !== undefined && scanned.destinationBin !== '') {
          item.destinationBin = scanned.destinationBin
        }
      }
    }
  }

  const epcisContent = generateEpcisXml(order)
  const now = new Date()

  order.epcisContent = epcisContent
  order.epcisGeneratedAt = now
  order.completedAt = now
  order.status = 'completed'
  await order.save()

  return res.json({
    id: order._id,
    status: order.status,
    epcisGeneratedAt: order.epcisGeneratedAt,
  })
}

/**
 * Download the EPCIS XML for a completed order.
 */
export const downloadEpcis = async (req: Request, res: Response) => {
  const order = await DeliveryOrder.findOne(
    { _id: req.params['id'], tenantId: req.tenant!._id },
    { epcisContent: 1, orderNumber: 1, status: 1 }
  )
  if (!order) return res.status(404).json({ message: 'Order not found' })
  if (!order.epcisContent) {
    return res.status(404).json({ message: 'EPCIS file not yet generated for this order.' })
  }

  const filename = `EPCIS_${order.orderNumber}_${order.id}.xml`
  res.setHeader('Content-Type', 'application/xml')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  return res.send(order.epcisContent)
}
