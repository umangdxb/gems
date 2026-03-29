import { Router } from 'express'
import multer from 'multer'
import {
  listOrders,
  getOrder,
  updateOrderStatus,
  importOrders,
  listImportJobs,
  getJobStatus,
  exportOrders,
  createIntegrationMapping,
  getIntegrationMappings,
  deleteIntegrationMapping,
} from '../controllers/orderController'
import { authenticateJWT } from '../middleware/authenticateJWT'
import { authenticateTenant } from '../middleware/authenticateTenant'

const router = Router()
const upload = multer({ storage: multer.memoryStorage() })

// JWT-protected routes (web + mobile)
router.get('/', authenticateJWT, listOrders)
router.get('/export', authenticateJWT, exportOrders)
router.get('/jobs', authenticateJWT, listImportJobs)
router.get('/jobs/:jobId', authenticateJWT, getJobStatus)
router.get('/mappings', authenticateJWT, getIntegrationMappings)
router.post('/mappings', authenticateJWT, createIntegrationMapping)
router.delete('/mappings/:id', authenticateJWT, deleteIntegrationMapping)
router.post('/import', authenticateJWT, upload.single('file'), importOrders)
router.get('/:id', authenticateJWT, getOrder)
router.patch('/:id/status', authenticateJWT, updateOrderStatus)

// API-key-protected route (server-to-server integration)
router.post('/import/apikey', authenticateTenant, upload.single('file'), importOrders)

export default router
