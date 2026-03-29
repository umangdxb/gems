import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { User } from '../models/User'

export const listUsers = async (req: Request, res: Response) => {
  const tenantId = req.tenant!._id

  const users = await User.find({ tenantId }).select('-passwordHash').sort({ createdAt: 1 })
  res.json(users)
}

export const createUser = async (req: Request, res: Response) => {
  const { email, name, password, role = 'operator' } = req.body
  const tenantId = req.tenant!._id

  if (!email || !name || !password) {
    return res.status(400).json({ message: 'email, name, and password are required' })
  }
  if (!['admin', 'operator'].includes(role)) {
    return res.status(400).json({ message: 'role must be admin or operator' })
  }

  const existing = await User.findOne({ email: email.toLowerCase(), tenantId })
  if (existing) {
    return res.status(409).json({ message: 'Email already in use' })
  }

  const passwordHash = await bcrypt.hash(password, 12)
  const user = await User.create({ email, name, passwordHash, role, tenantId })

  res.status(201).json({
    id: user._id,
    email: user.email,
    name: user.name,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
  })
}

export const updateUser = async (req: Request, res: Response) => {
  const id = req.params['id'] as string
  const tenantId = req.tenant!._id
  const { name, role, password } = req.body

  const user = await User.findOne({ _id: id, tenantId })
  if (!user) {
    return res.status(404).json({ message: 'User not found' })
  }

  if (name) user.name = name
  if (role) {
    if (!['admin', 'operator'].includes(role)) {
      return res.status(400).json({ message: 'role must be admin or operator' })
    }
    user.role = role
  }
  if (password) {
    user.passwordHash = await bcrypt.hash(password, 12)
  }

  await user.save()

  res.json({
    id: user._id,
    email: user.email,
    name: user.name,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
  })
}

export const activateUser = async (req: Request, res: Response) => {
  const id = req.params['id'] as string
  const tenantId = req.tenant!._id

  const user = await User.findOne({ _id: id, tenantId })
  if (!user) {
    return res.status(404).json({ message: 'User not found' })
  }
  if (user.isActive) {
    return res.status(400).json({ message: 'User is already active' })
  }

  user.isActive = true
  await user.save()

  res.json({
    id: user._id,
    email: user.email,
    name: user.name,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
  })
}

export const deactivateUser = async (req: Request, res: Response) => {
  const id = req.params['id'] as string
  const tenantId = req.tenant!._id

  const user = await User.findOne({ _id: id, tenantId })
  if (!user) {
    return res.status(404).json({ message: 'User not found' })
  }

  if (user._id.toString() === req.user!._id.toString()) {
    return res.status(400).json({ message: 'Cannot deactivate your own account' })
  }

  await User.findByIdAndUpdate(id, { isActive: false })
  res.status(204).send()
}
