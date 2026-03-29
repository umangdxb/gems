import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const schema = z.object({
  orgName: z.string().min(2, 'Organisation name must be at least 2 characters'),
  adminEmail: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

export type OrgDetailsValues = z.infer<typeof schema>

interface Props {
  defaultValues?: Partial<OrgDetailsValues>
  onNext: (values: OrgDetailsValues) => void
}

export function Step1OrgDetails({ defaultValues, onNext }: Props) {
  const { register, handleSubmit, formState: { errors } } = useForm<OrgDetailsValues>({
    resolver: zodResolver(schema),
    defaultValues,
  })

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="orgName">Organisation Name</Label>
        <Input id="orgName" placeholder="Acme Corp" {...register('orgName')} />
        {errors.orgName && <p className="text-sm text-destructive">{errors.orgName.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="adminEmail">Admin Email</Label>
        <Input id="adminEmail" type="email" placeholder="admin@acme.com" {...register('adminEmail')} />
        <p className="text-xs text-muted-foreground">This will be the primary admin account for your organisation.</p>
        {errors.adminEmail && <p className="text-sm text-destructive">{errors.adminEmail.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" autoComplete="new-password" {...register('password')} />
          {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <Input id="confirmPassword" type="password" autoComplete="new-password" {...register('confirmPassword')} />
          {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>}
        </div>
      </div>

      <Button type="submit" className="w-full">Continue →</Button>
    </form>
  )
}
