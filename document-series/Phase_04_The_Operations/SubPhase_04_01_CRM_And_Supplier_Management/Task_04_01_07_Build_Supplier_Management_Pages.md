# Task 04.01.07 — Build Supplier Management Pages

## Metadata

| Field | Value |
|---|---|
| Task ID | 04.01.07 |
| Complexity | Medium |
| Dependencies | 04.01.01 |
| Produces | `backend/apps/crm/services/supplier_service.py`, DRF views, `frontend/components/suppliers/SupplierSheet.tsx`, `frontend/app/[tenantSlug]/suppliers/page.tsx` |

---

## Objective

Build the supplier management section: paginated list, create/edit Sheet, archive action, and backing DRF views. Supplier management is a CRUD section following the same patterns as customer management but without a detail page — the Sheet is the primary editing surface.

---

## Instructions

### Step 1: Define Phone Number Validation

Create `backend/apps/crm/validators.py`. Define a compiled regex constant:

`PHONE_REGEX = re.compile(r'^(\+94\d{9}|07\d{8})$')`

This accepts:

- International format: `+94` followed by exactly 9 digits (e.g. `+94770000001`)
- Local format: `07` followed by exactly 8 digits, for a total of 10 digits (e.g. `0770000001`)

Define a reusable validator function:

`def validate_phone(value: str) -> str:` — strip the value, apply the regex, raise `ValueError("Phone number must be in +94XXXXXXXXX or 07XXXXXXXX format")` if it does not match, and return the stripped value on success.

Export `PHONE_REGEX` and `validate_phone` so they can be imported by both the service layer and the DRF serializer's `validate_phone` method.

### Step 2: Create the Supplier Service

Create `backend/apps/crm/services/supplier_service.py`. Import `Count` from `django.db.models`, `Supplier` from `backend.apps.crm.models`, and `validate_phone` from `backend.apps.crm.validators`.

**`create_supplier(tenant_id, data: dict) -> Supplier`:**

Validate phone using `validate_phone(data['phone'])` — raise `ValueError` on failure. If `whatsapp_number` is not provided in `data` or is an empty string, default it to the same value as `phone`. Call `Supplier.objects.create(tenant_id=tenant_id, **data)` and return the created record.

**`update_supplier(tenant_id, supplier_id, data: dict) -> Supplier`:**

Fetch the supplier with `Supplier.objects.get(id=supplier_id, tenant_id=tenant_id)` — raise `Supplier.DoesNotExist` if not found. If `phone` is being changed, call `validate_phone(data['phone'])`. Call `Supplier.objects.filter(id=supplier_id).update(**data)`. Return the refreshed record from `Supplier.objects.get(id=supplier_id)`.

**`get_suppliers(tenant_id, search=None, include_archived=False, page=1, limit=20) -> dict`:**

Cap `limit` at 100. Build `Supplier.objects.filter(tenant_id=tenant_id)`. If not `include_archived`, add `.filter(is_active=True)`. If `search`: `.filter(Q(name__icontains=search.strip()) | Q(contact_name__icontains=search.strip()))`. Annotate with `purchase_orders_count=Count('purchase_orders')`. Execute count and page slice. Return paginated dict with `{ 'suppliers': list, 'total': total, 'page': page, 'total_pages': ... }`.

**`get_supplier_by_id(tenant_id, supplier_id) -> Supplier`:**

Fetch with `Supplier.objects.annotate(purchase_orders_count=Count('purchase_orders')).get(id=supplier_id, tenant_id=tenant_id)`. Raise `Supplier.DoesNotExist` if not found — mapped to 404 at view layer.

**`archive_supplier(tenant_id, supplier_id) -> Supplier`:**

Fetch to confirm ownership. Call `Supplier.objects.filter(id=supplier_id, tenant_id=tenant_id).update(is_active=False)`. Return the refreshed record.

### Step 3: Build Supplier DRF Views

Create `backend/apps/crm/views/supplier_views.py`. All views use `JWTAuthentication` and `HasTenantPermission`.

**`SupplierListCreateView`** handles `GET` and `POST` at `/api/crm/suppliers/`:

- `GET`: extract `search`, `include_archived` (boolean query param), `page`, `limit`. Call `get_suppliers`. Return 200 with paginated data in success envelope.
- `POST`: validate with `CreateSupplierSerializer`. Call `create_supplier`. Return 201.

**`SupplierDetailView`** handles `PATCH` at `/api/crm/suppliers/{id}/`:

- `PATCH`: validate partial body with `UpdateSupplierSerializer`. Call `update_supplier`. Return 200.

**`SupplierArchiveView`** handles `PATCH` at `/api/crm/suppliers/{id}/archive/`:

- `PATCH`: call `archive_supplier(tenant_id, supplier_id)`. Return 200 with `{ "success": true, "data": { "archived": true } }`.

Create `backend/apps/crm/serializers/supplier_serializer.py` with `CreateSupplierSerializer` and `UpdateSupplierSerializer`. Both include a `validate_phone` method that calls `validate_phone` from `backend.apps.crm.validators` and raises `serializers.ValidationError` on failure. `UpdateSupplierSerializer` marks all fields as optional.

Register URL patterns in `backend/apps/crm/urls.py`.

### Step 4: Build the SupplierSheet Component

Create `frontend/components/suppliers/SupplierSheet.tsx` as a Client Component. Props: `supplier?: Supplier`, `open: boolean`, `onOpenChange: (open: boolean) => void`, `onSuccess: () => void`.

ShadCN `Sheet` on the right side. React Hook Form with Zod resolver.

**Fields:**

- `name` — `Input`, required, label "Supplier Name"
- `contact_name` — `Input`, optional, label "Contact Person"
- `phone` — `Input`, required, placeholder "+94XXXXXXXXX or 07XXXXXXXX", label "Phone"
- `whatsapp_number` — `Input`, optional, label "WhatsApp Number", helper text "Leave blank to use the same number as Phone"
- `email` — `Input` type email, optional, label "Email"
- `address` — `Textarea`, optional, label "Address"
- `lead_time_days` — number `Input`, default `7`, min `1`, max `365`, label "Lead Time (days)"
- `notes` — `Textarea`, optional, label "Notes"

Zod schema: `phone` validated with the pattern `^(\+94\d{9}|07\d{8})$`. Display field-level error "Phone number must be in +94XXXXXXXXX or 07XXXXXXXX format" if invalid.

On submit: `POST /api/crm/suppliers/` for create, `PATCH /api/crm/suppliers/{supplier.id}/` for edit. On success: `toast("Supplier saved.")`, call `onSuccess()`, close sheet. Invalidate `['suppliers', tenantSlug]`.

### Step 5: Build the Supplier List Page

Create `frontend/app/[tenantSlug]/suppliers/page.tsx` as a Client Component. TanStack Query key `['suppliers', tenantSlug, filters]` fetching from `GET /api/crm/suppliers/`.

**Page Header:** "Suppliers" in Inter, "Add Supplier" button on the right opens `SupplierSheet` in create mode.

**Controls row:** Debounced search `Input` (400 ms) filtering by name or contact name. ShadCN `Switch` labelled "Show archived" — when toggled on, adds `include_archived=true` to the query.

**Navigation banner** below the page title: a text link "→ Purchase Orders" navigating to `frontend/app/[tenantSlug]/suppliers/purchase-orders/page.tsx`.

**ShadCN `Table`** with columns:

- Name — Inter, clicking the row opens `SupplierSheet` in edit mode (no separate detail page)
- Contact — `contact_name`, muted
- Phone — monospace
- WhatsApp — if `whatsapp_number` equals `phone`, render "Same as phone" in `#64748B` (text-muted); otherwise render the number
- Lead Time — ShadCN `Badge` with text "N days", `variant="outline"`
- PO Count — integer linking to the PO list page filtered by this supplier
- Actions — "Edit" button (opens `SupplierSheet`), "Archive" button (opens `AlertDialog`)

**Archive `AlertDialog`:**

Title: "Archive [supplier.name]?"

Description: "They will no longer appear in new purchase order selections. Existing purchase orders are not affected."

Buttons: "Cancel" (dismiss) and "Archive" (destructive style). On confirm: TanStack Query `useMutation` to `PATCH /api/crm/suppliers/{id}/archive/`. On success: `toast("Supplier archived.")`, invalidate `['suppliers', tenantSlug]`.

---

## Expected Output

- `backend/apps/crm/validators.py` — `PHONE_REGEX` and `validate_phone`
- `backend/apps/crm/services/supplier_service.py` — five service functions
- `backend/apps/crm/views/supplier_views.py` — three DRF view classes
- `backend/apps/crm/serializers/supplier_serializer.py` — two serializers with phone validation
- `frontend/components/suppliers/SupplierSheet.tsx` — create/edit sheet
- `frontend/app/[tenantSlug]/suppliers/page.tsx` — list page with archive action

---

## Validation

- Phone `07XXXXXXXX` (10 digits starting with 07) is accepted.
- Phone `+94XXXXXXXXX` (international format, 12 chars) is accepted.
- Phone `0770000001` is accepted (same pattern, different prefix).
- Phone `0112000001` (starting with 011) is rejected — only `07` prefix for local format.
- Invalid phone format returns a `400` validation error with the correct message from the serializer.
- Archived supplier disappears from the list when the "Show archived" toggle is off.
- Archived supplier appears in the list when the "Show archived" toggle is on.
- Archiving a supplier with existing POs does not affect those PO records.

---

## Notes

- There is deliberately no supplier detail page. Suppliers have a relatively small number of data fields and the Sheet provides sufficient editing surface without the complexity of a separate route.
- The `whatsapp_number` default-to-phone logic is applied at the service layer (`create_supplier`), not in the serializer. The serializer passes `whatsapp_number` through even when empty; the service decides the effective value. This keeps the validation layer clean.
- The `purchase_orders_count` annotation on `get_suppliers` avoids N+1 queries for the PO count column in the supplier list.
