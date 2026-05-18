# Task 05.01.02 — Build Report Layout and Date Range Shell

## Metadata

| Field | Value |
|-------|-------|
| Task ID | T-05.01.02 |
| SubPhase | 05.01 — Reporting and Analytics |
| Complexity | Medium |
| Estimated Effort | 2 days |
| Dependencies | T-05.01.01 (SavedReport model and API exist), SP-01.02 (Auth and RBAC — `useAuth()` hook, `getAuthFromCookies()`), SP-01.04 (ShadCN and Theme configured) |
| Produces | `frontend/app/[tenantSlug]/reports/layout.tsx`, `frontend/components/reports/DateRangePicker.tsx`, `frontend/lib/reports/ReportContext.tsx`, `frontend/components/reports/ReportLayout.tsx` |
| Blocked By | T-05.01.01, SP-01.02 |

---

## Objective

The report layout shell is the shared UI frame that wraps every report page in the reporting subsystem. It provides three core features that every report depends on: a date-range picker that controls the time window for all report data, an export dropdown that triggers CSV/Excel/PDF generation for the currently viewed report, and a save-report dialog that persists the current filter configuration to the backend. By centralising these features in the layout, each individual report page can focus entirely on data presentation and visualisation without reimplementing filtering, exporting, or persistence logic.

The layout also includes a navigation sidebar listing all available report types. The sidebar gives the user a persistent sense of place within the reporting section and enables rapid switching between reports without losing the current date range selection. The active report is visually distinguished with an orange left-border highlight. All filter state lives in URL search parameters (`from` and `to` as ISO date strings) so that report configurations are shareable, bookmarkable, and survive page refresh.

---

## Instructions

1. Create `frontend/lib/reports/ReportContext.tsx`:

   ```
   'use client'

   import { createContext, useContext, useState, ReactNode } from 'react'

   interface ReportData {
     [key: string]: unknown
   }

   interface ReportContextType {
     reportData: ReportData | null
     setReportData: (data: ReportData | null) => void
   }

   const ReportContext = createContext<ReportContextType>({
     reportData: null,
     setReportData: () => {},
   })

   export function ReportContextProvider({ children }: { children: ReactNode }) {
     const [reportData, setReportData] = useState<ReportData | null>(null)
     return (
       <ReportContext.Provider value={{ reportData, setReportData }}>
         {children}
       </ReportContext.Provider>
     )
   }

   export function useReportContext() {
     return useContext(ReportContext)
   }
   ```

   The `reportData` field is a generic cache that individual report pages can populate. For example, the Profit & Loss page sets `reportData = { revenue, returns, cogs, expenses, grossProfit, netProfit }` so that the export utility can access the full dataset even after the user navigates away.

2. Create `frontend/components/reports/DateRangePicker.tsx`:

   This component uses ShadCN's Popover, Button, and Calendar primitives. It provides two modes: preset buttons and custom range selection.

   Define the preset ranges as an array of objects with `label` (string), `getRange` (function returning `{ from: Date, to: Date }`):

   - **Today**: `from = startOfToday()`, `to = endOfToday()`
   - **Yesterday**: `from = startOfYesterday()`, `to = endOfYesterday()`
   - **Last 7 Days**: `from = subDays(startOfToday(), 6)`, `to = endOfToday()`
   - **Last 30 Days**: `from = subDays(startOfToday(), 29)`, `to = endOfToday()`
   - **This Month**: `from = startOfMonth(today)`, `to = endOfMonth(today)`
   - **Last Month**: `from = startOfMonth(subMonths(today, 1))`, `to = endOfMonth(subMonths(today, 1))`
   - **Custom Range**: opens a ShadCN Calendar popover for from-date and to-date selection.

   Import date helpers from `date-fns`: `startOfToday`, `endOfToday`, `startOfYesterday`, `endOfYesterday`, `subDays`, `startOfMonth`, `endOfMonth`, `subMonths`, `format`.

   The component receives `onRangeChange: (range: { from: Date; to: Date }) => void` as a prop. When a preset is clicked or a custom range is confirmed, it calls `onRangeChange` with the computed range.

   The Popover trigger button displays the current range as "From {format(from, 'MMM dd, yyyy')} — To {format(to, 'MMM dd, yyyy')}". The presets grid renders as a 2-column layout inside the Popover content.

   Default range on mount: Last 30 Days.

3. Create `frontend/app/[tenantSlug]/reports/layout.tsx`:

   This is a client component (`'use client'`). It imports and renders `ReportContextProvider` wrapping the page content.

   The layout structure:

   - A sidebar (left, fixed width 240px, background `#FFFFFF`, border-right `#E2E8F0`) containing:
     - Navigation heading "Reports" in Inter font, semi-bold, text-navy (`#1B2B3A`).
     - Navigation links rendered as a list. Each link is a `next/link` `Link` component pointing to `/[tenantSlug]/reports/[report-name]`. The active link is determined by comparing `pathname` (from `usePathname()`) to the link's href. The active link receives a left border of `3px solid #F97316` (orange) and a slightly darker background (`#FFF7ED`). Inactive links have no left border and a transparent background.
     - Link labels: Profit & Loss (`/profit-loss`), Sales by Product (`/sales-by-product`), Sales by Staff (`/sales-by-staff`), Revenue Trend (`/revenue-trend`), Inventory Valuation (`/inventory-valuation`), Stock Movements (`/stock-movements`), Customer Analytics (`/customers`), Staff Performance (`/staff-performance`), Returns (`/returns`).
   - A top bar (below the date-range picker area) with:
     - The `DateRangePicker` component. On range change, update URL search params: `router.replace(pathname + '?' + params.toString())` where `params` includes `from` and `to` as ISO date strings.
     - An export dropdown: ShadCN DropdownMenu with "Export as PDF", "Export as CSV", "Export as Excel" items. Each item calls the corresponding export function from `frontend/lib/reports/export.ts`. (The export functions import the current report data from `ReportContext`.)
     - A "Save Report" button (orange `#F97316` background, white text) that opens a ShadCN Dialog with:
       - A text input for report name (placeholder: "My Report", max length 100).
       - A hidden `report_type` derived from the current path (`usePathname()` extracts the last segment).
       - On submit: `fetch('/api/reports/saved/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, report_type, filters: { from, to } }) })`. On success, show a toast notification. On failure, show error toast.
   - The main content area (`flex-1`, padding 24px) renders `{children}`.

   The layout reads `from` and `to` from `useSearchParams()` on mount and seeds the `DateRangePicker` with those values. If the params are missing, it defaults to Last 30 Days.

4. Create `frontend/components/reports/ReportLayout.tsx`:

   This is the reusable inner layout component that individual report pages use. It accepts props:
   - `title: string` — the report title (e.g. "Profit & Loss")
   - `children: ReactNode` — the report content
   - `actions?: ReactNode` — optional additional action buttons

   It renders:
   - A page header with the title (Inter, 24px, bold, text-navy `#1B2B3A`) and the `actions` slot on the right.
   - A horizontal divider (`border-t border-border #E2E8F0`).
   - The `children` below.

   This component is optional but provides visual consistency. If a report page needs a custom header layout, it can skip `ReportLayout` and render its own header.

5. Wire up the layout:

   The `frontend/app/[tenantSlug]/reports/layout.tsx` exports a default layout function that wraps all child pages under the `[tenantSlug]/reports/` route segment. This is a Next.js 15 convention — the `layout.tsx` file in a route folder automatically wraps all pages in that folder and nested folders.

6. Verify that the layout renders correctly by navigating to `/demo-tenant/reports/profit-loss` and confirming:
   - The sidebar is visible on the left with the correct navigation links.
   - The "Profit & Loss" link is highlighted with the orange left border.
   - The date-range picker shows "Last 30 Days" range by default.
   - Clicking "Last 7 Days" updates the URL search params to `?from=...&to=...`.
   - The "Save Report" dialog opens, accepts a name, and POSTs to the API.
   - The export dropdown displays three options.

---

## Expected Output

- `frontend/lib/reports/ReportContext.tsx`
- `frontend/components/reports/DateRangePicker.tsx`
- `frontend/app/[tenantSlug]/reports/layout.tsx`
- `frontend/components/reports/ReportLayout.tsx`

---

## Validation

- [ ] `DateRangePicker` renders all seven preset buttons and clicking each computes the correct date range and triggers `onRangeChange`.
- [ ] Custom Range mode opens a calendar and allows selecting a from-date and to-date.
- [ ] URL search params `from` and `to` are updated when a range is selected; the values are ISO date strings.
- [ ] Navigating to a different report page preserves the `from` and `to` search params in the URL.
- [ ] The sidebar renders exactly nine links; the active link has a `3px solid #F97316` left border.
- [ ] Clicking a sidebar link navigates to the corresponding report page without a full page reload (client-side navigation).
- [ ] The "Save Report" dialog opens on button click, accepts a name up to 100 characters, and POSTs to `/api/reports/saved/`.
- [ ] Saving a report without entering a name shows a validation message or prevents submission.
- [ ] The export dropdown shows PDF, CSV, and Excel options.
- [ ] On page load with no URL search params, the date range defaults to Last 30 Days.
- [ ] On page load with `from` and `to` params in the URL, the picker respects those values.

---

## Notes

Using URL search parameters as the single source of truth for report filters is a deliberate architectural decision. It eliminates the need for a global state store for filter state, makes report URLs shareable, and ensures that browser back/forward navigation restores the exact filter configuration the user had. The trade-off is that every report page must read from `useSearchParams()` and handle the case where params are missing (default to Last 30 Days). A future enhancement could store the default range in a user preference setting.

The `ReportContext` is intentionally thin — it holds only a generic `reportData` dictionary. This avoids coupling the context to any specific report shape. Each report page sets the data it needs for export, and the export utility reads whatever is in the context at export time. If the user switches reports before exporting, the context will hold the data of the last-visited report. This is acceptable because the export trigger is always on the currently visible page; the user cannot export a report they are not looking at.

The sidebar navigation uses `next/link` `Link` components for client-side transitions. The active link detection uses `usePathname()` from `next/navigation`. This works correctly with the `[tenantSlug]` dynamic segment because `pathname` includes the resolved slug. The orange left-border highlight uses Tailwind classes: `border-l-4 border-l-[#F97316] bg-[#FFF7ED]` for the active link, and no border for inactive links.
