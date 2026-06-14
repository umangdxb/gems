import { Request, Response } from 'express'
import { Order } from '../models/Order'
import { IntegrationMapping } from '../models/IntegrationMapping'
import { ImportJob } from '../models/ImportJob'
import { MasterConfig } from '../models/MasterConfig'
import { parseFile } from '../services/fileParserService'

const ALLOWED_STATUSES = ['pending', 'scanned', 'processed']
const NUMERIC_FIELDS = new Set(['qty'])
const DATE_FIELDS = new Set(['confirmedAt'])

const SAP_STATUS_MAP: Record<string, string> = {
  C: 'processed',
  E: 'processed',
  A: 'pending',
  '': 'pending',
}

// Maps the standardised action names (stored in MasterConfig) to EPCIS bizStep URIs.
const ACTION_TO_BIZSTEP: Record<string, string> = {
  picking: 'urn:epcglobal:cbv:bizstep:picking',
  packing: 'urn:epcglobal:cbv:bizstep:packing',
  commissioning: 'urn:epcglobal:cbv:bizstep:commissioning',
  decommissioning: 'urn:epcglobal:cbv:bizstep:decommissioning',
  shipping: 'urn:epcglobal:cbv:bizstep:shipping',
  receiving: 'urn:epcglobal:cbv:bizstep:receiving',
}
const DEFAULT_BIZSTEP = 'urn:epcglobal:cbv:bizstep:picking'

// ─── UI MappingConfig keys → internal Order field names ──────────────────────
const UI_KEY_TO_FIELD: Record<string, string> = {
  orderNumber: 'orderNum',
  material: 'material',
  batch: 'batch',
  sourceBin: 'bin',
  quantity: 'qty',
  destinationBin: 'destinationBin',
  warehouse: 'warehouse',
  deliveryRef: 'deliveryRef',
  processType: 'processType',
  confirmedAt: 'confirmedAt',
}

// ─────────────────────────────────────────────────────────────────────────────

export const listOrders = async (req: Request, res: Response) => {
  const tenantId = req.tenant!._id
  const status = req.query['status'] as string | undefined
  const page = Math.max(1, parseInt(req.query['page'] as string) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(req.query['limit'] as string) || 20))

  const filter: Record<string, unknown> = { tenantId }
  if (status && ALLOWED_STATUSES.includes(status)) {
    filter['status'] = status
  }

  const [orders, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Order.countDocuments(filter),
  ])

  res.json({ orders, total, page, limit })
}

export const getOrder = async (req: Request, res: Response) => {
  const id = req.params['id'] as string
  const order = await Order.findOne({ _id: id, tenantId: req.tenant!._id })
  if (!order) return res.status(404).json({ message: 'Order not found' })
  res.json(order)
}

export const updateOrderStatus = async (req: Request, res: Response) => {
  const id = req.params['id'] as string
  const { status } = req.body

  if (!status || !ALLOWED_STATUSES.includes(status)) {
    return res.status(400).json({ message: `status must be one of: ${ALLOWED_STATUSES.join(', ')}` })
  }

  const order = await Order.findOneAndUpdate(
    { _id: id, tenantId: req.tenant!._id },
    { status },
    { new: true }
  )
  if (!order) return res.status(404).json({ message: 'Order not found' })
  res.json(order)
}

// ─── Import ───────────────────────────────────────────────────────────────────

export const importOrders = async (req: Request, res: Response) => {
  const tenant = req.tenant!

  if (!req.file) {
    return res.status(400).json({ message: 'A file is required (field name: file)' })
  }

  // Resolve field mappings — inline MappingConfig takes priority over saved mapping
  let fieldMappings: Array<{ sourceField: string; targetField: string }> = []
  let arrayRootPath: string | undefined

  let defaultValues: Record<string, string> = {}

  if (req.body.mapping) {
    // Inline mapping sent by the UI as a JSON string
    let uiMapping: Record<string, unknown>
    try {
      uiMapping = JSON.parse(req.body.mapping as string)
    } catch {
      return res.status(400).json({ message: 'mapping must be a valid JSON string' })
    }

    // Validate: orderNumber (→ orderNum) is the only required key
    if (!uiMapping.orderNumber) {
      return res.status(400).json({ message: 'mapping.orderNumber is required' })
    }

    if (uiMapping.defaultValues && typeof uiMapping.defaultValues === 'object') {
      defaultValues = uiMapping.defaultValues as Record<string, string>
    }

    fieldMappings = Object.entries(uiMapping)
      .filter(([uiKey]) => UI_KEY_TO_FIELD[uiKey] && typeof uiMapping[uiKey] === 'string')
      .map(([uiKey, sourceField]) => ({
        sourceField: sourceField as string,
        targetField: UI_KEY_TO_FIELD[uiKey]!,
      }))
  } else {
    // Fall back to saved mapping
    const mappingId = req.query['mappingId'] as string | undefined
    const savedMapping = await (mappingId
      ? IntegrationMapping.findOne({ _id: mappingId, tenantId: tenant._id })
      : IntegrationMapping.findOne({ tenantId: tenant._id }).sort({ _id: -1 }))

    if (!savedMapping) {
      return res.status(400).json({
        message: 'Provide a mapping in the request body or create a saved mapping via POST /orders/mappings first.',
      })
    }

    fieldMappings = savedMapping.fieldMappings
    arrayRootPath = savedMapping.arrayRootPath
    defaultValues = savedMapping.defaultValues ?? {}
  }

  // Fetch master config once for the whole import batch
  const masterConfig = await MasterConfig.findOne({ tenantId: tenant._id })
  const operationalKeys = masterConfig?.operationalKeys ?? []

  // Create job record immediately so we can return jobId right away
  const job = await ImportJob.create({
    tenantId: tenant._id,
    status: 'processing',
    filename: req.file.originalname,
    rowCount: 0,
  })

  try {
    const records = await parseFile(req.file.buffer, req.file.mimetype, arrayRootPath)

    const operationalKeyWarnings: string[] = []

    const ordersToCreate = records.map((record) => {
      const order: Record<string, unknown> = {
        tenantId: tenant._id,
        status: 'pending',
        sourceData: record,
      }

      for (const { sourceField, targetField } of fieldMappings) {
        const rawValue = record[sourceField] ?? defaultValues[targetField] ?? null
        if (rawValue === undefined || rawValue === null) continue

        if (targetField === 'status') {
          order[targetField] = SAP_STATUS_MAP[String(rawValue)] ?? 'pending'
        } else if (NUMERIC_FIELDS.has(targetField)) {
          order[targetField] = Number(rawValue)
        } else if (DATE_FIELDS.has(targetField)) {
          order[targetField] = new Date(String(rawValue))
        } else {
          order[targetField] = String(rawValue)
        }

        // Validate operational key values against master config
        const opKey = operationalKeys.find(k => k.fieldName === targetField)
        if (opKey && rawValue !== null && rawValue !== undefined) {
          const hasMapping = opKey.valueMappings.some(vm => vm.sourceValue === String(rawValue))
          if (!hasMapping) {
            const warning = `No master config mapping for ${targetField}="${rawValue}"`
            if (!operationalKeyWarnings.includes(warning)) {
              operationalKeyWarnings.push(warning)
            }
          }
        }
      }

      return order
    })

    await Order.insertMany(ordersToCreate)

    await ImportJob.findByIdAndUpdate(job._id, {
      status: 'done',
      rowCount: ordersToCreate.length,
      processedAt: new Date(),
    })

    return res.status(200).json({
      jobId: job._id.toString(),
      status: 'done',
      rowCount: ordersToCreate.length,
      filename: req.file.originalname,
      ...(operationalKeyWarnings.length > 0 ? { warnings: operationalKeyWarnings } : {}),
    })
  } catch (error) {
    await ImportJob.findByIdAndUpdate(job._id, {
      status: 'failed',
      error: error instanceof Error ? error.message : String(error),
      processedAt: new Date(),
    })

    return res.status(500).json({
      jobId: job._id.toString(),
      status: 'failed',
      message: 'Error importing orders',
      error,
    })
  }
}

// ─── Job list + status polling ────────────────────────────────────────────────

export const listImportJobs = async (req: Request, res: Response) => {
  const tenantId = req.tenant!._id
  const page = Math.max(1, parseInt(req.query['page'] as string) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(req.query['limit'] as string) || 20))
  const status = req.query['status'] as string | undefined

  const filter: Record<string, unknown> = { tenantId }
  if (status && ['pending', 'processing', 'done', 'failed'].includes(status)) {
    filter['status'] = status
  }

  const [jobs, total] = await Promise.all([
    ImportJob.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    ImportJob.countDocuments(filter),
  ])

  res.json({ jobs, total, page, limit })
}

export const getJobStatus = async (req: Request, res: Response) => {
  const jobId = req.params['jobId'] as string
  const job = await ImportJob.findOne({ _id: jobId, tenantId: req.tenant!._id })
  if (!job) return res.status(404).json({ message: 'Job not found' })

  res.json({
    jobId: job._id.toString(),
    status: job.status,
    rowCount: job.rowCount,
    filename: job.filename,
    processedAt: job.processedAt,
    ...(job.error ? { error: job.error } : {}),
  })
}

// ─── Export (EPCIS XML) ───────────────────────────────────────────────────────

export const exportOrders = async (req: Request, res: Response) => {
  const tenant = req.tenant!

  try {
    const [orders, masterConfig] = await Promise.all([
      Order.find({ tenantId: tenant._id }),
      MasterConfig.findOne({ tenantId: tenant._id }),
    ])

    const processTypeKey = masterConfig?.operationalKeys.find(k => k.fieldName === 'processType')

    const events = orders.map((order) => {
      const eventTime = (order.confirmedAt ?? order.createdAt).toISOString()

      let bizStep = DEFAULT_BIZSTEP
      if (order.processType && processTypeKey) {
        const vm = processTypeKey.valueMappings.find(m => m.sourceValue === order.processType)
        if (vm) bizStep = ACTION_TO_BIZSTEP[vm.action] ?? DEFAULT_BIZSTEP
      }
      const readPointId = order.warehouse && order.bin
        ? `urn:epc:id:sgln:${order.warehouse}.00000.${order.bin}`
        : `urn:epc:id:sgln:unknown.00000.${order.bin ?? 'unknown'}`

      const epcs = order.scannedEpcs.length > 0
        ? order.scannedEpcs.map((e) => `      <epc>${e}</epc>`).join('\n')
        : `      <epc>urn:epc:id:sgtin:0000000.000000.${order.orderNum}</epc>`

      const bizTransactions = order.deliveryRef
        ? `\n      <bizTransactionList><bizTransaction type="urn:epcglobal:cbv:btt:desadv">${order.deliveryRef}</bizTransaction></bizTransactionList>`
        : ''

      return `    <ObjectEvent>
      <eventTime>${eventTime}</eventTime>
      <eventTimeZoneOffset>+00:00</eventTimeZoneOffset>
      <epcList>
${epcs}
      </epcList>
      <action>OBSERVE</action>
      <bizStep>${bizStep}</bizStep>
      <disposition>urn:epcglobal:cbv:disp:in_progress</disposition>
      <readPoint><id>${readPointId}</id></readPoint>${bizTransactions}
    </ObjectEvent>`
    })

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<epcis:EPCISDocument
  creationDate="${new Date().toISOString()}"
  schemaVersion="1.2"
  xmlns:epcis="urn:epcglobal:epcis:xsd:1">
  <EPCISBody>
    <EventList>
${events.join('\n')}
    </EventList>
  </EPCISBody>
</epcis:EPCISDocument>`

    res.setHeader('Content-Type', 'application/xml')
    res.send(xml)
  } catch (error) {
    res.status(500).json({ message: 'Error exporting orders', error })
  }
}

// ─── Saved mapping config ─────────────────────────────────────────────────────

export const createIntegrationMapping = async (req: Request, res: Response) => {
  const tenant = req.tenant!
  const { name, sourceFormat, arrayRootPath, fieldMappings, defaultValues } = req.body

  if (!name || !sourceFormat || !Array.isArray(fieldMappings) || fieldMappings.length === 0) {
    return res.status(400).json({
      message: 'name, sourceFormat, and fieldMappings (array) are required',
    })
  }

  if (!['csv', 'excel', 'json'].includes(sourceFormat)) {
    return res.status(400).json({ message: 'sourceFormat must be csv, excel, or json' })
  }

  try {
    const mapping = await IntegrationMapping.create({
      tenantId: tenant._id,
      name,
      sourceFormat,
      arrayRootPath,
      fieldMappings,
      ...(defaultValues ? { defaultValues } : {}),
    })
    res.status(201).json(mapping)
  } catch (error) {
    res.status(500).json({ message: 'Error creating mapping', error })
  }
}

export const getIntegrationMappings = async (req: Request, res: Response) => {
  const mappings = await IntegrationMapping.find({ tenantId: req.tenant!._id })
  res.json(mappings)
}

export const deleteIntegrationMapping = async (req: Request, res: Response) => {
  const id = req.params['id'] as string
  const deleted = await IntegrationMapping.findOneAndDelete({ _id: id, tenantId: req.tenant!._id })
  if (!deleted) return res.status(404).json({ message: 'Mapping not found' })
  res.status(204).send()
}
