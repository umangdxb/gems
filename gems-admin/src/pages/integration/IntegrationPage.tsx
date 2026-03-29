import { useState } from 'react'
import { Plus, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { JobList } from './components/JobList'
import { UploadWizard } from './components/UploadWizard'
import { useIntegration } from './hooks/useIntegration'

export function IntegrationPage() {
  const { jobs, isLoading, isError, invalidate } = useIntegration()
  const [wizardOpen, setWizardOpen] = useState(false)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Integration</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Upload order files, map fields, and manage processing jobs.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={invalidate} title="Refresh">
            <RotateCcw className="size-4" />
          </Button>
          <Button onClick={() => setWizardOpen(true)}>
            <Plus className="size-4 mr-2" /> New Upload
          </Button>
        </div>
      </div>

      <JobList
        jobs={jobs}
        isLoading={isLoading}
        isError={isError}
        onRefresh={invalidate}
      />

      <UploadWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        onImported={invalidate}
      />
    </div>
  )
}
