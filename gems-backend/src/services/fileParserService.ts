import ExcelJS from 'exceljs'
import { parseCsv } from './csvService'

/**
 * Parse a file buffer into an array of flat string-keyed records.
 * Supports CSV, Excel (.xlsx), and JSON.
 *
 * For JSON, pass an optional arrayRootPath (e.g. "value") to unwrap OData-style
 * envelopes like { "value": [ ... ] }. If omitted, the function tries "value"
 * first, then falls back to the root if it is already an array.
 */
export const parseFile = async (
  buffer: Buffer,
  mimetype: string,
  arrayRootPath?: string
): Promise<Record<string, unknown>[]> => {
  if (mimetype === 'text/csv' || mimetype === 'application/csv') {
    return parseCsv(buffer.toString('utf-8'))
  }

  if (
    mimetype === 'application/json' ||
    mimetype === 'text/json'
  ) {
    return parseJson(buffer.toString('utf-8'), arrayRootPath)
  }

  // Excel
  const workbook = new ExcelJS.Workbook()
  const arrayBuffer = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  ) as ArrayBuffer
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await workbook.xlsx.load(arrayBuffer as any)

  const worksheet = workbook.worksheets[0]
  if (!worksheet) return []

  const rows: Record<string, string>[] = []
  let headers: string[] = []

  worksheet.eachRow((row, rowNumber) => {
    const values = (row.values as (ExcelJS.CellValue | null)[]).slice(1)
    if (rowNumber === 1) {
      headers = values.map((v) => String(v ?? ''))
    } else {
      const obj: Record<string, string> = {}
      headers.forEach((header, i) => {
        obj[header] = String(values[i] ?? '')
      })
      rows.push(obj)
    }
  })

  return rows
}

/**
 * Parse a JSON string into an array of records.
 * Resolves the records array using arrayRootPath (dot-notation),
 * or auto-detects common OData/REST envelope keys.
 */
export const parseJson = (
  jsonString: string,
  arrayRootPath?: string
): Record<string, unknown>[] => {
  const parsed: unknown = JSON.parse(jsonString)

  const resolve = (obj: unknown, path: string): unknown => {
    return path.split('.').reduce<unknown>((acc, key) => {
      if (acc && typeof acc === 'object' && !Array.isArray(acc)) {
        return (acc as Record<string, unknown>)[key]
      }
      return undefined
    }, obj)
  }

  // Explicit path provided
  if (arrayRootPath) {
    const found = resolve(parsed, arrayRootPath)
    if (Array.isArray(found)) return found as Record<string, unknown>[]
    throw new Error(`arrayRootPath "${arrayRootPath}" did not resolve to an array`)
  }

  // Already an array
  if (Array.isArray(parsed)) return parsed as Record<string, unknown>[]

  // Try common OData / REST envelope keys
  for (const key of ['value', 'data', 'items', 'records', 'results']) {
    const candidate = resolve(parsed, key)
    if (Array.isArray(candidate)) return candidate as Record<string, unknown>[]
  }

  // Single object — wrap it
  if (parsed && typeof parsed === 'object') {
    return [parsed as Record<string, unknown>]
  }

  throw new Error('Could not find a records array in the uploaded JSON')
}
