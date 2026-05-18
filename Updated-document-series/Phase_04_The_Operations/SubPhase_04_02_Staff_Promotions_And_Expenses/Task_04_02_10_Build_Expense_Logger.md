# Task 04.02.10 — Build Expense Logger

## Metadata

| Field | Value |
|---|---|
| Task ID | 04.02.10 |
| SubPhase | 04.02 — Staff, Promotions and Expenses |
| Complexity | Medium |
| Estimated Effort | 1.5 days |
| Dependencies | Task 04.02.01 (`Expense` model migrated, `ExpenseCategory` enum defined) |
| Produces | `backend/apps/pos/views/expense_views.py`, `frontend/app/[tenantSlug]/expenses/page.tsx`, `ExpensesTable.tsx`, `CreateExpenseModal.tsx`, `ExpenseDetailSheet.tsx` |
| Blocked By | Task 04.02.01 |

---

## Objective

Build the expense logging interface at `frontend/app/[tenantSlug]/expenses/`. Managers and Owners can record, filter, view, and edit business expenses with category, amount, description, date, and an optional receipt image. A highlighted summary bar shows the total for the current filter state. Category badges give at-a-glance categorisation. A detail sheet allows inline editing without navigating away.

---

## Instructions

### Step 1: Build the Expense List/Create DRF View

Create `backend/apps/pos/views/expense_views.py`.

Define `ExpenseListCreateView` extending `APIView` with `JWTAuthentication` and `HasTenantPermission`.

**`get` method** — `GET /api/pos/expenses/`:
1. Enforce MANAGER or OWNER role.
2. Parse query params: `category` (ExpenseCategory value, optional), `date_from` (ISO date string, optional), `date_to` (ISO date string, optional), `page` (int, default 1), `page_size` (int, max 100, default 20).
3. Build queryset: `qs = Expense.objects.filter(tenant_id=user.tenant_id).select_related('recorded_by').order_by('-expense_date', '-created_at')`.
4. Apply optional filters: `if category: qs = qs.filter(category=category)`. `if date_from: qs = qs.filter(expense_date__gte=date_from)`. `if date_to: qs = qs.filter(expense_date__lte=date_to)`.
5. Compute `total_amount` for the full filtered queryset (before pagination): `total_amount = qs.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')`.
6. Paginate: `total_count = qs.count()`. Slice appropriately.
7. Return: `{ "success": true, "data": { "expenses": [...], "pagination": { "page": p, "page_size": ps, "total_count": tc, "total_pages": tp }, "total_amount": str(total_amount) } }`.

**`post` method** — `POST /api/pos/expenses/`:
1. Enforce MANAGER or OWNER.
2. Validate with `CreateExpenseSerializer`: `category` (ChoiceField over `ExpenseCategory.choices`, required), `amount` (DecimalField, min_value `Decimal('0.01')`), `description` (CharField, required, max_length 1000), `expense_date` (DateField, required — accepts ISO date string `YYYY-MM-DD`), `receipt_image_url` (URLField, optional).
3. `recorded_by_id = user.user_id`. `tenant_id = user.tenant_id`.
4. Create the `Expense` record.
5. Return 201 with the serialised expense.

Register URLs in `backend/apps/pos/urls.py` (or a new `expense_urls.py` included from `pos/urls.py`):
- `'expenses/'` → `ExpenseListCreateView.as_view()`, name `'expense-list-create'`.

### Step 2: Build the Expense Detail DRF View

In `backend/apps/pos/views/expense_views.py`, define `ExpenseDetailView` at `GET/PATCH /api/pos/expenses/{id}/`.

**`get` method**: `Expense.objects.select_related('recorded_by').get(id=id, tenant_id=user.tenant_id)` — return 404 if not found. Enforce MANAGER or OWNER.

**`patch` method**: Validate partial update with `UpdateExpenseSerializer` accepting all fields from `CreateExpenseSerializer` as optional. `Expense.objects.filter(id=id, tenant_id=user.tenant_id).update(**validated_data)`. Return updated record.

Register: `'expenses/<uuid:id>/'` → `ExpenseDetailView.as_view()`.

### Step 3: Build the Receipt Upload DRF View

In `backend/apps/pos/views/expense_views.py`, define `ExpenseReceiptUploadView` at `GET /api/pos/expenses/upload-url/`.

**`get` method**:
1. Enforce MANAGER or OWNER.
2. Parse query params: `file_name` (required, string), `mime_type` (required, string).
3. Validate `mime_type in ('image/jpeg', 'image/png', 'image/webp')` — return 415 (Unsupported Media Type) if not.
4. Check that `settings.AWS_S3_BUCKET` is set and non-empty. If not configured, return 503 with `{ "success": false, "error": { "code": "UPLOAD_NOT_CONFIGURED", "message": "Receipt upload is not configured in this environment." } }`.
5. Extract file extension from `mime_type`: `ext_map = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }`. `ext = ext_map[mime_type]`.
6. Generate a unique S3 object key: `from uuid import uuid4; key = f"receipts/{user.tenant_id}/{uuid4()}.{ext}"`.
7. Use `boto3` to generate a presigned URL: `import boto3; s3_client = boto3.client('s3', region_name=settings.AWS_S3_REGION)`. `upload_url = s3_client.generate_presigned_url('put_object', Params={ 'Bucket': settings.AWS_S3_BUCKET, 'Key': key, 'ContentType': mime_type }, ExpiresIn=300)`.
8. Compute `object_url = f"https://{settings.AWS_S3_BUCKET}.s3.{settings.AWS_S3_REGION}.amazonaws.com/{key}"` (or use `settings.AWS_S3_CUSTOM_DOMAIN` if configured for a CDN).
9. Return: `{ "success": true, "data": { "upload_url": upload_url, "object_url": object_url } }`.

Register: `'expenses/upload-url/'` → `ExpenseReceiptUploadView.as_view()`. This path must be registered before `expenses/<uuid:id>/` to prevent the URL dispatcher from interpreting `upload-url` as a UUID.

### Step 4: Build the Expenses Page

Create `frontend/app/[tenantSlug]/expenses/page.tsx` as a Client Component.

Role guard: `useAuth()` — redirect CASHIER and STOCK_CLERK to `/${tenantSlug}/dashboard`.

**Tab navigation** at the top: two tab items rendered as a ShadCN `Tabs` component in `list-only` mode (no tab panels — navigation is done via `next/link`). "Expense Log" links to `/${tenantSlug}/expenses` (active state when on this page). "Cash Flow Statement" links to `/${tenantSlug}/expenses/cash-flow`.

**Filter controls** in a horizontal row below the tab nav:
- ShadCN `Select` for category: options "All Categories", "Rent", "Salaries", "Utilities", "Advertising", "Maintenance", "Miscellaneous", "Other". `defaultValue = "all"`.
- Date range: two ShadCN date pickers ("From", "To"), optional. Default to empty (no date filter on initial load — show all expenses).
- "Clear Filters" link visible when any filter is set.

**Summary bar**: a highlighted chip above the table showing `"Total for filters: Rs. [total_amount]"` when `total_amount > 0`. Background `#E2E8F0` (border), text `#1B2B3A` (navy), Inter 14px, padding 8px 16px, rounded.

TanStack Query key `['expenses', tenantSlug, category, dateFrom, dateTo, page]`. `enabled: true` always — load expenses on page mount.

"New Expense" button on the right of the filter row, `orange` (#F97316) background, opens `CreateExpenseModal`.

State: `createModalOpen: boolean`, `detailSheetExpense: Expense | null`, `page: number`.

### Step 5: Build the ExpensesTable

Create `frontend/app/[tenantSlug]/expenses/components/ExpensesTable.tsx`.

**Props**: `expenses: Expense[]`, `onViewDetail: (e: Expense) => void`.

ShadCN `Table` with columns: Date, Category, Description, Amount, Receipt, Recorded By, Actions.

Column details:
- "Date": formatted as "17 Mar 2026" using `Intl.DateTimeFormat` with `{ day: 'numeric', month: 'short', year: 'numeric' }`.
- "Category" badge — define `EXPENSE_CATEGORY_BADGE_CONFIG` at module level:
  - `RENT`: `{ bg: '#F97316', text: '#FFFFFF' }` (orange bg, surface text).
  - `SALARIES`: `{ bg: '#1B2B3A', text: '#FFFFFF' }` (navy bg, surface text).
  - `UTILITIES`: `{ bg: '#64748B', text: '#FFFFFF' }` (text-muted bg, surface text).
  - `ADVERTISING`: `{ bg: '#E2E8F0', text: '#1B2B3A' }` (border bg, navy text).
  - `MAINTENANCE`: `{ bg: '#F1F5F9', text: '#1B2B3A' }` (background bg, navy text).
  - `MISCELLANEOUS`, `OTHER`: `{ bg: '#FFFFFF', text: '#1B2B3A', border: '1px solid #E2E8F0' }` (surface bg, navy text, border).
- "Description": truncated to 60 characters with a `Tooltip` showing the full text.
- "Amount": JetBrains Mono, `Rs. [amount]` formatted to 2 decimal places using `decimal.js`.
- "Receipt": if `receipt_image_url` is set, render a ShadCN `Button` variant `'ghost'` with a link icon that opens the URL in a new tab. If null, render `—`.
- "Recorded By": `recorded_by.name` in `text-muted` (#64748B).
- "Actions": "View" ShadCN `Button` variant `'ghost'` calling `onViewDetail(expense)`.

### Step 6: Build the Category Summary Row

At the bottom of `ExpensesTable.tsx`, render a visually distinct summary footer row. Apply `background: '#E2E8F0'` to the row's `<tr>` element.

Left cell (spans Date, Category, Description columns): "Totals for current filter" in Inter 14px `navy` (#1B2B3A).

Right cell (spans Amount): total amount from the TanStack Query response `total_amount` field in JetBrains Mono bold.

Below the table (not in a table row), render per-category chips as inline `<span>` elements: for each `ExpenseCategory` that appears in the current page's expenses, show `"[CategoryLabel]: Rs. [sum]"` computed by grouping the current page records client-side. Append a ShadCN `Tooltip` icon next to the chips with tooltip text "Per-category amounts shown for the current page only. Use the category filter for accurate totals." This caveat is important — the server total is accurate for the full filter, but the per-category breakdown is approximate (current page only).

### Step 7: Build the CreateExpenseModal

Create `frontend/app/[tenantSlug]/expenses/components/CreateExpenseModal.tsx`.

Wrap in ShadCN `Dialog`. Title "Record Expense".

React Hook Form with Zod. Fields:
- `category`: ShadCN `Select` with all `ExpenseCategory` values.
- `amount`: ShadCN `Input` type `number`, step `0.01`, min `0.01`. Zod: `z.number().positive("Amount must be greater than zero.")`.
- `description`: ShadCN `Textarea`, required.
- `expense_date`: ShadCN `DatePicker`, default `new Date()` (today).
- `receipt_image`: ShadCN `Input` type `file`, `accept="image/jpeg,image/png,image/webp"`, optional.

**Receipt upload flow** (triggered on file selection via an `onChange` handler on the file input, not on form submit):
1. Get the selected file: `const file = e.target.files?.[0]`. If none, return.
2. Set local state `isUploading: true`.
3. Fetch: `GET /api/pos/expenses/upload-url/?file_name=${encodeURIComponent(file.name)}&mime_type=${file.type}`.
4. On success: receive `upload_url` and `object_url`.
5. PUT the file to `upload_url` using `fetch(upload_url, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })`.
6. On successful PUT: set local state `uploadedObjectUrl: object_url`, `isUploading: false`. Display a thumbnail preview of the uploaded image and the text "Receipt uploaded." in `#22C55E`.
7. On upload failure: set `isUploading: false`. Show `"Receipt upload failed. You can still save the expense without a receipt."` in `#EF4444`. Clear `uploadedObjectUrl`.
8. Show a ShadCN `Progress` bar during the upload. Since `fetch` does not natively expose upload progress, simulate with a timed animation: start at 0%, increment to 90% over 2 seconds, jump to 100% on completion.

On form submit: `POST /api/pos/expenses/` with body including `receipt_image_url: uploadedObjectUrl ?? undefined`. Invalidate `['expenses', tenantSlug]`, close dialog, `toast({ description: "Expense recorded." })`.

### Step 8: Build the ExpenseDetailSheet

Create `frontend/app/[tenantSlug]/expenses/components/ExpenseDetailSheet.tsx`.

**Props**: `expense: Expense | null`, `onClose: () => void`, `tenantSlug: string`.

ShadCN `Sheet` (right panel), `open={expense !== null}`, `onOpenChange={(open) => !open && onClose()}`.

**Read-only view** (default mode): all expense fields displayed in a structured layout. If `receipt_image_url` is set: render an `<img>` element with `src={expense.receipt_image_url}`, `alt="Receipt"`, `max-height: 200px`, `object-fit: contain`, followed by a "View Full Size" `<a>` link opening the URL in a new tab. Set `rel="noopener noreferrer"` on the link for security.

**"Edit" toggle button** at the top right of the sheet: clicking it switches the sheet body to edit mode. Edit mode renders the same fields as the create modal (excluding the file upload flow — in edit mode, the `receipt_image_url` is shown as a read-only link with a "Replace Receipt" button that, when clicked, triggers the upload flow and updates the URL field).

On save in edit mode: `PATCH /api/pos/expenses/${expense.id}/`. On success: invalidate `['expenses', tenantSlug]`, switch back to read-only mode, `toast({ description: "Expense updated." })`.

---

## Expected Output

- `backend/apps/pos/views/expense_views.py` with `ExpenseListCreateView`, `ExpenseDetailView`, `ExpenseReceiptUploadView`.
- `frontend/app/[tenantSlug]/expenses/page.tsx` with role guard, tab navigation, filters, summary bar, and "New Expense" button.
- `frontend/app/[tenantSlug]/expenses/components/ExpensesTable.tsx` with category badges and summary row.
- `frontend/app/[tenantSlug]/expenses/components/CreateExpenseModal.tsx` with receipt upload flow.
- `frontend/app/[tenantSlug]/expenses/components/ExpenseDetailSheet.tsx` with read/edit toggle.

---

## Validation

- Create expense with a JPEG receipt image: presigned URL generated, image uploaded to S3, `receipt_image_url` stored in database. Verify via Django shell: `Expense.objects.latest('created_at').receipt_image_url` is non-null.
- Filter by category "UTILITIES" — only utility expenses visible; `total_amount` in summary bar reflects only the filtered total.
- Filter by date range "01/03/2026 – 31/03/2026" — only expenses within March 2026 appear.
- Edit an expense from the detail sheet — change amount — `PATCH` request updates the database record.
- CASHIER navigating to `/[tenantSlug]/expenses` — immediately redirected by `useAuth()` guard.
- `POST /api/pos/expenses/` with `amount = -50` — serialiser returns 400 validation error.
- `GET /api/pos/expenses/upload-url/` with `mime_type=application/pdf` — returns 415 Unsupported Media Type.
- Per-category chips below the table display only categories present on the current page; tooltip warns about approximation.
- Category summary row total matches `total_amount` from the server response.

---

## Notes

The `receipt_image_url` URL registration order matters critically. The path `'expenses/upload-url/'` must appear in `urlpatterns` before `'expenses/<uuid:id>/'`. Django URL resolution is order-dependent — if `<uuid:id>` is listed first, Django will attempt to parse `upload-url` as a UUID, fail, and return a 404. Literal path segments always go before parameter paths.

The file upload uses a presigned S3 URL rather than a proxied multipart upload through the Django server for two reasons: it offloads the bandwidth cost of potentially large image files from the application server, and it avoids Django's memory buffering of uploaded files. The presigned URL expires after 300 seconds — sufficient for a normal upload interaction. If the cashier walks away mid-form, the URL may expire and the upload will fail; the error handling in the modal covers this case.

The `boto3` call in `ExpenseReceiptUploadView` is synchronous and will block the request thread during the AWS API call (typically 50–200 ms). For the current scale of LankaCommerce, this is acceptable. If the project scales to require non-blocking IO for S3 interactions, `aioboto3` or an async task queue can be introduced later without changing the API surface.
