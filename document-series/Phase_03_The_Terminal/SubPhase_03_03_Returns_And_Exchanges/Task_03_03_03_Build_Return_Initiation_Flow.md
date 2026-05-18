# Task 03.03.03 — Build Return Initiation Flow

## Metadata

| Field | Value |
|---|---|
| Task | 03.03.03 |
| Name | Build Return Initiation Flow |
| SubPhase | 03.03 |
| Complexity | MEDIUM |
| Dependencies | Task 03.03.02 |
| Produces | `frontend/components/pos/ReturnWizardSheet.tsx`, modification to `frontend/app/[tenantSlug]/pos/history/page.tsx` |

---

## Objective

Add a "Return Items" action to the Sale History page so cashiers can begin a return against any completed sale. The return flow is housed inside a `ReturnWizardSheet` — a ShadCN Sheet that slides in from the right — preventing the cashier from leaving the POS terminal context. Implement return eligibility checking before the sheet opens.

---

## Instructions

### Step 1: Add Eligibility Logic to Sale History Page

In `frontend/app/[tenantSlug]/pos/history/page.tsx`, add logic to compute return eligibility for each sale row. Parse `sale.created_at` and compare to the current date — if the difference exceeds 30 days, mark the row as `return_window_expired: true`. Check whether all `SaleLine` quantities are fully returned by comparing `sale_line.quantity` against a `returned_already` field now included in the `GET /api/pos/sales/{id}/` response. If every line has `returned_already >= quantity`, mark the row as `fully_returned: true`. The `GET /api/pos/sales/` list endpoint must be updated to include per-line `returned_already` in its response (computed by summing associated `ReturnLine.quantity` values for each `SaleLine`).

### Step 2: Add the Return Button to the Actions Column

Replace or supplement the existing Info action button in each sale row with a "Return Items" button with four states:

- `return_window_expired=True`: render a ShadCN `Tooltip` wrapping a disabled Button with label "Return — Window Expired". Tooltip text: "Sales older than 30 days cannot be returned."
- `fully_returned=True`: render a disabled Button with label "Fully Returned" and no tooltip.
- Sale status is `VOIDED`: render a disabled Button with label "Voided — No Return".
- Otherwise: render an active Button that opens the `ReturnWizardSheet` with the selected sale's ID.

### Step 3: Create the ReturnWizardSheet Component

Create `frontend/components/pos/ReturnWizardSheet.tsx`. The component receives `saleId`, `open`, and `onOpenChange` props. When the sheet opens, it fetches the full sale (including sale lines and existing returned quantities) via TanStack Query calling `GET /api/pos/sales/{saleId}/`. While loading, display a centred skeleton. If the fetch fails, display an inline error with a Retry button.

Manage wizard state locally using `useState`:

- `step: 1 | 2 | 3` — current wizard step
- `selected_lines: { sale_line_id, variant_id, quantity }[]` — lines selected for return
- `refund_method: string` — defaults to `"CASH"`
- `card_reversal_reference: string`
- `restock_items: boolean` — defaults to `true`
- `reason: string`
- `authorizing_manager_id: string | null`
- `authorization_timestamp: number | null` — Unix timestamp of PIN verification

Render a step header at the top: Step 1 "Select Items to Return", Step 2 "Choose Refund Method", Step 3 "Manager Authorization". Show a progress indicator (three numbered circles) for the current step.

### Step 4: Wire Up Step Navigation

Render "Back" and "Next" buttons at the bottom of the Sheet content area. Step 1 → Step 2: Next reads "Next: Refund Options →", disabled if no line has `quantity > 0`. Step 2 → Step 3: Next reads "Next: Authorize →", always enabled. Step 3 → Submit: Next reads "Process Return", enabled only when `authorizing_manager_id` is set and `authorization_timestamp` is less than 5 minutes old. Back navigation preserves state at all steps.

### Step 5: Implement onInteractOutside Guard

Override the Sheet's `onInteractOutside` and `onEscapeKeyDown` handlers. If `step >= 2`, prevent the default dismiss and show a confirmation within the sheet: "You have an in-progress return. Are you sure you want to cancel?" with "Cancel" and "Abandon Return" buttons. On Step 1, standard dismiss behaviour is acceptable.

---

## Expected Output

- Sale History page has the Return Items button with correct disabled/active states
- `ReturnWizardSheet.tsx` renders with step indicators and navigation
- Sale data loads via TanStack Query on open

---

## Validation

- Fully-returned sale row shows disabled "Fully Returned" button
- Clicking Return on a valid sale opens `ReturnWizardSheet`
- Backing from Step 2 to Step 1 preserves selected line quantities
- Attempting to close the sheet at Step 2 shows the confirmation prompt

---

## Notes

Step body components (Item Selection, Refund Options, Manager PIN) are built in the next three tasks. Use placeholder content for each step until those components are ready.
