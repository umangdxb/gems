import { Schema, model, Document, Types } from 'mongoose'

export type SourceFormat = 'csv' | 'excel' | 'json'

export interface IIntegrationMapping extends Document {
  tenantId: Types.ObjectId
  name: string              // human-readable name, e.g. "SAP EWM WarehouseTask"
  sourceFormat: SourceFormat
  arrayRootPath?: string    // JSON only: dot-path to the records array, e.g. "value"
  fieldMappings: Array<{
    sourceField: string     // key in the source record, e.g. "WarehouseTask"
    targetField: string     // Order model field, e.g. "orderNum"
  }>
}

const integrationMappingSchema = new Schema<IIntegrationMapping>({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
  name: { type: String, required: true },
  sourceFormat: { type: String, enum: ['csv', 'excel', 'json'], required: true },
  arrayRootPath: { type: String },
  fieldMappings: [
    {
      sourceField: { type: String, required: true },
      targetField: { type: String, required: true },
    },
  ],
}, { timestamps: true })

export const IntegrationMapping = model<IIntegrationMapping>('IntegrationMapping', integrationMappingSchema)
