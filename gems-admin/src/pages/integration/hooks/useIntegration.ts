import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Job, JobsResponse } from '../types'

function normalise(raw: Record<string, unknown>): Job {
  return {
    id: String(raw['_id'] ?? raw['jobId'] ?? raw['id'] ?? ''),
    filename: String(raw['filename'] ?? ''),
    uploadedAt: String(raw['createdAt'] ?? raw['uploadedAt'] ?? new Date().toISOString()),
    status: (raw['status'] as Job['status']) ?? 'pending',
    rowCount: Number(raw['rowCount'] ?? 0),
    error: raw['error'] ? String(raw['error']) : undefined,
    processedAt: raw['processedAt'] ? String(raw['processedAt']) : undefined,
  }
}

export function useIntegration() {
  const queryClient = useQueryClient()

  const { data, isLoading, isError } = useQuery<JobsResponse>({
    queryKey: ['import-jobs'],
    queryFn: async () => {
      const res = await api.get<{ jobs: Record<string, unknown>[]; total: number; page: number; limit: number }>(
        '/orders/jobs'
      )
      return {
        jobs: res.jobs.map(normalise),
        total: res.total,
        page: res.page,
        limit: res.limit,
      }
    },
    staleTime: 30_000,
  })

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['import-jobs'] })
  }

  return {
    jobs: data?.jobs ?? [],
    isLoading,
    isError,
    invalidate,
  }
}
