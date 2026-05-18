# Task 03.03.04 — Build Return Item Selection Panel

## Metadata

| Field | Value |
|---|---|
| Task | 03.03.04 |
| Name | Build Return Item Selection Panel |
| SubPhase | 03.03 |
| Complexity | MEDIUM |
| Dependencies | Task 03.03.03 |
| Produces | `frontend/components/pos/ReturnItemSelectionStep.tsx` |

---

## Objective

Build the first step of `ReturnWizardSheet`: a line-item table showing everything in the original sale with per-line quantity steppers so the cashier can specify exactly which items (and how many) the customer is returning.

---

## Instructions

### Step 1: Create the Component

Create `frontend/components/pos/ReturnItemSelectionStep.tsx`. Props:

- `sale` — the sale object with `sale_lines` each including a `returned_already` count already computed by the API
- `value: { sale_line_id, variant_id, quantity }[]` — currently selected return lines (managed by parent)
- `restock_items: boolean`
- `onChange(lines, restock_items)` — callback to lift state into the parent

### Step 2: Build the Line Items Table

Render a table with columns: Product (name and variant description using Inter font, muted secondary line for variant), Unit Price (right-aligned in JetBrains Mono "Rs. X,XXX.XX"), Orig. Qty, Returned (already-returned count — show "—" if zero), Returnable (`quantity - returned_already` — show "None remaining" in tertiary muted label if zero), and Return Qty (a stepper with decrement/increment ShadCN outline `Button`s and a number display between them, min=0, max=returnable qty).

When `returnable qty` is 0 for a line, disable the entire stepper and render the row at reduced opacity.

### Step 3: Compute and Show the Refund Preview

Below the table, render a summary panel that updates reactively as quantities change. For each line where `return_qty > 0`, show "Product Name ×Qty — Rs. X.XX". Below the list, show the grand total refund in JetBrains Mono at a larger font in `navy` colour (`#1B2B3A`) labelled "Estimated Refund Total". Add a small note in `text-muted` style (`#64748B`): "Final refund amount may differ if line discounts were applied."

The client-side estimate is `(return_qty / original_qty) × sale_line.line_total`. The definitive calculation is performed server-side in `return_service.py`.

### Step 4: Add the Restock Toggle

Below the refund preview, add a row with a ShadCN `Switch` labelled "Restock returned items to inventory". Defaults to the `restock_items` prop. On toggle, call `onChange` with current lines and the new `restock_items` value. When `restock_items` is `False`, conditionally render a helper note in `warning` amber (`#F59E0B`) style: "Returned items will not be added back to stock. Use this for damaged or unsellable items."

### Step 5: Validate for Next Button

The parent's "Next" button is enabled when `value.some(l => l.quantity > 0)`. This component manages and emits state only — it does not render navigation buttons.

---

## Expected Output

A `ReturnItemSelectionStep` component with a reactive line-item table, per-line quantity steppers, live refund preview, and restock toggle.

---

## Validation

- Steppers cannot be incremented past the returnable qty
- Steppers for zero-returnable lines are disabled and dimmed
- Refund total updates immediately on stepper change
- The restock toggle off-state shows the warning note
