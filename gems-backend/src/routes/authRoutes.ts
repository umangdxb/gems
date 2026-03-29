import { Router } from 'express'
import { register, login, me } from '../controllers/authController'
import { authenticateJWT } from '../middleware/authenticateJWT'

const router = Router()

router.post('/register', register)
router.post('/login', login)
router.get('/me', authenticateJWT, me)

export default router
