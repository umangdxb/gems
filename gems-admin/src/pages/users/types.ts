export interface ApiUser {
  _id: string
  email: string
  name: string
  role: 'admin' | 'operator'
  isActive: boolean
  createdAt: string
}

export interface CreateUserPayload {
  email: string
  name: string
  password: string
  role: 'admin' | 'operator'
}

export interface UpdateUserPayload {
  name?: string
  role?: 'admin' | 'operator'
  password?: string
}
