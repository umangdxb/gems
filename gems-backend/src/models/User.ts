import { Schema, model, Document, Types } from 'mongoose'

export type UserRole = 'admin' | 'operator'

export interface IUser extends Document {
  email: string
  passwordHash: string
  name: string
  role: UserRole
  isActive: boolean
  tenantId: Types.ObjectId
  createdAt: Date
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, lowercase: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true },
    role: { type: String, enum: ['admin', 'operator'], default: 'operator' },
    isActive: { type: Boolean, default: true },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
  },
  { timestamps: true }
)

userSchema.index({ email: 1, tenantId: 1 }, { unique: true })

export const User = model<IUser>('User', userSchema)
