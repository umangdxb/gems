import { Request, Response, NextFunction } from 'express'
import { Tenant } from '../models/Tenant'

export const authenticateTenant = async (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'] as string

  if (!apiKey) {
    return res.status(401).json({ message: 'API Key is required' })
  }

  const tenant = await Tenant.findOne({ apiKey })

  if (!tenant) {
    return res.status(403).json({ message: 'Invalid API Key' })
  }

  req.tenant = tenant
  next()
}
