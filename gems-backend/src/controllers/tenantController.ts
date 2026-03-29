import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { Tenant } from '../models/Tenant'
import { User } from '../models/User'

export const getTenantSettings = async (req: Request, res: Response) => {
  const tenant = req.tenant
  if (!tenant) {
    return res.status(404).json({ message: 'Tenant not found' })
  }

  res.json({
    id: tenant._id,
    name: tenant.name,
    primaryColor: tenant.primaryColor,
    secondaryColor: tenant.secondaryColor,
    logo1: tenant.logo1,
    logo2: tenant.logo2,
  })
}

export const updateTenantSettings = async (req: Request, res: Response) => {
  const tenant = req.tenant!
  const { primaryColor, secondaryColor, logo1, logo2 } = req.body

  const update: Record<string, unknown> = {}
  if (primaryColor !== undefined) update['primaryColor'] = primaryColor
  if (secondaryColor !== undefined) update['secondaryColor'] = secondaryColor
  if (logo1 !== undefined) update['logo1'] = logo1
  if (logo2 !== undefined) update['logo2'] = logo2

  const updated = await Tenant.findByIdAndUpdate(tenant._id, update, { new: true })

  res.json({
    id: updated!._id,
    name: updated!.name,
    primaryColor: updated!.primaryColor,
    secondaryColor: updated!.secondaryColor,
    logo1: updated!.logo1,
    logo2: updated!.logo2,
  })
}

export const createTenant = async (req: Request, res: Response) => {
  const { name, primaryColor, secondaryColor, logo1, logo2, adminEmail, adminName, adminPassword } = req.body

  if (!name || !primaryColor || !secondaryColor) {
    return res.status(400).json({ message: 'name, primaryColor, and secondaryColor are required' })
  }
  if (!adminEmail || !adminName || !adminPassword) {
    return res.status(400).json({ message: 'adminEmail, adminName, and adminPassword are required' })
  }

  const existing = await User.findOne({ email: adminEmail.toLowerCase() })
  if (existing) {
    return res.status(409).json({ message: 'Email already in use' })
  }

  try {
    const tenant = await Tenant.create({ name, primaryColor, secondaryColor, logo1, logo2 })
    const passwordHash = await bcrypt.hash(adminPassword, 12)
    const adminUser = await User.create({
      email: adminEmail,
      name: adminName,
      passwordHash,
      role: 'admin',
      tenantId: tenant._id,
    })

    res.status(201).json({
      id: tenant._id,
      name: tenant.name,
      apiKey: tenant.apiKey,
      primaryColor: tenant.primaryColor,
      secondaryColor: tenant.secondaryColor,
      logo1: tenant.logo1,
      logo2: tenant.logo2,
      adminUser: { id: adminUser._id, email: adminUser.email, name: adminUser.name, role: adminUser.role },
    })
  } catch (error) {
    res.status(500).json({ message: 'Error creating tenant', error })
  }
}
