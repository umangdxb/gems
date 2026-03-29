import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { User } from '../models/User'
import { Tenant } from '../models/Tenant'

export interface JWTPayload {
  userId: string
  tenantId: string
  role: string
}

export const authenticateJWT = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization']
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    return res.status(401).json({ message: 'Authorization token required' })
  }

  try {
    const payload = jwt.verify(token, process.env['JWT_SECRET']!) as JWTPayload
    const [user, tenant] = await Promise.all([
      User.findById(payload.userId),
      Tenant.findById(payload.tenantId),
    ])

    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'User not found or inactive' })
    }
    if (!tenant) {
      return res.status(401).json({ message: 'Tenant not found' })
    }

    req.user = user
    req.tenant = tenant
    next()
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' })
  }
}

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' })
  }
  next()
}
