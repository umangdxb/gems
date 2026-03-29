import { useRef, useState } from 'react'
import { Upload, FileCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ParsedFile } from '../../types'

interface Props {
  parsedFile: ParsedFile | null
  onParsed: (file: ParsedFile) => void
}

/**
 * Normalise any JSON shape into a flat row array.
 * Returns rows plus the arrayRootPath key (if the records were wrapped in an envelope),
 * so it can be stored in IntegrationMapping for future API-based imports.
 */
function extractRows(json: unknown): { rows: Record<string, unknown>[]; arrayRootPath?: string } {
  if (Array.isArray(json)) return { rows: json as Record<string, unknown>[] }

  if (json && typeof json === 'object') {
    const obj = json as Record<string, unknown>

    // OData / API-style: look for the first key whose value is an array of objects
    for (const key of Object.keys(obj)) {
      if (key.startsWith('@')) continue
      const val = obj[key]
      if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'object') {
        return { rows: val as Record<string, unknown>[], arrayRootPath: key }
      }
    }

    // Single record
    return { rows: [obj] }
  }

  return { rows: [] }
}

function formatSampleValue(val: unknown): string {
  if (val === null || val === undefined) return '—'
  if (typeof val === 'boolean') return val ? 'true' : 'false'
  if (typeof val === 'object') return JSON.stringify(val)
  return String(val)
}

function parseJSON(file: File): Promise<ParsedFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const json = JSON.parse(e.target!.result as string)
        const { rows, arrayRootPath } = extractRows(json)

        if (rows.length === 0) {
          reject(new Error('No records found in the JSON file.'))
          return
        }

        // Extract headers from first record, skip OData metadata keys
        const headers = Object.keys(rows[0]).filter(k => !k.startsWith('@'))

        // Build sample value map from the first record
        const sampleValues: Record<string, string> = {}
        for (const h of headers) {
          sampleValues[h] = formatSampleValue(rows[0][h])
        }

        resolve({ headers, rows, sampleValues, arrayRootPath, rawFile: file })
      } catch {
        reject(new Error('Invalid JSON file. Please check the format and try again.'))
      }
    }
    reader.onerror = () => reject(new Error('Failed to read the file.'))
    reader.readAsText(file)
  })
}

export function Step1Upload({ parsedFile, onParsed }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleFile(file: File) {
    setError('')
    if (!file.name.toLowerCase().endsWith('.json')) {
      setError('Only JSON files are supported.')
      return
    }
    setLoading(true)
    try {
      const parsed = await parseJSON(file)
      onParsed(parsed)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file.')
    } finally {
      setLoading(false)
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  return (
    <div className="space-y-4">
      <div
        className={cn(
          'flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 transition-colors cursor-pointer',
          dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/40',
          loading && 'opacity-60 pointer-events-none'
        )}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="size-8 text-muted-foreground" />
        <div className="text-center">
          <p className="font-medium">{loading ? 'Parsing…' : 'Drop your JSON file here or click to browse'}</p>
          <p className="text-sm text-muted-foreground mt-1">Supports JSON — including OData / SAP API responses</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }}
        />
      </div>

      {parsedFile && (
        <div className="flex items-center gap-3 rounded-md border bg-muted/30 px-4 py-3">
          <FileCheck className="size-5 text-green-600 shrink-0" />
          <div className="min-w-0">
            <p className="font-medium truncate">{parsedFile.rawFile.name}</p>
            <p className="text-sm text-muted-foreground">
              {parsedFile.rows.length.toLocaleString()} records · {parsedFile.headers.length} fields detected
            </p>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
