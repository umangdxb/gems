import type { ITenant } from '../models/Tenant'
import type { IUser } from '../models/User'

declare global {
  namespace Express {
    interface Request {
      tenant?: ITenant
      user?: IUser
    }
  }
}
