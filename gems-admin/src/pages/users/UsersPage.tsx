import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, MoreHorizontal, Pencil, UserX, UserCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import { CreateUserDialog, EditUserDialog } from './components/UserFormDialog'
import type { ApiUser, CreateUserPayload, UpdateUserPayload } from './types'
import type { CreateValues, EditValues } from './components/UserFormDialog'
import { useAuth } from '@/context/AuthContext'

function formatDate(iso: string) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(iso))
}

function RoleBadge({ role }: { role: ApiUser['role'] }) {
  return (
    <Badge variant="outline" className={role === 'admin' ? 'border-primary text-primary' : ''}>
      {role === 'admin' ? 'Admin' : 'Operator'}
    </Badge>
  )
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <Badge
      variant="outline"
      className={isActive ? 'border-green-500 text-green-600' : 'border-muted-foreground/40 text-muted-foreground'}
    >
      {isActive ? 'Active' : 'Inactive'}
    </Badge>
  )
}

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 4 }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: 5 }).map((_, j) => (
            <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
}

export function UsersPage() {
  const qc = useQueryClient()
  const { user: currentUser } = useAuth()
  const [createOpen, setCreateOpen] = useState(false)
  const [editUser, setEditUser] = useState<ApiUser | null>(null)

  // ── Queries ─────────────────────────────────────────────────────
  const { data: users = [], isLoading, isError } = useQuery<ApiUser[]>({
    queryKey: ['users'],
    queryFn: () => api.get<ApiUser[]>('/users'),
  })

  // ── Mutations ────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (payload: CreateUserPayload) => api.post<ApiUser>('/users', payload),
    onSuccess: (newUser) => {
      qc.invalidateQueries({ queryKey: ['users'] })
      toast.success(`${newUser.name} has been added.`)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateUserPayload }) =>
      api.patch<ApiUser>(`/users/${id}`, payload),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['users'] })
      toast.success(`${updated.name} has been updated.`)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => api.delete<void>(`/users/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      toast.success('User deactivated.')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const reactivateMutation = useMutation({
    mutationFn: (id: string) => api.patch<ApiUser>(`/users/${id}/activate`, {}),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['users'] })
      toast.success(`${updated.name} has been reactivated.`)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  // ── Handlers ─────────────────────────────────────────────────────
  async function handleCreate(values: CreateValues) {
    await createMutation.mutateAsync(values)
  }

  async function handleEdit(id: string, values: EditValues) {
    const payload: UpdateUserPayload = { name: values.name, role: values.role }
    if (values.password) payload.password = values.password
    await updateMutation.mutateAsync({ id, payload })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage who has access to this organisation.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4 mr-2" /> Add User
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Added</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableSkeleton />}

            {isError && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                  Failed to load users. Check your connection and try again.
                </TableCell>
              </TableRow>
            )}

            {!isLoading && !isError && users.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                  No users yet. Click <strong>Add User</strong> to get started.
                </TableCell>
              </TableRow>
            )}

            {users.map(u => (
              <TableRow key={u._id} className={!u.isActive ? 'opacity-50' : ''}>
                <TableCell className="font-medium">{u.name}</TableCell>
                <TableCell className="text-muted-foreground">{u.email}</TableCell>
                <TableCell><RoleBadge role={u.role} /></TableCell>
                <TableCell><StatusBadge isActive={u.isActive} /></TableCell>
                <TableCell className="text-muted-foreground text-sm">{formatDate(u.createdAt)}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="size-8" />}>
                      <MoreHorizontal className="size-4" />
                      <span className="sr-only">Actions</span>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditUser(u)}>
                        <Pencil className="size-4 mr-2" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {u.isActive ? (
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          disabled={u._id === currentUser?.id}
                          onClick={() => deactivateMutation.mutate(u._id)}
                        >
                          <UserX className="size-4 mr-2" /> Deactivate
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => reactivateMutation.mutate(u._id)}>
                          <UserCheck className="size-4 mr-2" /> Reactivate
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <CreateUserDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreate}
      />

      <EditUserDialog
        open={!!editUser}
        onOpenChange={open => { if (!open) setEditUser(null) }}
        user={editUser}
        onSubmit={handleEdit}
      />
    </div>
  )
}
