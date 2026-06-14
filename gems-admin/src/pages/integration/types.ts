export type JobStatus = 'pending' | 'processing' | 'done' | 'failed'

export interface MappingConfig {
  orderNumber: string | null      // maps to backend field: orderNum  (required)
  material: string | null         // maps to backend field: material  (required)
  batch: string | null            // maps to backend field: batch
  sourceBin: string | null        // maps to backend field: bin
  quantity: string | null         // maps to backend field: qty
  destinationBin: string | null   // maps to backend field: destinationBin
  warehouse: string | null        // maps to backend field: warehouse
  deliveryRef: string | null      // maps to backend field: deliveryRef
  processType: string | null      // maps to backend field: processType (operational key)
  confirmedAt: string | null      // maps to backend field: confirmedAt
  defaultValues: Record<string, string>  // targetField → fallback when source value is missing
}

/** All MappingConfig keys that represent source field selectors (excludes defaultValues) */
export type MappingFieldKey = Exclude<keyof MappingConfig, 'defaultValues'>

export interface ParsedFile {
  /** All field keys extracted from the first record */
  headers: string[]
  /** Normalised rows (extracted from root array or OData `value` wrapper) */
  rows: Record<string, unknown>[]
  /** Sample values for the first record — shown alongside field names in the mapping UI */
  sampleValues: Record<string, string>
  /**
   * The key used to unwrap the records array from the root JSON object.
   * e.g. "value" for SAP OData responses like { "value": [...] }
   * undefined if the root was already an array.
   * Stored in IntegrationMapping so future API imports can unwrap the same envelope.
   */
  arrayRootPath?: string
  rawFile: File
}

export interface Job {
  id: string
  filename: string
  uploadedAt: string   // ISO string (maps to createdAt from backend)
  status: JobStatus
  rowCount: number
  error?: string
  processedAt?: string
}

export interface JobsResponse {
  jobs: Job[]
  total: number
  page: number
  limit: number
}

export type OrderType = 'picking' | 'packing' | 'commissioning' | 'decommissioning' | 'shipping' | 'receiving'

/**
 * Per-process-type decision made by the user in the Resolve step.
 * 'skip' means explicitly exclude those deliveries from this import.
 */
export type ProcessTypeResolution = Record<string, OrderType | 'skip'>

/** Saved field mapping stored per tenant in the backend */
export interface SavedMapping {
  _id: string
  name: string
  sourceFormat: 'json' | 'csv' | 'excel'
  arrayRootPath?: string
  fieldMappings: Array<{ sourceField: string; targetField: string }>
  createdAt?: string
}

/** Maps UI MappingConfig keys → internal Order field names (same as backend UI_KEY_TO_FIELD) */
export const UI_KEY_TO_TARGET: Record<MappingFieldKey, string> = {
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

/** Reverse: internal Order field names → UI MappingConfig keys */
export const TARGET_TO_UI_KEY: Record<string, MappingFieldKey> = {
  orderNum: 'orderNumber',
  material: 'material',
  batch: 'batch',
  bin: 'sourceBin',
  qty: 'quantity',
  destinationBin: 'destinationBin',
  warehouse: 'warehouse',
  deliveryRef: 'deliveryRef',
  processType: 'processType',
  confirmedAt: 'confirmedAt',
}
