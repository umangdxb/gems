import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { ApiUser } from '../types'

// ── Schemas ──────────────────────────────────────────────────────
const createSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['admin', 'operator']),
})

const editSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.enum(['admin', 'operator']),
  password: z.string().min(8, 'Password must be at least 8 characters').or(z.literal('')),
})

type CreateValues = z.infer<typeof createSchema>
type EditValues = z.infer<typeof editSchema>

// ── Create dialog ─────────────────────────────────────────────────
interface CreateProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: CreateValues) => Promise<void>
}

export function CreateUserDialog({ open, onOpenChange, onSubmit }: CreateProps) {
  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } =
    useForm<CreateValues>({
      resolver: zodResolver(createSchema),
      defaultValues: { role: 'operator' },
    })

  useEffect(() => { if (!open) reset() }, [open, reset])

  async function handleCreate(values: CreateValues) {
    await onSubmit(values)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add User</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleCreate)} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="cu-name">Full Name</Label>
            <Input id="cu-name" placeholder="Jane Smith" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cu-email">Email</Label>
            <Input id="cu-email" type="email" placeholder="jane@acme.com" {...register('email')} />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cu-password">Password</Label>
            <Input id="cu-password" type="password" autoComplete="new-password" {...register('password')} />
            {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={watch('role')} onValueChange={v => setValue('role', v as 'admin' | 'operator')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="operator">Operator</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating…' : 'Create User'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Edit dialog ───────────────────────────────────────────────────
interface EditProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: ApiUser | null
  onSubmit: (id: string, values: EditValues) => Promise<void>
}

export function EditUserDialog({ open, onOpenChange, user, onSubmit }: EditProps) {
  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } =
    useForm<EditValues>({
      resolver: zodResolver(editSchema),
      defaultValues: { password: '' },
    })

  useEffect(() => {
    if (user) reset({ name: user.name, role: user.role, password: '' })
  }, [user, reset])

  async function handleEdit(values: EditValues) {
    if (!user) return
    await onSubmit(user._id, values)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleEdit)} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="eu-name">Full Name</Label>
            <Input id="eu-name" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-sm">Email</Label>
            <p className="text-sm">{user?.email}</p>
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={watch('role')} onValueChange={v => setValue('role', v as 'admin' | 'operator')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="operator">Operator</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="eu-password">New Password <span className="text-muted-foreground font-normal">(leave blank to keep current)</span></Label>
            <Input id="eu-password" type="password" autoComplete="new-password" placeholder="••••••••" {...register('password')} />
            {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export type { CreateValues, EditValues }
