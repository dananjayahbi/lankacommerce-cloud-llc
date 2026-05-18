# Task 04.01.03 — Build Customer Management Pages

## Metadata

| Field | Value |
|---|---|
| Task ID | 04.01.03 |
| Complexity | High |
| Dependencies | 04.01.02 |
| Produces | Customer list page, detail page, `CustomerSheet` component, customer DRF views |

---

## Objective

Build the full customer management section of the LankaCommerce dashboard: a paginated list page with filtering, a rich customer detail page with tabbed history, a slide-out Sheet for creating and editing customers, and the backing DRF views. All pages live under `frontend/app/[tenantSlug]/customers/`.

---

## Instructions

### Step 1: Build the Customer DRF Views

Create `backend/apps/crm/views/customer_views.py`. All views use `JWTAuthentication` and `HasTenantPermission`. Extract `tenant_id` from `request.auth` JWT claims via `request.auth['tenant_id']`.

**`CustomerListCreateView`** handles `GET` and `POST` at `/api/crm/customers/`:

- `GET`: extract query params `search`, `tag`, `spend_min`, `spend_max`, `page` (default 1), `limit` (default 20). Call `get_customers(tenant_id, ...)` from the customer service. Return the paginated dict wrapped in the standard success envelope: `{ "success": true, "data": { "customers": [...], "total": N, "page": N, "total_pages": N } }`.
- `POST`: validate the request body with `CreateCustomerSerializer`. On valid, call `create_customer(tenant_id, serializer.validated_data)`. Return 201 with the created customer wrapped in the success envelope.

**`CustomerDetailView`** handles `GET`, `PATCH`, and `DELETE` at `/api/crm/customers/{id}/`:

- `GET`: call `get_customer_by_id(tenant_id, customer_id)`. Return 200 or 404.
- `PATCH`: validate partial body with `UpdateCustomerSerializer`. Call `update_customer(tenant_id, customer_id, validated_data)`. Return 200.
- `DELETE`: call `soft_delete_customer(tenant_id, customer_id)`. Return 200 with `{ "success": true, "data": { "deleted": true } }`.

Create `backend/apps/crm/serializers/customer_serializer.py` with `CreateCustomerSerializer` and `UpdateCustomerSerializer`. Both accept: `name`, `phone`, `email`, `gender` (choices from `Gender.choices`), `birthday` (DateField, `allow_null=True`), `tags` (ListField of CharField, `allow_empty=True`), `notes`. `UpdateCustomerSerializer` makes all fields optional.

Register URL patterns in `backend/apps/crm/urls.py` and include `backend.apps.crm.urls` in the main `backend/config/urls.py` under the prefix `/api/crm/`.

### Step 2: Build the Customer List Page

Create `frontend/app/[tenantSlug]/customers/page.tsx` as a Client Component (`'use client'`). Import `useAuth()` to obtain `tenantSlug` (or read from route params). Use TanStack Query `useQuery` with key `['customers', tenantSlug, filters]` fetching from `GET /api/crm/customers/` with query params matching the filter state.

**Page Header:** "Customers" in Inter, `font-semibold`, `text-navy` (`#1B2B3A`). Two action buttons on the right: "Add Customer" (opens `CustomerSheet` in create mode) and "Import Customers" (opens `ImportCustomersSheet`).

**Filter Bar:**

- Debounced text `Input` (400 ms) for search — placeholder "Search by name or phone..."
- Tag filter `Select` with options: All Tags, VIP, Regular, Wholesale, Staff, Online
- Spend band `Select` with options: Any Spend / Under Rs. 5,000 / Rs. 5,000–25,000 / Rs. 25,000+

**Table:** ShadCN `Table` with the following columns:

- Name — Inter, clickable link to `/[tenantSlug]/customers/[customerId]`
- Phone — monospace, muted
- Tags — ShadCN `Badge` per tag, `background-color: #F97316` (orange), `color: white`, `text-xs`
- Credit Balance — JetBrains Mono; `#22C55E` when `> 0`, `#EF4444` when `< 0`, `#64748B` when `= 0`
- Total Spend — JetBrains Mono, neutral colour
- Last Purchase — formatted as "DD MMM YYYY" from the most recent completed sale, or "—" if none
- Actions — "View" link + "Edit" button (opens `CustomerSheet` in edit mode)

ShadCN `Pagination` below the table driven by `page` and `total_pages` from the response envelope. Render `Skeleton` rows (at least 6) while loading.

### Step 3: Build the CustomerSheet Component

Create `frontend/components/customers/CustomerSheet.tsx`. Props interface:

- `customer?: Customer` — when provided, sheet is in edit mode
- `open: boolean`
- `onOpenChange: (open: boolean) => void`
- `onSuccess: () => void`

Use ShadCN `Sheet` positioned on the right side. Use React Hook Form with a Zod resolver for validation.

**Fields:**

- `name` — `Input`, required, label "Full Name"
- `phone` — `Input`, required, placeholder "+94XXXXXXXXX", label "Phone Number"
- `email` — `Input` type email, optional, label "Email"
- `gender` — ShadCN `Select` with options Male, Female, Other, label "Gender"
- `birthday` — date picker returning ISO date string, label "Birthday", default `undefined` in create mode
- `tags` — multi-select combobox with predefined options VIP, Regular, Wholesale, Staff, Online plus free-text entry; tags are normalised to upper-case before submission
- `notes` — `Textarea`, optional, label "Notes"

On form submit:

- Create mode: `POST /api/crm/customers/` via TanStack Query `useMutation`
- Edit mode: `PATCH /api/crm/customers/{customer.id}/`

On success: `toast("Customer saved successfully.")`, call `onSuccess()`, close the Sheet by calling `onOpenChange(false)`. Invalidate TanStack Query key `['customers', tenantSlug]`.

Display field-level error messages below each input for server-side validation errors returned in the response envelope.

### Step 4: Build the Customer Detail Page

Create `frontend/app/[tenantSlug]/customers/[customerId]/page.tsx`. Use TanStack Query with key `['customers', tenantSlug, customerId]` fetching from `GET /api/crm/customers/{customerId}/`.

**Profile Header:**

- Avatar circle: initials from first letter of first name + first letter of last name, `background: #F1F5F9`, `color: #1B2B3A`, Inter font, 56 px diameter
- Customer name in Inter `text-2xl font-semibold text-navy`
- Phone and email in muted text below the name
- Tag badges in orange (#F97316)
- "Edit" button on the far right, opens `CustomerSheet` pre-populated with customer data

**Stats Cards (four-card row):**

- Total Spend — JetBrains Mono, `text-navy`
- Average Order Value — JetBrains Mono, labelled "Avg. Order Value"
- Visit Count — integer, labelled "Completed Visits"
- Credit Balance — JetBrains Mono, colour-coded same as the list page

**Tabbed Content** using ShadCN `Tabs`:

- **Purchase History** tab: ShadCN `Table` with columns Date, Receipt No. (JetBrains Mono, last 8 chars of sale ID prefixed "REC-"), Items (count of sale lines), Subtotal (JetBrains Mono), Discount (JetBrains Mono), Total (JetBrains Mono, bold), Payment Method. Rows are clickable — link to the sale receipt if a receipt page exists.
- **Returns** tab: ShadCN `Table` with columns Date, Return No. (JetBrains Mono), Items Returned, Refund Amount (JetBrains Mono), Method.
- **Notes** tab: read-only display of `customer.notes` with an inline "Edit" button.

### Step 5: Configure Cache Invalidation

After any mutation (`create_customer`, `update_customer`, `soft_delete_customer`), invalidate `['customers', tenantSlug]`. TanStack Query's hierarchical key invalidation cascades to both the list query (key `['customers', tenantSlug, filters]`) and the detail query (key `['customers', tenantSlug, customerId]`) because both begin with `['customers', tenantSlug]`.

---

## Expected Output

- `backend/apps/crm/views/customer_views.py` — `CustomerListCreateView` and `CustomerDetailView`
- `backend/apps/crm/serializers/customer_serializer.py` — `CreateCustomerSerializer` and `UpdateCustomerSerializer`
- `backend/apps/crm/urls.py` — URL patterns for customer endpoints
- `frontend/app/[tenantSlug]/customers/page.tsx` — list page with filters and pagination
- `frontend/app/[tenantSlug]/customers/[customerId]/page.tsx` — detail page with stats and tabs
- `frontend/components/customers/CustomerSheet.tsx` — create/edit sheet

---

## Validation

- List page paginates: navigating to page 2 fetches `?page=2` and the table updates.
- Search input debounces: typing triggers a fetch only after 400 ms of inactivity.
- Credit Balance column renders `#22C55E` green for a customer with `credit_balance = 1500.00`.
- Credit Balance renders `#EF4444` red for a customer with `credit_balance = -500.00`.
- Creating a customer via the Sheet immediately appears at the top of the list.
- Soft-deleting a customer from the detail page causes the customer to disappear from the list on next fetch.

---

## Notes

- Credit balance values arrive from the Django API as strings (DRF serialises `DecimalField` as strings in JSON output). Parse with `new Decimal(value)` from the `decimal.js` library before any arithmetic or colour comparison — never use `parseFloat`.
- The birthday date picker should default to `undefined` in create mode and to the customer's existing birthday string in edit mode.
- The `CustomerSheet` Zod schema should coerce `tags` to an array even when the API returns `null` — use `.default([])` on the tags field.
- The detail page's prefetched `sales` data is used only for displaying purchase history. Do not derive `total_spend` or `visit_count` from the prefetched sales array on the frontend — use the server-computed values from `get_customer_by_id` to ensure accuracy.
