import { Router } from 'express'
import { listUsers, createUser, updateUser, activateUser, deactivateUser } from '../controllers/userController'
import { authenticateJWT, requireAdmin } from '../middleware/authenticateJWT'

const router = Router()

router.use(authenticateJWT)

router.get('/', requireAdmin, listUsers)
router.post('/', requireAdmin, createUser)
router.patch('/:id', requireAdmin, updateUser)
router.patch('/:id/activate', requireAdmin, activateUser)
router.delete('/:id', requireAdmin, deactivateUser)

export default router
