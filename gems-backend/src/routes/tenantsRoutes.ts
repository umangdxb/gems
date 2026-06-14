import { Router } from 'express'
import multer from 'multer'
import { getBranding, upsertBranding } from '../controllers/tenantBrandingController'
import { getMasterConfig, upsertMasterConfig } from '../controllers/masterConfigController'
import { authenticateJWT } from '../middleware/authenticateJWT'

const router = Router()
const upload = multer({ storage: multer.memoryStorage() })

router.get('/:tenantId/branding', authenticateJWT, getBranding)
router.post('/:tenantId/branding', authenticateJWT, upload.single('logo'), upsertBranding)

router.get('/:tenantId/master-config', authenticateJWT, getMasterConfig)
router.put('/:tenantId/master-config', authenticateJWT, upsertMasterConfig)

export default router
