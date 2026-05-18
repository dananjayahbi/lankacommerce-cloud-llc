# Task 04.03.02 — Build Audit Log Viewer Page

## Metadata

| Field | Value |
|-------|-------|
| Task ID | 04.03.02 |
| SubPhase | 04.03 — Hardware Integrations and Audit |
| Complexity | Medium |
| Estimated Effort | 1.5 days |
| Dependencies | Task 04.03.01 (audit service layer and GET endpoint available) |
| Produces | `frontend/app/[tenantSlug]/settings/audit-log/page.tsx`, `frontend/components/audit/AuditLogFilters.tsx`, `frontend/components/audit/AuditLogTable.tsx`, `frontend/components/audit/AuditLogDetailModal.tsx` |
| Blocked By | Task 04.03.01 |

---

## Objective

Build a paginated, filterable audit log viewer that lets managers and owners browse all system events with colour-coded entity type badges, actor information, timestamps, and a before/after diff modal for inspecting detailed changes. This page is the primary interface for compliance review, dispute resolution, and operational transparency.

The viewer uses TanStack Query for data fetching with automatic cache invalidation when filters change. Three components work together — a filter panel (`AuditLogFilters`), a data table (`AuditLogTable`), and a detail modal (`AuditLogDetailModal`) — composed in the page layout. The diff modal renders a key-by-key comparison of `previous_values` and `new_values` from the audit log record, with colour-coded before/after columns and proper handling of creation-only and deletion-only events.

---

## Instructions

### Step 1: Page Setup

Create `frontend/app/[tenantSlug]/settings/audit-log/page.tsx` as a Client Component.

1. Import `useAuth()` from the frontend auth hook. Check `user.role in ['MANAGER', 'OWNER']`. If not, render a ShadCN `Alert` with `variant="destructive"` and the message "You do not have permission to view audit logs."
2. Extract `params.tenantSlug` from the route params.
3. Render a breadcrumb row: Dashboard (`href=/[tenantSlug]/dashboard`) → Settings (`href=/[tenantSlug]/settings`) → Audit Log (current page). Use Inter font at 14px in text-muted (`#64748B`), with the current page in navy (`#1B2B3A`).
4. Render a heading "Audit Log" in Inter font at 24px, navy `#1B2B3A`, below the breadcrumb.
5. Manage the following lifted state in the page:
   - `entityType` (string, default `"all"`)
   - `startDate` (string ISO date or null, default null)
   - `endDate` (string ISO date or null, default null)
   - `actorId` (string UUID or null, default null)
   - `page` (number, default 1)
   - When any filter value changes (entityType, startDate, endDate, actorId), reset `page` back to 1.
6. Render a `Dialog` wrapper for the detail modal at the page level, controlled by a `selectedLog` state (audit log object or null). Pass `setSelectedLog` as a prop to `AuditLogTable` so row clicks open the modal.

### Step 2: Build the AuditLogFilters Component

Create `frontend/components/audit/AuditLogFilters.tsx` as a Client Component.

**Props**: `entityType`, `setEntityType`, `startDate`, `setStartDate`, `endDate`, `setEndDate`, `actorId`, `setActorId`, `tenantSlug`.

**Layout**: A horizontal flex row with `gap-4`, wrapping on small screens. Each filter control is wrapped in a label with Inter 12px font in text-muted (`#64748B`).

**Entity Type Select**:
- Use ShadCN `Select` component.
- Options: "All Types" (value `"all"`), "Sale", "Return", "Customer", "StockAdjustment", "Promotion", "Staff", "Expense", "Shift", "Settings".
- The value is derived from the `entityType` state.
- `onValueChange` calls `setEntityType(value)`.
- Width: fixed 160px.

**Date Range Pickers**:
- Two ShadCN `Input` elements with `type="date"`.
- First: "Start Date" with `value={startDate || ''}` and `onChange` that calls `setStartDate(e.target.value || null)`.
- Second: "End Date" with `value={endDate || ''}` and `onChange` that calls `setEndDate(e.target.value || null)`.
- Width: fixed 170px each.

**Actor Select**:
- Use ShadCN `Select` component.
- Fetch actor list using TanStack Query with key `['staff', tenantSlug]` from `GET /api/hr/staff/` (returns all staff for the tenant).
- Options: "All Actors" (value `"all"`) followed by a map over the staff list to produce `{label: staff.name, value: staff.id}` options.
- `onValueChange` calls `setActorId(value === 'all' ? null : value)`.
- Width: fixed 180px.

**Debounce**: Debouncing is handled naturally by TanStack Query's `staleTime` and the reset-to-page-1 behaviour — no extra debounce on the filter controls themselves.

### Step 3: Build the AuditLogTable Component

Create `frontend/components/audit/AuditLogTable.tsx` as a Client Component.

**Props**: `entityType`, `startDate`, `endDate`, `actorId`, `page`, `setPage`, `tenantSlug`, `onRowClick`.

**Data Fetching**:
- TanStack Query key: `['auditLogs', tenantSlug, entityType, startDate, endDate, actorId, page]`.
- Query function: `GET /api/audit/logs/?entity_type=${entityType === 'all' ? '' : entityType}&start_date=${startDate || ''}&end_date=${endDate || ''}&user_id=${actorId || ''}&page=${page}&page_size=50`.
- Handle loading, error, and empty states.

**Columns** (using ShadCN `Table`):

| Column | Render Logic | Width |
|--------|-------------|-------|
| **Entity Type** | ShadCN `Badge` with colour per the entity type mapping | 130px |
| **Entity ID** | First 8 characters + ellipsis, `font-family: 'JetBrains Mono'` | 120px |
| **Action** | Dots and underscores replaced with spaces, title-cased (e.g. `sale.completed` → `Sale Completed`) | 200px |
| **Performed By** | `user?.name` if present, otherwise italic "System" in text-muted (#64748B) | 150px |
| **Date** | Formatted as `DD MMM YYYY, HH:mm` using `Intl.DateTimeFormat` | 150px |

**Entity Type Badge Colours** (`ENTITY_COLORS` mapping):
- `sale` → navy `#1B2B3A` bg, white text
- `return` → orange `#F97316` bg, white text
- `customer` → success `#22C55E` bg, white text
- `staff` → text-muted `#64748B` bg, white text
- `settings` → border `#E2E8F0` bg, navy `#1B2B3A` text
- `promotion` → warning `#F59E0B` bg, white text
- `expense` → danger `#EF4444` bg, white text
5`stockadjustment` → info `#3B82F6` bg, white text
- `shift` → `#FFFFFF` bg with `#E2E8F0` border, `#1B2B3A` text

**Pagination**:
- Below the table, render a row with "Page X of Y" on the left and Previous/Next buttons on the right.
- Previous button: ShadCN `Button` variant "outline", disabled when `page === 1`. `onClick` calls `setPage(page - 1)`.
- Next button: ShadCN `Button` variant "outline", disabled when the results array length is less than `page_size` (no more pages). `onClick` calls `setPage(page + 1)`.

**States**:
- **Loading**: Render `Skeleton` components for each row (5 skeleton rows matching the column structure).
- **Empty**: Render a single table row with `colSpan={5}`, centre-aligned, displaying: "No audit events found for the selected filters." in text-muted (#64748B), Inter 14px.
- **Error**: Render a destructive `Alert` with the error message and a "Retry" button that calls `refetch()`.

### Step 4: Build the AuditLogDetailModal Component

Create `frontend/components/audit/AuditLogDetailModal.tsx` as a Client Component.

**Props**: `log` (audit log object or null), `open` (boolean), `onOpenChange` (callback).

**Header**:
- ShadCN `DialogHeader` and `DialogTitle`.
- Title: the action string (title-cased, e.g. "Sale Completed") in Inter 18px navy `#1B2B3A`.
- Subtitle: formatted date "DD MMM YYYY, HH:mm" in Inter 12px text-muted `#64748B`.

**Summary Section**:
- Three info rows in a compact grid:
  - "Entity Type" — the entity type string with its colour badge.
  - "Entity ID" — the full entity ID in JetBrains Mono 12px.
  - "Performed By" — user name with "(System)" if null.

**Diff Body**:
A bordered section with the before/after comparison. Header reads "Changes" in Inter 14px navy.

For each key in the union of all keys from `previous_values` + `new_values`, render a row with three columns:

| Column | Content | Styling |
|--------|---------|---------|
| Key name | The property name | JetBrains Mono 13px, navy `#1B2B3A` |
| Before | Value from `previous_values[key]` or em dash (`—`) if absent, prefixed with "− " | Orange `#F97316`, JetBrains Mono 13px |
| After | Value from `new_values[key]` or em dash (`—`) if absent, prefixed with "+ " | Navy `#1B2B3A`, JetBrains Mono 13px |

For nested objects (dicts), call `JSON.stringify(value)` to flatten them. For null values, render italic "null" in text-muted.

**Special Cases**:
- If `previous_values` is empty/null AND `new_values` is non-null: display label "Created With" above a single-column listing of all `new_values` keys.
- If `previous_values` is non-null AND `new_values` is empty/null: display label "Deleted/Removed" with a listing of `previous_values`.
- If both are null or empty: display italicised text "No detail data recorded for this event." in text-muted, centred.

### Step 5: State Wiring

In the page component:

1. Import all three child components.
2. Initialize filter state as described in Step 1.
3. Derive a callback `handleRowClick = (log) => setSelectedLog(log)`.
4. `AuditLogTable` receives all filter values, `page`, `setPage`, `tenantSlug`, and `onRowClick` as props.
5. `AuditLogDetailModal` is rendered with `open={selectedLog !== null}` and `onOpenChange={() => setSelectedLog(null)}`.

The filter panel and table are arranged vertically: filters first, then table.

---

## Expected Output

- `frontend/app/[tenantSlug]/settings/audit-log/page.tsx` — page layout with lifted filter state, role guard, breadcrumb.
- `frontend/components/audit/AuditLogFilters.tsx` — Entity Type select, date range pickers, actor select.
- `frontend/components/audit/AuditLogTable.tsx` — TanStack Query data table with colour badges, pagination, skeleton/empty/error states.
- `frontend/components/audit/AuditLogDetailModal.tsx` — Dialog with diff renderer.

---

## Validation

- Open the audit log page as MANAGER: table loads with data, skeleton shows during loading, no error.
- Open the audit log page as CASHIER: the role guard alert is displayed, no data loads.
 Change entity type filter to "Sale": the table refreshes to show only Sale events.
- Select a start and end date: only events within that range appear.
- Select an actor: only events for that actor appear.
- Clear all filters (reset to "Types", null dates, "All Actors"): full dataset returns.
- Click a row: the detail modal opens with the correct action name, date, and diff columns.
- For audit log with only `new_values`: the modal shows "Created With" label.
- For audit log with null `previous_values` and null `new_values`: the modal shows "No detail data recorded for this event."
- Previous/Next pagination updates the page number and re-fetches.
- On page 1, the Previous button is disabled.
- When results are fewer than page_size, the Next button is disabled.
- Empty filter combination displays the empty state message.

---

## Notes

The TanStack Query key structure must change whenever any filter or page value changes. Because the filters are lifted to the page component, every filter change triggers `setPage(1)` first, then the query key changes and TanStack Query automatically re-fetches. Set `staleTime` to 0 for the audit log query since audit events are append-only and users expect near-real-time visibility.

The date inputs use native HTML5 `type="date"` which provides a browser-native calendar picker. On mobile devices this renders the device's native calendar, which is preferred over a custom date picker for accessibility. The value binding must convert `null` to an empty string to avoid React controlled-input warnings.

The actor select fetches the full staff list via `GET /api/hr/staff/`. For tenants with many staff members (100+), consider adding search capability using ShadCN `Command` + `Popover` instead of the basic `Select`. This is not required for MVP but noted for future enhancement.

Entity type colour badges should be implemented as ShadCN `Badge` components with inline `style` props for the background colour rather than Tailwind dynamic classes, because Tailwind does not support dynamic colour strings. Define the mapping as a constant object: `const ENTITY_COLORS = { sale: '#1B2B3A', return: '#F97316', customer: '#22C55E', staff: '#64748B', settings: '#E2E8F0', promotion: '#F59E0B', expense: '#EF4444', stockadjustment: '#3B82F6', shift: '#FFFFFF' }`.
