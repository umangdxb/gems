import type { ParsedFile } from '../../types'

interface Props {
  parsedFile: ParsedFile
}

export function Step2Preview({ parsedFile }: Props) {
  const previewRows = parsedFile.rows.slice(0, 10)

  function formatValue(v: unknown): string {
    if (v === null || v === undefined || v === '') return '—'
    if (typeof v === 'object') return JSON.stringify(v)
    return String(v)
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Showing first {previewRows.length} of {parsedFile.rows.length.toLocaleString()} records ·{' '}
        {parsedFile.headers.length} fields per record
      </p>

      <div className="rounded-md border divide-y overflow-y-auto max-h-[340px]">
        {previewRows.map((row, i) => (
          <div key={i} className="px-4 py-3 space-y-1.5">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Record {i + 1}
            </p>
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-x-4 gap-y-1">
              {parsedFile.headers.map(h => (
                <div key={h} className="contents">
                  <span className="text-xs text-muted-foreground truncate py-0.5" title={h}>
                    {h}
                  </span>
                  <span className="text-xs font-medium truncate py-0.5" title={formatValue(row[h])}>
                    {formatValue(row[h])}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
