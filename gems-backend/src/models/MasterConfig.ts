import { Schema, model, Document, Types } from 'mongoose'

export const VALID_ACTIONS = [
  'picking',
  'packing',
  'commissioning',
  'decommissioning',
  'shipping',
  'receiving',
] as const

export type Action = typeof VALID_ACTIONS[number]

interface IValueMapping {
  sourceValue: string
  action: Action
}

export interface IOperationalKey {
  fieldName: string
  label: string
  valueMappings: IValueMapping[]
}

export interface IMasterConfig extends Document {
  tenantId: Types.ObjectId
  operationalKeys: IOperationalKey[]
}

const valueMappingSchema = new Schema<IValueMapping>(
  {
    sourceValue: { type: String, required: true },
    action: { type: String, enum: VALID_ACTIONS, required: true },
  },
  { _id: false }
)

const operationalKeySchema = new Schema<IOperationalKey>(
  {
    fieldName: { type: String, required: true },
    label: { type: String, required: true },
    valueMappings: [valueMappingSchema],
  },
  { _id: false }
)

const masterConfigSchema = new Schema<IMasterConfig>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, unique: true },
    operationalKeys: [operationalKeySchema],
  },
  { timestamps: true }
)

export const MasterConfig = model<IMasterConfig>('MasterConfig', masterConfigSchema)
