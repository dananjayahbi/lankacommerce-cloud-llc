# Task 05.01.11 — Build Report Export Utilities

## Metadata

| Field | Value |
|-------|-------|
| Task ID | T-05.01.11 |
| SubPhase | 05.01 — Reporting and Analytics |
| Complexity | Medium |
| Estimated Effort | 1.5 days |
| Dependencies | T-05.01.02 (ReportLayout shell — provides export UI triggers), npm packages: `papaparse`, `xlsx`, `@react-pdf/renderer` |
| Produces | `frontend/lib/reports/export.ts`, `frontend/components/reports/export/PDFReport.tsx` (supporting component for PDF template), `frontend/components/reports/export/CSVReport.ts` (helper), `frontend/components/reports/export/ExcelReport.ts` (helper) |
| Blocked By | T-05.01.02 |

---

## Objective

The export utilities give store owners the ability to pull report data out of LankaCommerce and into formats they can share, print, or analyse in external tools. Three export formats are supported: CSV for universal spreadsheet compatibility, Excel (XLSX) for formatted spreadsheet analysis, and PDF for professional printed reports and client-facing documents. Each export function accepts a generic `rows` and `columns` interface so it can render any report type — Profit & Loss, Sales by Product, Inventory Valuation, or any future report.

The export functions are imported by the `ReportLayout` component's export dropdown. When the user clicks "Export as PDF", the layout reads the current `reportData` from `ReportContext`, calls the corresponding export function with the data, and triggers a browser download. All exports run entirely on the client — no data is sent to a server for rendering. This keeps the export fast, private, and independent of backend availability.

---

## Instructions

1. Install the required npm packages in the frontend:

   ```
   npm install papaparse xlsx @react-pdf/renderer
   ```

   Or if using `pnpm`:
   ```
   pnpm add papaparse xlsx @react-pdf/renderer
   ```

2. Define the shared TypeScript types in `frontend/lib/reports/types.ts`:

   ```
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
   ```

   All export functions use these interfaces for type safety.

3. Create `frontend/components/reports/export/CSVExport.ts`:

   ```
   import Papa from 'papaparse'
   import type { ReportColumn, ReportRow } from '../../lib/reports/types'

   export function exportToCSV(
     rows: ReportRow[],
     columns: ReportColumn[],
     filename: string
   ): void {
     const fields = columns.map(col => col.label)
     const data = rows.map(row => {
       const mapped: Record<string, unknown> = {}
       columns.forEach(col => {
         mapped[col.label] = row[col.key] ?? ''
       })
       return mapped
     })

     const csv = Papa.unparse({
       fields,
       data,
     })

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
   ```

   The function creates a Blob from the CSV string, generates an object URL, programmatically clicks a hidden anchor to trigger the browser's download dialog, then cleans up the object URL.

4. Create `frontend/components/reports/export/ExcelExport.ts`:

   ```
   import * as XLSX.utilsaoa_to_sheet
   import * as XLSX from 'xlsx'

   export function exportToExcel(
     rows: ReportRow[],
     columns: ReportColumn[],
     filename: string
   ): void {
     const headerRow = columns.map(col => col.label)
     const dataRows = rows.map(row =>
       columns.map(col => row[col.key] ?? '')
     )

     const sheetData = [headerRow, ...dataRows]
     const worksheet = XLSX.utils.aoa_to_sheet(sheetData)

     // Set column widths for readability
     const colWidths = columns.map(col => ({ wch: col.width || 15 }))
     worksheet['!cols'] = colWidths

     const workbook = XLSX.utils.book_new()
     XLSX.utils.book_append_sheet(workbook, worksheet, 'Report')

     XLSX.writeFile(workbook, `${filename}.xlsx`, {
       bookType: 'xlsx',
       type: 'binary',
     })
   }
   ```

   The function builds a worksheet from an array of arrays (`aoa_to_sheet`), sets reasonable column widths, creates a new workbook, appends the sheet, and triggers the browser download via `XLSX.writeFile`. The `writeFile` method handles Blob creation and anchor-clicking internally.

5. Create `frontend/components/reports/export/PDFReport.tsx`:

   This is a React component that renders the PDF template using `@react-pdf/renderer` primitives. It is NOT a page component — it is used exclusively inside the `exportToPDF` function.

   ```
   import { Document, Page, View, Text, StyleSheet, Font } from '@react-pdf/renderer'
   import type { ReportColumn, ReportRow } from '../../lib/reports/types'
   ```

   a. **Register Fonts**:
      Register Inter (regular and bold weights) for body text. Register JetBrains Mono for monetary columns. Use `Font.register()` with `src` pointing to the font files in the project's `public/fonts/` directory.

      ```
      Font.register({
        family: 'Inter',
        fonts: [
          { src: '/fonts/Inter-Regular.ttf', fontWeight: 'normal' },
          { src: '/fonts/Inter-Bold.ttf', fontWeight: 'bold' },
        ],
      })
      Font.register({
        family: 'JetBrains Mono',
        src: '/fonts/JetBrainsMono-Regular.ttf',
      })
      ```

   b. **Define Styles**:
      ```
      const styles = StyleSheet.create({
        page: {
          padding: 40,
          fontSize: 10,
          fontFamily: 'Inter',
          fontFamily: 'Inter',
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
        table: {
          width: '100%',
          borderCollapse: 'collapse',
        },
        tableRow: {
          flexDirection: 'row',
          borderBottomWidth: 1,
          borderBottomColor: '#E2E8F0',
          minHeight: 24,
          alignItems: 'center',
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
        tableCell: {
          paddingHorizontal: 8,
          paddingVertical: 4,
          fontSize: 9,
        },
        tableCellMonospace: {
          paddingHorizontal: 8,
          paddingVertical: 4,
          fontSize: 9,
          fontFamily: 'JetBrains Mono',
        },
        footer: {
          position: 'absolute',
          bottom: 30,
          left: 40,
          right: 40,
          textAlign: 'center',
          color: '#64748B',
          fontSize: 8,
          borderTopWidth: 1BorderTop: 1,
          borderTopColor: '#E2E8F0',
          paddingTop: 8,
        },
      })
      ```

   c. **Component**:
      ```
      interface PDFReportProps {
        title: string
        subtitle: string
        columns: ReportColumn[]
        rows: ReportRow[]
        generatedAt: string
      }

      function PDFReportComponent({ title, subtitle, columns, rows, generatedAt }: PDFReportProps) {
        return (
          <Document>
            <Page size="A4" orientation="landscape" style={styles.page}>
              <Text style={styles.header}>{title}</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
              <View style={styles.table}>
                {/* Header Row */}
                <View style={styles.tableHeaderRow}>
                  {columns.map((col, i) => (
                    <Text key={i} style={{
                      ...styles.tableHeaderCell,
                      width: `${100 / columns.length}%`,
                      textAlign: col.align || 'left',
                    }}>
                    }}>
                      {col.label}
                    </Text>
                  ))}
                </View>
                {/* Data Rows */}
                {rows.map((row, rowIdx) => (
                  <View key={rowIdx} style={{
                    ...styles.tableRow,
                    backgroundColor: rowIdx % 2 === 0 ? '#FFFFFF' : '#F8FAFC',
                  }}>
                    {columns.map((col, colIdx) => {
                      const value = row[col.key]
                      const formatted = formatCellValue(value, col)
                      const isMonetary = col.format === 'currency'
                      return (
                        <Text key={colIdx} style={{
                          ...(isMonetary ? styles.tableCellMonospace : styles.tableCell),
                          width: `${100 / columns.length}%`,
                          textAlign: col.align || 'left',
                        }}>
                          {formatted}
                        </Text>
                      )
                    })}
                  </View>
                ))}
              </View>
              <Text style={styles.footer}>Generated on {generatedAt}</Text>
            </Page>
          </Document>
        )
      }
      ```

      The helper `formatCellValue` formats values based on column format type:
      - `currency`: prefix `LKR `, two decimal places, comma grouping.
      - `number`: comma grouping, no decimals.
      - `percentage`: one decimal place, `%` suffix.
      - `date`: format as "MMM dd, yyyy".
      - `text`: as-is.

6. Create `frontend/components/reports/export/PDFExport.ts`:

   ```
   import { pdf } from '@react-pdf/renderer'
   import PDFReportComponent from './PDFReport'
   import type { ReportColumn, ReportRow } from '../../lib/reports/types'

   export async function exportToPDF(
     rows: ReportRow[],
     rows: ReportRow[],
     columns: ReportColumn[],
     filename: string,
     title: string,
     subtitle: string
   ): Promise<void> {
     const blob = await pdf(
       <PDFReportComponent
         title={title}
         subtitle={subtitle}
         columns={columns}
         rows={rows}
         generatedAt={new Date().toLocaleString('en-US', {
           timeZone: 'Asia/Colombo',
           dateStyle: 'long',
           timeStyle: 'short',
         })}
       />
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
   ```

   The `pdf().toBlob()` method renders the React component into a PDF Blob. The rest of the function triggers the browser download. This function is async because `toBlob()` returns a Promise.

7. Update `frontend/lib/reports/export.ts` to re-export all three functions:

   ```
   export { exportToCSV } from '../../components/reports/export/CSVExport'
   export { exportToExcel } from '../../components/reports/export/ExcelExport'
   export { exportToPDF } from '../../components/reports/export/PDFExport'
   ```

   This barrel export provides a clean import path for the `ReportLayout`: `import { exportToCSV, exportToExcel, exportToPDF } from '@/lib/reports/export'`.

8. Wire up the export dropdown in `frontend/components/reports/ReportLayout.tsx`:

   ```
   import { exportToCSV, exportToExcel, exportToPDF } from '@/lib/reports/export'
   import { useReportContext } from '@/lib/reports/ReportContext'
   ```

   In the export dropdown's `onSelect` handler:
   - Read `reportData` from `useReportContext()`.
   - Build `rows` and `columns` from `reportData` based on the current report type.
   - Call the appropriate export function.
   - Show a loading indicator (ShadCN toast or spinner) while the PDF is being generated (PDF generation can take 1–3 seconds for large datasets).
   - On completion, show a success toast.

---

## Expected Output

- `frontend/lib/reports/types.ts`
- `frontend/lib/reports/export.ts` (barrel re-export)
- `frontend/components/reports/export/CSVExport.ts`
- `frontend/components/reports/export/ExcelExport.ts`
- `frontend/components/reports/export/PDFReport.tsx`
- `frontend/components/reports/export/PDFExport.ts`

---

## Validation

- [ ] CSV export produces a valid `.csv` file that opens correctly in Excel and Google Sheets.
- [ ] CSV file has a header row with column labels and data rows below.
- [ ] Excel export produces a valid `.xlsx` file with column headers, data, and auto-sized column widths.
- [ ] PDF export produces a valid `.pdf` file with the report title, date range subtitle, alternating-row table, and footer timestamp.
- [ ] PDF monetary values appear in JetBrains Mono font.
- [ ] PDF report uses landscape A4 orientation.
- [ ] Export dropdown in ReportLayout shows loading state during PDF generation.
- [ ] Export button becomes disabled during export to prevent double-clicks.
- [ ] CSV and Excel exports complete synchronously (no loading state needed).
- [ ] All three export functions handle empty rows gracefully (produce header-only files).
- [ ] Filename includes the report type and date: e.g. `profit-loss_Jan-2026.pdf`.

---

## Notes

All export functions run on the client-side. This design eliminates server load and keeps user data private — no report data is transmitted to a server just for formatting. The trade-off is that PDF generation using `@react-pdf/renderer` can be resource-intensive on lower-end devices if the dataset is large (thousands of rows). For the LankaCommerce use case, most reports have fewer than 200 rows, and the PDF generation completes in under 2 seconds. If performance becomes an issue, consider adding virtual scrolling or server-side PDF generation as a future enhancement.

The CSV and Excel exports use the `papaparse` and `xlsx` libraries respectively. Both are mature, well-tested libraries that handle edge cases like embedded commas, null values, and Unicode characters. The `xlsx` library's `writeFile` method automatically handles the browser download. No Blob creation is needed for Excel because `writeFile` manages the entire download flow.

The PDF template uses `@react-pdf template registers fonts explicitly via `Font.register()`. Font files must be present in the project's `public/fonts/` directory. If the font files are large (Inter Regular is approximately 300 KB), consider subsetting the fonts to include only the characters needed for the report — Latin alphabet, digits, and common currency symbols. The JetBrains Mono font is used only for monetary columns to ensure that numbers align vertically for easy comparison, which is a standard accounting practice.