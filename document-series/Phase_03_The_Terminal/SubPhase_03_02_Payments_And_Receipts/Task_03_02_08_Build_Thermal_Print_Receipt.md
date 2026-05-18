# Task 03.02.08 — Build Thermal Print Receipt

## Metadata

| Field | Value |
|---|---|
| Task | 03.02.08 |
| Name | Build Thermal Print Receipt |
| Sub-Phase | 03.02 — Payments, Receipts & Offline Mode |
| Complexity | Medium |
| Depends On | Task 03.02.06 |
| Produces | `backend/apps/pos/utils/receipt_renderer.py` |

## Objective

Create the `build_thermal_receipt_html` function in `backend/apps/pos/utils/receipt_renderer.py` that produces a self-contained HTML document formatted for 80 mm thermal paper. The `SaleReceiptView` at `GET /api/pos/sales/{id}/receipt/` calls this function and returns the HTML via `HttpResponse`. Opening the URL in a browser tab displays the receipt and triggers the browser's print dialog automatically.

## Instructions

### Step 1: Create the Receipt Renderer Module

Create `backend/apps/pos/utils/receipt_renderer.py`. If `utils/` does not exist inside `backend/apps/pos/`, create it with an `__init__.py`. This module has one exported function, `build_thermal_receipt_html`, and private helper functions. It has no dependencies on Django views, request objects, or any browser APIs — it is a pure string-building function. Add a module-level docstring explaining that the function returns a complete HTML document string served with `Content-Type: text/html`. The browser opens this in a new tab and the embedded script calls `window.print()` automatically.

### Step 2: Function Signature and Helpers

Define `build_thermal_receipt_html(sale, tenant, cashier_name: str) -> str`. The `sale` parameter is the fully hydrated sale object (with its `sale_lines` and `payments` related objects). The `tenant` parameter is the tenant database object providing `name`, `address`, `phone_number`, and `thank_you_message`. `cashier_name` is a plain string.

Define a private helper `_format_money(amount) -> str` that accepts a `Decimal` or number and returns a string in the format "Rs. X,XXX.XX" with comma-separated thousands grouping. Define a private helper `_truncate_product_name(name: str, max_chars: int = 24) -> str` that truncates to `max_chars - 1` characters followed by "…" if the name exceeds `max_chars`.

### Step 3: HTML Document Structure

The function builds and returns a complete HTML5 document. The structure: `<!DOCTYPE html>`, `<html lang="en">`, a `<head>` with `<meta charset="UTF-8">`, a `<meta name="viewport">` tag, a `<title>` of "Receipt — " plus the first 8 characters of `sale.id` in uppercase, and a single `<style>` block with all CSS described in Step 4. No external CSS links and no JavaScript libraries. The document must render and print correctly without internet connectivity.

The `<body>` contains a `<div id="receipt">` holding all receipt content. After the receipt div, a `<script>` calls `window.print()` inside `setTimeout(..., 200)` to trigger the print dialog after the page renders. After the closing `</body>`, include a `<div id="no-print-wrapper">` with a `<p>` reading "If printing has not started automatically, use your browser's Print option." This message is hidden during printing via the CSS `@media print` rule.

### Step 4: CSS Styling for Thermal Layout

The `<style>` block must contain:

- Universal reset: `box-sizing: border-box` on all elements. `body` uses a monospace font stack (`'Courier New', Courier, monospace`), `font-size: 9pt`, no margin, no padding, `background: white`, `color: black`.
- `@page` rule: `size: 80mm auto`, all margins `3mm`. This tells the browser print dialog to target 80 mm thermal paper.
- `@media print` rule: hide `#no-print-wrapper` with `display: none !important`. Keep `#receipt` visible with `display: block !important`.
- `#receipt`: `width: 74mm`, `margin: 0 auto`, `padding: 0`.
- Utility classes: `.center` (text-align center), `.right` (text-align right), `.bold` (font-weight bold), `.large` (font-size 12pt for the grand total), `.small` (font-size 8pt for footer text), `.separator` (dashed horizontal rule), `.separator-solid` (solid horizontal rule), `.row` (flex row with space-between), `.row .name` (flex: 1, overflow hidden, text-overflow ellipsis), `.row .amount` (white-space nowrap, text-align right).

### Step 5: Receipt Header

Inside `#receipt`, render the store header: `tenant.name` in a centred bold paragraph at `font-size: 11pt`. Below, `tenant.address` in a centred small paragraph — omit if null. Below, `tenant.phone_number` prefixed with "Tel: " in a centred small paragraph — omit if null. Insert a `.separator-solid` `<hr>` after the header.

### Step 6: Sale Metadata Block

Render four key-value rows using the `.row` class: "Receipt No." and the first 8 characters of `sale.id` in uppercase (bold right), "Cashier" and `cashier_name`, "Date" and `sale.created_at` formatted as DD/MM/YYYY, "Time" and `sale.created_at` formatted as HH:MM in 24-hour format. Insert a `.separator` `<hr>` after the four rows.

### Step 7: Line Items

For each `SaleLine` in `sale.sale_lines.all()`: render the product name (via `_truncate_product_name`) as a full-width row. If `variant_description_snapshot` is non-empty, render it in a small muted style below the name. Render a quantity-price-total row as a `.row` with three parts: quantity left-aligned (e.g. "3x"), unit price centre-aligned, line total right-aligned. If `discount_percent` is greater than zero, render a small italic right-aligned sub-row: "Discount: -Rs. [computed discount amount]". Add a 2px spacer div between each item. Insert a `.separator-solid` `<hr>` after all line items.

### Step 8: Totals Section

Render the totals block with `.row` entries: if a cart-level discount was applied, show "Cart Discount" with the amount preceded by a minus sign in small style. Show "Subtotal" and the subtotal amount. Show "Tax (included)" and the tax amount in small style (VAT is embedded in listed prices for Sri Lankan retail). Show "TOTAL" in bold left and `sale.total_amount` formatted with `_format_money` in bold large right. Insert a `.separator` `<hr>` after the TOTAL row.

### Step 9: Payment Summary

After the separator, render the payment summary section. For each `Payment` in `sale.payments.all()`, render a row showing the method (e.g. "Cash" or "Card") on the left and the amount on the right in small style. If the payment is CARD and `card_reference_number` is non-empty, add a sub-row in small muted style: "Ref: [card_reference_number]".

### Step 10: Footer

After the payment section, insert a `.separator` `<hr>`. Render the footer centred: if `tenant.thank_you_message` is non-empty, render it in a centred small paragraph. Below, render "LankaCommerce POS" in a centred small muted paragraph as the system identifier. Close the `#receipt` div.

## Expected Output

- `backend/apps/pos/utils/receipt_renderer.py` with `build_thermal_receipt_html` producing a complete, self-contained 80 mm thermal receipt HTML string.

## Validation

- Call `build_thermal_receipt_html` with a mock sale and tenant object and confirm the returned string is valid HTML with `<!DOCTYPE html>`.
- Open `GET /api/pos/sales/{id}/receipt/` in a browser — confirm the receipt renders correctly and the print dialog opens automatically.
- Print to a connected 80 mm thermal printer — confirm the output fits the paper width.

## Notes

- The module has no Django import dependencies beyond model access. It is a pure string builder and can be unit-tested without a running Django server.
- The `window.print()` call is inside a 200 ms `setTimeout` to ensure the page has fully rendered before the print dialog opens. This timing is empirically sufficient for modern browsers.
