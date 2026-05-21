import { pdf } from '@react-pdf/renderer'
import React from 'react'
import { PDFReportComponent } from './PDFReport'
import type { ReportColumn, ReportRow } from '@/lib/reports/types'

export async function exportToPDF(
  rows: ReportRow[],
  columns: ReportColumn[],
  filename: string,
  title: string,
  subtitle: string,
): Promise<void> {
  const generatedAt = new Date().toLocaleString('en-US', {
    timeZone: 'Asia/Colombo',
    dateStyle: 'long',
    timeStyle: 'short',
  })

  const blob = await pdf(
    React.createElement(PDFReportComponent, {
      title,
      subtitle,
      columns,
      rows,
      generatedAt,
    }),
  ).toBlob()

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}.pdf`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
