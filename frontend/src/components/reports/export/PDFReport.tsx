import React from 'react'
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import type { ReportColumn, ReportRow } from '@/lib/reports/types'

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#1B2B3A',
  },
  subtitle: {
    fontSize: 10,
    color: '#64748B',
    marginBottom: 20,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#1B2B3A',
    minHeight: 28,
    alignItems: 'center',
  },
  tableHeaderCell: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 9,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    minHeight: 24,
    alignItems: 'center',
  },
  tableCell: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 9,
  },
  tableCellMono: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 9,
    fontFamily: 'Courier',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    color: '#64748B',
    fontSize: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 8,
  },
})

function formatCellValue(
  value: string | number | boolean | null | undefined,
  col: ReportColumn,
): string {
  if (value == null) return ''
  switch (col.format) {
    case 'currency':
      return `LKR ${Number(value).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    case 'number':
      return Number(value).toLocaleString('en-LK', { maximumFractionDigits: 0 })
    case 'percentage':
      return `${Number(value).toFixed(1)}%`
    case 'date':
      return new Date(String(value)).toLocaleDateString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
      })
    default:
      return String(value)
  }
}

interface PDFReportProps {
  title: string
  subtitle: string
  columns: ReportColumn[]
  rows: ReportRow[]
  generatedAt: string
}

export function PDFReportComponent({ title, subtitle, columns, rows, generatedAt }: PDFReportProps) {
  const colWidth = `${(100 / columns.length).toFixed(2)}%`

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <Text style={styles.header}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>

        {/* Header row */}
        <View style={styles.tableHeaderRow}>
          {columns.map((col, i) => (
            <Text
              key={i}
              style={{
                ...styles.tableHeaderCell,
                width: colWidth,
                textAlign: col.align ?? 'left',
              }}
            >
              {col.label}
            </Text>
          ))}
        </View>

        {/* Data rows */}
        {rows.map((row, rowIdx) => (
          <View
            key={rowIdx}
            style={{
              ...styles.tableRow,
              backgroundColor: rowIdx % 2 === 0 ? '#FFFFFF' : '#F8FAFC',
            }}
          >
            {columns.map((col, colIdx) => {
              const isMono = col.format === 'currency'
              return (
                <Text
                  key={colIdx}
                  style={{
                    ...(isMono ? styles.tableCellMono : styles.tableCell),
                    width: colWidth,
                    textAlign: col.align ?? 'left',
                  }}
                >
                  {formatCellValue(row[col.key], col)}
                </Text>
              )
            })}
          </View>
        ))}

        <Text style={styles.footer}>Generated on {generatedAt}</Text>
      </Page>
    </Document>
  )
}
