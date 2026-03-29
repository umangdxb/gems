import { Schema, model, Document } from 'mongoose'
import { v4 as uuidv4 } from 'uuid'

export interface ITenant extends Document {
  name: string
  primaryColor?: string
  secondaryColor?: string
  logo1?: string
  logo2?: string
  apiKey: string
}

const tenantSchema = new Schema<ITenant>({
  name: { type: String, required: true },
  primaryColor: { type: String },
  secondaryColor: { type: String },
  logo1: { type: String },
  logo2: { type: String },
  apiKey: { type: String, required: true, unique: true, default: () => uuidv4() },
})

export const Tenant = model<ITenant>('Tenant', tenantSchema)
