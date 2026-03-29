import { Router } from 'express'
import { getTenantSettings, updateTenantSettings, createTenant } from '../controllers/tenantController'
import { authenticateTenant } from '../middleware/authenticateTenant'
import { authenticateJWT } from '../middleware/authenticateJWT'

const router = Router()

router.post('/', createTenant)
router.get('/settings', authenticateTenant, getTenantSettings)
router.patch('/settings', authenticateJWT, updateTenantSettings)

export default router
