import { Router } from 'express'
import multer from 'multer'
import { getBranding, upsertBranding } from '../controllers/tenantBrandingController'
import { authenticateJWT } from '../middleware/authenticateJWT'

const router = Router()
const upload = multer({ storage: multer.memoryStorage() })

router.get('/:tenantId/branding', authenticateJWT, getBranding)
router.post('/:tenantId/branding', authenticateJWT, upload.single('logo'), upsertBranding)

export default router
