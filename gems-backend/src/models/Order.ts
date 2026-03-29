import { Schema, model, Document, Types } from 'mongoose'

export interface IOrder extends Document {
  orderNum: string
  status: string
  material: string
  batch: string
  bin: string               // source storage bin
  destinationBin?: string   // destination storage bin
  qty: number
  warehouse?: string        // e.g. EWMWarehouse
  deliveryRef?: string      // e.g. EWMDelivery — used in EPCIS bizTransaction
  processType?: string      // e.g. WarehouseProcessType — used to derive EPCIS bizStep
  confirmedAt?: Date        // e.g. WhseTaskConfUTCDateTime — used as EPCIS eventTime
  scannedEpcs: string[]     // barcodes captured via Scandit, used in EPCIS epcList
  sourceData?: Record<string, unknown> // raw inbound record, kept for audit / re-mapping
  tenantId: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const orderSchema = new Schema<IOrder>(
  {
    orderNum: { type: String, required: true },
    status: { type: String, enum: ['pending', 'scanned', 'processed'], required: true, default: 'pending' },
    material: { type: String, required: true },
    batch: { type: String, default: '' },
    bin: { type: String, required: true },
    destinationBin: { type: String },
    qty: { type: Number, required: true },
    warehouse: { type: String },
    deliveryRef: { type: String },
    processType: { type: String },
    confirmedAt: { type: Date },
    scannedEpcs: { type: [String], default: [] },
    sourceData: { type: Schema.Types.Mixed },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
  },
  { timestamps: true }
)

export const Order = model<IOrder>('Order', orderSchema)
