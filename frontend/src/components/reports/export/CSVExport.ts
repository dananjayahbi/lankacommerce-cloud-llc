import Papa from 'papaparse'
import type { ReportColumn, ReportRow } from '@/lib/reports/types'

export function exportToCSV(
  rows: ReportRow[],
  columns: ReportColumn[],
  filename: string,
): void {
  const fields = columns.map((col) => col.label)
  const data = rows.map((row) => {
    const mapped: Record<string, unknown> = {}
    columns.forEach((col) => {
      mapped[col.label] = row[col.key] ?? ''
    })
    return mapped
  })

  const csv = Papa.unparse({ fields, data })

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
