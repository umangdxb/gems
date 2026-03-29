import csv from 'csv-parser'
import { Readable } from 'stream'

export const parseCsv = (csvString: string): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const results: any[] = []
    const stream = Readable.from(csvString)

    stream
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => {
        resolve(results)
      })
      .on('error', (error) => {
        reject(error)
      })
  })
}
