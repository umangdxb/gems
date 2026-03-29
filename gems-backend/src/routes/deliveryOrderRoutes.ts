import { Router } from 'express'
import multer from 'multer'
import { authenticateJWT } from '../middleware/authenticateJWT'
import {
  importDeliveryOrders,
  listDeliveryOrders,
  getDeliveryOrder,
  updateDeliveryOrderStatus,
  completeDeliveryOrder,
  downloadEpcis,
} from '../controllers/deliveryOrderController'

const router = Router()
const upload = multer({ storage: multer.memoryStorage() })

// Web admin routes
router.post('/import', authenticateJWT, upload.single('file'), importDeliveryOrders)
router.get('/', authenticateJWT, listDeliveryOrders)
router.get('/:id', authenticateJWT, getDeliveryOrder)
router.get('/:id/epcis', authenticateJWT, downloadEpcis)

// Mobile app routes
router.patch('/:id/status', authenticateJWT, updateDeliveryOrderStatus)
router.post('/:id/complete', authenticateJWT, completeDeliveryOrder)

export default router
