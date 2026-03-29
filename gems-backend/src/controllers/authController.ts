import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { User } from '../models/User'
import { Tenant } from '../models/Tenant'
import { TenantBranding } from '../models/TenantBranding'

const DEFAULT_BRANDING = {
  primaryColor: '#2563eb',
  secondaryColor: '#f1f5f9',
  logoUrl: null as string | null,
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const register = async (req: Request, res: Response) => {
  const { orgName, adminEmail, password } = req.body

  // Field-level validation
  const errors: Record<string, string> = {}
  if (!orgName || typeof orgName !== 'string' || orgName.trim().length < 2) {
    errors['orgName'] = 'Organisation name must be at least 2 characters'
  }
  if (!adminEmail || !EMAIL_RE.test(adminEmail)) {
    errors['adminEmail'] = 'A valid email address is required'
  }
  if (!password || typeof password !== 'string' || password.length < 8) {
    errors['password'] = 'Password must be at least 8 characters'
  }
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ message: 'Validation failed', errors })
  }

  const email = adminEmail.toLowerCase().trim()

  const existing = await User.findOne({ email })
  if (existing) {
    return res.status(409).json({ message: 'Email already registered' })
  }

  try {
    const tenant = await Tenant.create({ name: orgName.trim() })
    const passwordHash = await bcrypt.hash(password, 12)
    const user = await User.create({
      email,
      name: orgName.trim(),
      passwordHash,
      role: 'admin',
      tenantId: tenant._id,
    })

    const token = jwt.sign(
      {
        userId: user._id.toString(),
        tenantId: tenant._id.toString(),
        role: user.role,
        email: user.email,
      },
      process.env['JWT_SECRET']!,
      { expiresIn: '7d' }
    )

    return res.status(201).json({
      tenantId: tenant._id.toString(),
      userId: user._id.toString(),
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: tenant._id,
      },
    })
  } catch (error) {
    return res.status(500).json({ message: 'Registration failed', error })
  }
}

export const me = async (req: Request, res: Response) => {
  const user = req.user!
  res.json({
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    role: user.role,
    tenantId: user.tenantId.toString(),
  })
}

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password required' })
  }

  const user = await User.findOne({ email: (email as string).toLowerCase() })
  if (!user || !user.isActive) {
    return res.status(401).json({ message: 'Invalid credentials' })
  }

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) {
    return res.status(401).json({ message: 'Invalid credentials' })
  }

  const [tenant, brandingRecord] = await Promise.all([
    Tenant.findById(user.tenantId),
    TenantBranding.findOne({ tenantId: user.tenantId }),
  ])

  if (!tenant) {
    return res.status(401).json({ message: 'Invalid credentials' })
  }

  const token = jwt.sign(
    {
      userId: user._id.toString(),
      tenantId: tenant._id.toString(),
      role: user.role,
      email: user.email,
    },
    process.env['JWT_SECRET']!,
    { expiresIn: '7d' }
  )

  res.json({
    token,
    user: {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: tenant._id,
    },
    branding: {
      tenantName: tenant.name,
      primaryColor: brandingRecord?.primaryColor ?? DEFAULT_BRANDING.primaryColor,
      secondaryColor: brandingRecord?.secondaryColor ?? DEFAULT_BRANDING.secondaryColor,
      logoUrl: brandingRecord?.logoUrl ?? DEFAULT_BRANDING.logoUrl,
    },
  })
}
