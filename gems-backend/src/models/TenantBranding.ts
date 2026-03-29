import { Schema, model, Document, Types } from 'mongoose'

export interface ITenantBranding extends Document {
  tenantId: Types.ObjectId
  primaryColor: string
  secondaryColor: string
  logoUrl: string | null
  updatedAt: Date
}

const tenantBrandingSchema = new Schema<ITenantBranding>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, unique: true },
    primaryColor: { type: String, required: true },
    secondaryColor: { type: String, required: true },
    logoUrl: { type: String, default: null },
  },
  { timestamps: true }
)

export const TenantBranding = model<ITenantBranding>('TenantBranding', tenantBrandingSchema)
