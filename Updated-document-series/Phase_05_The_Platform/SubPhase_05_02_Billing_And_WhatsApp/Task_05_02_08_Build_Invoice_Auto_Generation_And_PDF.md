# Task 05.02.08 — Build Invoice Auto-Generation and PDF

## Metadata

| Field | Value |
|---|---|
| Task ID | 05.02.08 |
| SubPhase | 05.02 — Billing and WhatsApp |
| Complexity | High |
| Estimated Effort | 3-4 hours |
| Depends On | 05.02.01 (Billing models), 05.02.05 (IPN webhook handler) |
| Produces | `backend/apps/billing/services/invoice_service.py`, `backend/apps/billing/views/invoice_pdf_view.py`, `frontend/components/billing/InvoicePDF.tsx` |
| Blocked By | None |

---

## Objective

Implement the automated invoice lifecycle: marking invoices as paid when the IPN handler confirms payment, auto-generating the next billing period's invoice, and generating a downloadable PDF invoice using `@react-pdf/renderer`. The invoice PDF service runs on the frontend (React) side because `@react-pdf/renderer` is a React library that renders JSX to PDF. The backend provides a download endpoint that triggers the PDF generation and serves the file.

The `InvoiceService` on the backend handles the business logic (invoice status transitions and next-invoice creation), while the `InvoicePDF` React component handles PDF layout and rendering.

---

## Instructions

### Step 1: Create the Invoice Service

Create `backend/apps/billing/services/invoice_service.py`. Define an `InvoiceService` class with static methods:

Define `mark_invoice_paid(invoice, payhere_order_id=None)` as a `@staticmethod`:

- Accept an `Invoice` instance and optionally a `payhere_order_id` string.
- Within `with transaction.atomic():`:
  - Fetch the invoice with `Invoice.objects.select_for_update().get(id=invoice.id)` to acquire a row lock.
  - If `invoice.status == InvoiceStatus.PAID`, log a warning and return early (idempotency guard).
  - Set `invoice.status = InvoiceStatus.PAID`.
  - Set `invoice.paid_at = timezone.now()`.
  - If `payhere_order_id` is provided, set `invoice.payhere_order_id = payhere_order_id`.
  - Save the invoice.
  - Call `auto_generate_next_invoice(invoice.subscription)` to create the next billing period's invoice.
- Return the updated invoice.

Define `auto_generate_next_invoice(subscription)` as a `@staticmethod`:

- Accept a `Subscription` instance.
- Check if the subscription status is `CANCELLED` or `SUSPENDED` — if so, do not generate the next invoice. Log a message and return `None`.
- Calculate the next billing period:
  - `next_period_start = subscription.current_period_end` (the current period's end becomes the next period's start).
  - `next_period_end = next_period_start + timedelta(days=30)`.
  - `next_due_date = next_period_end + timedelta(days=7)` (7 days after period end).
- Check if an invoice already exists for `subscription` with `billing_period_start == next_period_start` — if so, skip generation (idempotency guard).
- Generate an invoice number: call `PayHereService.generate_invoice_number()` or use `f"INV-{next_period_start.strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"`.
- Create the invoice:
  ```python
  Invoice.objects.create(
      subscription=subscription,
      tenant=subscription.tenant,
      invoice_number=invoice_number,
      amount=subscription.plan.monthly_price,
      status=InvoiceStatus.PENDING,
      billing_period_start=next_period_start,
      billing_period_end=next_period_end,
      due_date=next_due_date,
  )
  ```
- Return the created invoice.

Define `generate_and_email_invoice_pdf(invoice)` as a `@staticmethod`:

- This method is called after the invoice PDF is generated on the frontend side (the backend triggers it via a queue or the frontend calls back). For the current implementation:
  - Log that the invoice PDF should be generated.
  - Call `EmailService.send_email(invoice.tenant.admin_user.email, f"Invoice {invoice.invoice_number} from LankaCommerce", html_content)` with the invoice details and a link to download the PDF.
- The actual PDF generation is delegated to the frontend `InvoicePDF` component, invoked by the user clicking "Download PDF" on the billing page (task 05.02.09).

### Step 2: Create the PDF Download Endpoint

Create `backend/apps/billing/views/invoice_pdf_view.py`. Define an `InvoicePDFView` class using `APIView`:

- `authentication_classes = [JWTAuthentication]`.
- `permission_classes = [HasTenantPermission]`.

Define the `get` handler for `GET /api/billing/invoices/{id}/pdf/`:

1. Fetch the invoice: `get_object_or_404(Invoice, id=invoice_id, tenant_id=request.user.tenant_id)`.
2. Verify the invoice status is `PAID` — only paid invoices have downloadable PDFs. If not, return `{"success": False, "error": {"code": "invoice_not_paid", "message": "PDF is only available for paid invoices"}}` with status 400.
3. Serialise the invoice data into a JSON object that the PDF template can use:
   ```python
   pdf_data = {
       "invoice_number": invoice.invoice_number,
       "store_name": invoice.tenant.store_name,
       "store_address": invoice.tenant.address,
       "customer_name": invoice.subscription.tenant.store_name,
       "amount": str(invoice.amount),
       "billing_period_start": invoice.billing_period_start.isoformat(),
       "billing_period_end": invoice.billing_period_end.isoformat(),
       "due_date": invoice.due_date.isoformat(),
       "paid_at": invoice.paid_at.isoformat() if invoice.paid_at else None,
       "plan_name": invoice.subscription.plan.name,
   }
   ```
4. Return `{"success": True, "data": pdf_data}`.

The frontend will call this endpoint, receive the data, and use `@react-pdf/renderer` to generate and download the PDF on the client side. This avoids server-side PDF rendering complexity.

### Step 3: Build the Invoice PDF Component

Create `frontend/components/billing/InvoicePDF.tsx` as a React component using `@react-pdf/renderer`:

- Import from `@react-pdf/renderer`: `Document`, `Page`, `Text`, `View`, `StyleSheet`, `Font`, `Image`.
- Register fonts:
  - `Inter` from `@react-pdf/font` or a local font file: used for all body text, headings, and table content.
  - `JetBrains Mono` from a local font file: used only for monetary values and the invoice number.
  - Do not register Playfair Display — LankaCommerce uses Inter for all typography per the design token migration.
- Define `styles` using `StyleSheet.create()`:
  - Page: `padding: 40`, `fontFamily: "Inter"`, `fontSize: 10`.
  - Header section: flex row with logo on left and invoice title on right. Background `#1B2B3A` (navy) with white text for the title.
  - Invoice number: `fontFamily: "JetBrains Mono"`, `fontSize: 14`, `color: "#F97316"` (orange).
  - Store info section: two-column layout with store details on left and customer details on right.
  - Table: bordered table with columns for Description, Period, Amount. Header row with `backgroundColor: "#1B2B3A"` and `color: "#FFFFFF"`. Body rows alternating `backgroundColor: "#F1F5F9"` (background) and `backgroundColor: "#FFFFFF"` (surface).
  - Totals section: right-aligned with subtotal, any adjustments, and total in bold.
  - Footer: centered text at the bottom with "Thank you for using LankaCommerce" and the support email.

- Accept a `data` prop that contains the invoice data (invoice_number, store_name, amount, etc.).
- Render:
  - First page: the invoice layout described above.
  - If the invoice has multiple pages (rare for a single-line subscription invoice), add `<Page break>` for continuation.

### Step 4: Create the PDF Download Utility

In `frontend/lib/format.ts`, add a `downloadInvoicePdf` function:

- Accept `invoiceId` (string) and `authToken` (string).
- Call `fetch(\`/api/billing/invoices/${invoiceId}/pdf/\`, { headers: { Authorization: \`Bearer ${authToken}\` } })`.
- Parse the JSON response to get the invoice data.
- Dynamically import `@react-pdf/renderer`'s `pdf` function: `const { pdf } = await import("@react-pdf/renderer")`.
- Import `InvoicePDF` component.
- Create a PDF instance: `const pdfDocument = pdf(<InvoicePDF data={data.data} />)`.
- Generate a blob: `const blob = await pdfDocument.toBlob()`.
- Create a download link: `const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "Invoice-" + data.data.invoice_number + ".pdf"; a.click(); URL.revokeObjectURL(url)`.
- Return `true` on success or throw an error.

### Step 5: Hook Invoice PDF into IPN Handler

In the IPN webhook handler (task 05.02.05), after the `atomic()` block that marks the invoice as paid, call `InvoiceService.generate_and_email_invoice_pdf(invoice)` as a non-atomic, non-blocking call. Wrap in a try-except to prevent email failures from affecting the IPN response:

```python
try:
    InvoiceService.generate_and_email_invoice_pdf(invoice)
except Exception as e:
    logger.exception(f"Failed to email invoice PDF for {invoice.invoice_number}: {e}")
```

---

## Expected Output

- `InvoiceService.mark_invoice_paid` transitions an invoice to PAID and auto-generates the next invoice in an atomic transaction
- `InvoiceService.auto_generate_next_invoice` creates the next billing period's PENDING invoice with correct dates
- `GET /api/billing/invoices/{id}/pdf/` returns invoice data for paid invoices, 400 for unpaid invoices
- `InvoicePDF` component renders a professional PDF with LankaCommerce branding, JetBrains Mono for amounts, and Inter for everything else
- `downloadInvoicePdf` utility generates and downloads the PDF as a `.pdf` file on the client side
- IPN handler triggers invoice PDF email generation on successful payment

---

## Validation

- Call `InvoiceService.mark_invoice_paid` on a PENDING invoice — confirm the invoice status changes to PAID, `paid_at` is set, and a new PENDING invoice is created for the next period
- Call `InvoiceService.mark_invoice_paid` on an already PAID invoice — confirm no duplicate processing (idempotent)
- Call `InvoiceService.auto_generate_next_invoice` for a cancelled subscription — confirm no invoice is created
- Call `GET /api/billing/invoices/{id}/pdf/` with a PAID invoice — confirm the response contains all required fields in the standard envelope
- Call the same endpoint with a PENDING invoice — confirm 400 error with `invoice_not_paid` code
- Render the `InvoicePDF` component with sample data — confirm the PDF output includes the LankaCommerce logo, navy header, orange invoice number, alternating table rows, and footer
- Test the `downloadInvoicePdf` utility by clicking a "Download PDF" link on the billing page — confirm a `.pdf` file is downloaded to the browser
- Verify that the auto-generated next invoice has the correct `billing_period_start` (equal to the previous period's `billing_period_end`)
- Verify that `due_date` is 7 days after `billing_period_end`

---

## Notes

- The PDF generation runs on the client side using `@react-pdf/renderer`, not on the server. This avoids the complexity of server-side PDF rendering (font registration, headless browser dependencies, memory limits). The trade-off is that the PDF generation depends on the client's browser capabilities and may not work in very old browsers. For the target audience (Sri Lankan retail businesses using modern browsers), this is acceptable.
- `InvoiceService.mark_invoice_paid` is called from two places: the IPN webhook handler (task 05.02.05) and manually from the Django admin for payment reconciliation. Both paths go through the same method, ensuring consistent behaviour.
- The auto-generated next invoice uses `monthly_price` from the subscription's plan. If the plan price changes between billing periods, the existing subscription retains the price at the time of the current invoice. Price changes only affect invoices generated after the plan is updated. This is intentional — plan price changes are not retroactive.
- `@react-pdf/renderer` does not support all CSS properties. Use only supported properties: `padding`, `margin`, `flexDirection`, `justifyContent`, `alignItems`, `backgroundColor`, `color`, `fontSize`, `fontFamily`, `border`, `width`, `height`. Avoid `gap` — use margins on child elements instead.