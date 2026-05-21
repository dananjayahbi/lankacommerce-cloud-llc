import * as XLSX from 'xlsx'
import type { ReportColumn, ReportRow } from '@/lib/reports/types'

export function exportToExcel(
  rows: ReportRow[],
  columns: ReportColumn[],
  filename: string,
): void {
  const headerRow = columns.map((col) => col.label)
  const dataRows = rows.map((row) => columns.map((col) => row[col.key] ?? ''))

  const sheetData = [headerRow, ...dataRows]
  const worksheet = XLSX.utils.aoa_to_sheet(sheetData)

  const colWidths = columns.map((col) => ({ wch: col.width ?? 15 }))
  worksheet['!cols'] = colWidths

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Report')

  XLSX.writeFile(workbook, `${filename}.xlsx`, {
    bookType: 'xlsx',
    type: 'binary',
  })
}
