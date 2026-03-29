import { Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'
import { Tenant } from '../models/Tenant'
import { TenantBranding } from '../models/TenantBranding'
import { uploadFile } from '../services/storageService'

const DEFAULT_BRANDING = {
  primaryColor: '#2563eb',
  secondaryColor: '#f1f5f9',
  logoUrl: null,
}

export const getBranding = async (req: Request, res: Response) => {
  const { tenantId } = req.params as { tenantId: string }

  const tenant = await Tenant.findById(tenantId)
  if (!tenant) {
    return res.status(404).json({ message: 'Tenant not found' })
  }

  const branding = await TenantBranding.findOne({ tenantId })

  return res.status(200).json({
    tenantId,
    tenantName: tenant.name,
    primaryColor: branding?.primaryColor ?? DEFAULT_BRANDING.primaryColor,
    secondaryColor: branding?.secondaryColor ?? DEFAULT_BRANDING.secondaryColor,
    logoUrl: branding?.logoUrl ?? DEFAULT_BRANDING.logoUrl,
  })
}

const HEX_COLOR_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/
const ALLOWED_MIMETYPES = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
const MAX_SIZE_BYTES = 2 * 1024 * 1024 // 2 MB

export const upsertBranding = async (req: Request, res: Response) => {
  const { tenantId } = req.params as { tenantId: string }
  const { primaryColor, secondaryColor } = req.body

  // Ownership check — JWT tenantId must match the URL param
  if (req.user!.tenantId.toString() !== tenantId) {
    return res.status(403).json({ message: 'Forbidden: you can only update your own tenant branding' })
  }

  // Validate colors
  const errors: Record<string, string> = {}
  if (!primaryColor || !HEX_COLOR_RE.test(primaryColor)) {
    errors['primaryColor'] = 'Must be a valid hex color (e.g. #2563eb)'
  }
  if (!secondaryColor || !HEX_COLOR_RE.test(secondaryColor)) {
    errors['secondaryColor'] = 'Must be a valid hex color (e.g. #2563eb)'
  }
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ message: 'Validation failed', errors })
  }

  // Validate file if present
  if (req.file) {
    if (!ALLOWED_MIMETYPES.includes(req.file.mimetype)) {
      return res.status(400).json({
        message: 'Invalid file type. Allowed: image/png, image/jpeg, image/svg+xml, image/webp',
      })
    }
    if (req.file.size > MAX_SIZE_BYTES) {
      return res.status(400).json({ message: 'Logo file must be 2 MB or smaller' })
    }
  }

  const tenant = await Tenant.findById(tenantId)
  if (!tenant) {
    return res.status(404).json({ message: 'Tenant not found' })
  }

  // Upload logo if provided
  let logoUrl: string | null = null
  if (req.file) {
    const ext = path.extname(req.file.originalname) || `.${req.file.mimetype.split('/')[1]}`
    const filename = `${tenantId}-${uuidv4()}${ext}`
    logoUrl = await uploadFile(req.file.buffer, filename, req.file.mimetype)
  }

  // Upsert branding record
  const updateData: Record<string, unknown> = { primaryColor, secondaryColor }
  if (logoUrl !== null) {
    updateData['logoUrl'] = logoUrl
  } else if (!req.file && req.body.removeLogo === 'true') {
    updateData['logoUrl'] = null
  }

  const branding = await TenantBranding.findOneAndUpdate(
    { tenantId },
    { $set: updateData },
    { new: true, upsert: true }
  )

  return res.status(200).json({
    tenantId: branding.tenantId.toString(),
    primaryColor: branding.primaryColor,
    secondaryColor: branding.secondaryColor,
    logoUrl: branding.logoUrl,
  })
}
