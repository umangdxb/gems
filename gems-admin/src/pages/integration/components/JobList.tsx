import { Loader2, RotateCcw, AlertCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Job, JobStatus } from '../types'

interface Props {
  jobs: Job[]
  isLoading: boolean
  isError: boolean
  onRefresh: () => void
}

function StatusBadge({ status }: { status: JobStatus }) {
  const map: Record<JobStatus, { label: string; className: string; icon?: React.ReactNode }> = {
    pending: { label: 'Pending', className: 'bg-secondary text-secondary-foreground' },
    processing: {
      label: 'Processing',
      className: 'bg-blue-100 text-blue-700',
      icon: <Loader2 className="size-3 animate-spin" />,
    },
    done: { label: 'Done', className: 'bg-green-100 text-green-700' },
    failed: { label: 'Failed', className: 'bg-red-100 text-red-700' },
  }
  const { label, className, icon } = map[status]
  return (
    <Badge className={`gap-1 ${className}`} variant="outline">
      {icon}
      {label}
    </Badge>
  )
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso))
}


export function JobList({ jobs, isLoading, isError, onRefresh }: Props) {
  if (isLoading) {
    return (
      <div className="rounded-md border divide-y">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-10 ml-auto" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-8 w-24" />
          </div>
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-md border border-dashed p-12 text-center space-y-3">
        <AlertCircle className="size-8 text-muted-foreground mx-auto" />
        <p className="text-sm text-muted-foreground">Failed to load jobs.</p>
        <Button variant="outline" size="sm" onClick={onRefresh}>
          <RotateCcw className="size-3.5 mr-1" /> Retry
        </Button>
      </div>
    )
  }

  if (jobs.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-12 text-center text-muted-foreground">
        No jobs yet. Click <strong>New Upload</strong> to get started.
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>File</TableHead>
            <TableHead className="text-right">Rows</TableHead>
            <TableHead>Uploaded</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs.map(job => (
            <TableRow key={job.id}>
              <TableCell className="font-medium max-w-[200px] truncate" title={job.filename}>
                {job.filename}
              </TableCell>
              <TableCell className="text-right tabular-nums">{job.rowCount}</TableCell>
              <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                {formatDate(job.uploadedAt)}
              </TableCell>
              <TableCell>
                <StatusBadge status={job.status} />
                {job.error && (
                  <p className="text-xs text-destructive mt-0.5 max-w-[160px] truncate" title={job.error}>
                    {job.error}
                  </p>
                )}
              </TableCell>
              <TableCell className="text-right">
                {job.status === 'processing' && (
                  <span className="text-sm text-muted-foreground">In progress…</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
