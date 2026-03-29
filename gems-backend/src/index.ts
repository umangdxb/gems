import 'dotenv/config'
import path from 'path'
import express from 'express'
import cors from 'cors'
import { connectDB } from './db'
import authRoutes from './routes/authRoutes'
import tenantRoutes from './routes/tenantRoutes'
import tenantsRoutes from './routes/tenantsRoutes'
import orderRoutes from './routes/orderRoutes'
import deliveryOrderRoutes from './routes/deliveryOrderRoutes'
import userRoutes from './routes/userRoutes'

const app = express()
const PORT = process.env['PORT'] || 3000

// In production set CORS_ORIGIN to your frontend URL(s), comma-separated.
// Leaving it unset allows all origins (fine for local dev).
const corsOrigin = process.env['CORS_ORIGIN']
app.use(cors({
  origin: corsOrigin ? corsOrigin.split(',').map(o => o.trim()) : true,
  credentials: true,
}))
app.use(express.json())

// Serve uploaded files (local dev only; in prod files go to S3)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')))

app.use('/auth', authRoutes)
app.use('/tenant', tenantRoutes)
app.use('/tenants', tenantsRoutes)
app.use('/orders', orderRoutes)
app.use('/delivery-orders', deliveryOrderRoutes)
app.use('/users', userRoutes)

app.get('/', (_req, res) => {
  res.send('API is running')
})

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)
  })
}).catch((err) => {
  console.error('Failed to connect to MongoDB:', err)
  process.exit(1)
})
