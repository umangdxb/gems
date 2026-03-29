import { Schema, model, Document, Types } from 'mongoose'

export type JobStatus = 'pending' | 'processing' | 'done' | 'failed'

export interface IImportJob extends Document {
  tenantId: Types.ObjectId
  status: JobStatus
  rowCount: number
  filename: string
  processedAt?: Date
  error?: string
  createdAt: Date
}

const importJobSchema = new Schema<IImportJob>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    status: { type: String, enum: ['pending', 'processing', 'done', 'failed'], default: 'pending' },
    rowCount: { type: Number, default: 0 },
    filename: { type: String, required: true },
    processedAt: { type: Date },
    error: { type: String },
  },
  { timestamps: true }
)

export const ImportJob = model<IImportJob>('ImportJob', importJobSchema)
