export interface ReportColumn {
  key: string
  label: string
  format?: 'currency' | 'number' | 'percentage' | 'date' | 'text'
  align?: 'left' | 'right' | 'center'
  width?: number
}

export interface ReportRow {
  [key: string]: string | number | boolean | null | undefined
}
