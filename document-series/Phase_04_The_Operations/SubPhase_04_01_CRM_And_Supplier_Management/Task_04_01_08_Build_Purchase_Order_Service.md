# Task 04.01.08 — Build Purchase Order Service

## Metadata

| Field | Value |
|---|---|
| Task ID | 04.01.08 |
| Complexity | High |
| Dependencies | 04.01.01 + `adjust_stock` service from SubPhase_02_03 |
| Produces | `backend/apps/crm/services/purchase_order_service.py`, `backend/apps/crm/utils/po_formatter.py` |

---

## Objective

Implement the full Purchase Order service layer: PO creation, querying, status transitions, goods receiving (the integration point with the inventory service), and WhatsApp message formatting. Goods receiving runs inside `transaction.atomic()` calling `adjust_stock` per line.

---

## Instructions

### Step 1: Create the Service File and Define Imports

Create `backend/apps/crm/services/purchase_order_service.py`. Add imports:

- `Decimal` and `ROUND_HALF_UP` from Python's `decimal` module
- `Count` from `django.db.models`
- `F` from `django.db.models`
- `transaction` from `django.db`
- `PurchaseOrder`, `PurchaseOrderLine`, `POStatus`, `Supplier` from `backend.apps.crm.models`
- `adjust_stock` from `backend.apps.pos.services.inventory_service`
- `ProductVariant` from `backend.apps.pos.models` (or wherever it is defined)

### Step 2: Implement create_po

Function signature: `create_po(tenant_id, created_by_id, input_data: dict) -> PurchaseOrder`.

**Validate non-empty lines:**

`lines = input_data.get('lines', [])`. If `len(lines) == 0`, raise `ValueError("A purchase order must have at least one line")`.

**Validate supplier ownership:**

`supplier = Supplier.objects.get(id=input_data['supplier_id'])`. If `supplier.tenant_id != tenant_id`, raise `PermissionError("Supplier does not belong to this tenant")`. If `Supplier.DoesNotExist` is raised, re-raise for 404 mapping.

**Build line objects and compute total:**

For each line dict in `lines`, fetch `variant = ProductVariant.objects.select_related('product').get(id=line['variant_id'])`. Capture `product_name_snapshot = variant.product.name` and `variant_description_snapshot = variant.description or ''`. Compute the line amount as `Decimal(str(line['ordered_qty'])) * Decimal(str(line['expected_cost_price']))`.

Accumulate `total_amount` across all lines using `Decimal` arithmetic with `ROUND_HALF_UP` quantisation to 2 decimal places at the end: `total_amount.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)`.

**Create PO and lines:**

`po = PurchaseOrder.objects.create(tenant_id=tenant_id, supplier=supplier, created_by_id=created_by_id, expected_delivery_date=input_data.get('expected_delivery_date'), notes=input_data.get('notes', ''), total_amount=total_amount, status=POStatus.DRAFT)`

`PurchaseOrderLine.objects.bulk_create([PurchaseOrderLine(purchase_order=po, variant_id=line['variant_id'], product_name_snapshot=product_name_snapshot, variant_description_snapshot=variant_description_snapshot, ordered_qty=line['ordered_qty'], expected_cost_price=Decimal(str(line['expected_cost_price']))) for line, product_name_snapshot, variant_description_snapshot in processed_lines])`

Return `PurchaseOrder.objects.prefetch_related('lines').get(id=po.id)`.

### Step 3: Implement get_po_by_id

Function signature: `get_po_by_id(tenant_id, po_id) -> PurchaseOrder`.

`PurchaseOrder.objects.select_related('supplier', 'created_by', 'tenant').prefetch_related('lines__variant__product').get(id=po_id, tenant_id=tenant_id)`

If `PurchaseOrder.DoesNotExist` is raised, re-raise — the view layer maps it to 404.

### Step 4: Implement get_pos

Function signature: `get_pos(tenant_id, supplier_id=None, status=None, from_date=None, to_date=None, page=1, limit=20) -> dict`.

Cap `limit` at 100. Build base queryset: `PurchaseOrder.objects.filter(tenant_id=tenant_id).select_related('supplier').annotate(lines_count=Count('lines'))`.

Apply conditional filters:

- `supplier_id`: `.filter(supplier_id=supplier_id)`
- `status`: `.filter(status=status)`
- `from_date`: `.filter(created_at__date__gte=from_date)`
- `to_date`: `.filter(created_at__date__lte=to_date)`

Order by `'-created_at'`. Execute count and page slice. Return `{ 'purchase_orders': list, 'total': total, 'page': page, 'total_pages': ... }`.

### Step 5: Implement update_po_status

Function signature: `update_po_status(tenant_id, po_id, new_status: str) -> PurchaseOrder`.

Fetch: `po = PurchaseOrder.objects.get(id=po_id, tenant_id=tenant_id)`.

Define allowed transitions:

`ALLOWED_TRANSITIONS = { POStatus.DRAFT: [POStatus.SENT, POStatus.CANCELLED], POStatus.SENT: [POStatus.CANCELLED] }`

Receiving transitions (`SENT → PARTIALLY_RECEIVED`, `PARTIALLY_RECEIVED → RECEIVED`, `SENT → RECEIVED`) are handled exclusively by `receive_po_lines` — not by `update_po_status`. If `po.status not in ALLOWED_TRANSITIONS` or `new_status not in ALLOWED_TRANSITIONS.get(po.status, [])`, raise `ValueError(f"Cannot transition a purchase order from '{po.status}' to '{new_status}'")`.

`PurchaseOrder.objects.filter(id=po_id).update(status=new_status)`. Return `PurchaseOrder.objects.get(id=po_id)`.

### Step 6: Implement cancel_po

Function signature: `cancel_po(tenant_id, po_id) -> PurchaseOrder`.

A convenience wrapper. Fetch the PO. If `po.status not in [POStatus.DRAFT, POStatus.SENT]`, raise `ValueError("Only DRAFT or SENT purchase orders can be cancelled.")`. Call `update_po_status(tenant_id, po_id, POStatus.CANCELLED)` and return the result.

Note: cancellation does not reverse any stock adjustments because stock changes are recorded only during `receive_po_lines` — no stock changes occur when creating or sending a PO.

### Step 7: Implement receive_po_lines

Function signature: `receive_po_lines(tenant_id, po_id, received_lines: list, actor_id) -> dict`.

`received_lines` is a list of dicts: `[{ 'line_id': uuid, 'received_qty': int, 'actual_cost_price': Decimal | None }]`.

Run the entire body inside `with transaction.atomic():`:

**Step 7a — Lock and validate the PO:**

`po = PurchaseOrder.objects.select_for_update().get(id=po_id, tenant_id=tenant_id)`. The `select_for_update()` acquires a row-level lock preventing concurrent receiving sessions on the same PO.

If `po.status in [POStatus.CANCELLED, POStatus.RECEIVED]`, raise `ValueError(f"Cannot receive goods for a purchase order with status '{po.status}'")`.

**Step 7b — Process each received line:**

Initialise `cost_prices_changed = []`.

For each entry in `received_lines`:

1. Fetch: `line = PurchaseOrderLine.objects.select_for_update().get(id=entry['line_id'], purchase_order_id=po_id)`.
2. Validate `entry['received_qty'] > 0` — raise `ValueError(f"Received quantity must be positive for {line.product_name_snapshot}")`.
3. Compute `remaining = line.ordered_qty - line.received_qty`. Validate `entry['received_qty'] <= remaining` — raise `ValueError(f"Cannot receive more than the ordered quantity for {line.product_name_snapshot}. Ordered: {line.ordered_qty}, Already received: {line.received_qty}, Requested: {entry['received_qty']}")` if exceeded.
4. Call `adjust_stock(variant_id=line.variant_id, delta=entry['received_qty'], reason='PURCHASE_RECEIVED')` — this runs inside the same atomic context and may use a savepoint internally.
5. Compute `updated_received_qty = line.received_qty + entry['received_qty']`. Determine `is_fully_received = updated_received_qty >= line.ordered_qty`.
6. Determine `effective_actual_cost = entry.get('actual_cost_price') or line.actual_cost_price`. Update line: `PurchaseOrderLine.objects.filter(id=line.id).update(received_qty=F('received_qty') + entry['received_qty'], is_fully_received=is_fully_received, actual_cost_price=effective_actual_cost)`.
7. Cost price update: if `entry.get('actual_cost_price')` is provided and is different from `line.variant.cost_price`:
   - Fetch current cost: `old_cost = line.variant.cost_price`.
   - `ProductVariant.objects.filter(id=line.variant_id).update(cost_price=entry['actual_cost_price'])`.
   - Append `{ 'variant_id': str(line.variant_id), 'variant_description': line.variant_description_snapshot, 'old_cost_price': str(old_cost), 'new_cost_price': str(entry['actual_cost_price']) }` to `cost_prices_changed`.

**Step 7c — Determine new PO status:**

Re-fetch all lines: `all_lines = PurchaseOrderLine.objects.filter(purchase_order_id=po_id)`. If `all(l.is_fully_received for l in all_lines)`, new status is `POStatus.RECEIVED`. Elif `any(l.received_qty > 0 for l in all_lines)`, new status is `POStatus.PARTIALLY_RECEIVED`. Else leave status unchanged (should not occur if step 7b succeeded for at least one line).

`PurchaseOrder.objects.filter(id=po_id).update(status=new_status)`.

**Return:**

`{ 'updated_po': PurchaseOrder.objects.prefetch_related('lines').get(id=po_id), 'cost_prices_changed': cost_prices_changed }`.

### Step 8: Implement format_po_for_whatsapp

Create `backend/apps/crm/utils/po_formatter.py`. Define `format_po_for_whatsapp(po) -> str` — a pure Python function with no database calls or imports beyond `decimal`.

**Message structure** (lines listed in order):

1. `po.tenant.name.upper()`
2. `'-' * 30`
3. `f"PURCHASE ORDER {str(po.id)[-8:].upper()}"`
4. `f"Supplier: {po.supplier.name}"`
5. `f"Expected Delivery: {po.expected_delivery_date.strftime('%d/%m/%Y') if po.expected_delivery_date else 'Not specified'}"`
6. `'-' * 30`
7. For each line (1-indexed): `f"{i}. {line.product_name_snapshot} - {line.variant_description_snapshot} | Qty: {line.ordered_qty} | Cost: Rs. {line.expected_cost_price}"`
8. `'-' * 30`
9. `f"TOTAL: Rs. {po.total_amount}"`
10. `"This order was generated by LankaCommerce. Please confirm receipt by replying to this message."`

Join all lines with `\n`. Use only standard ASCII hyphens (`-`) for separators — no Unicode box-drawing characters, no emoji.

---

## Expected Output

- `backend/apps/crm/services/purchase_order_service.py` with seven exported functions: `create_po`, `get_po_by_id`, `get_pos`, `update_po_status`, `cancel_po`, `receive_po_lines`.
- `backend/apps/crm/utils/po_formatter.py` with `format_po_for_whatsapp`.

---

## Validation

- `create_po` with `lines=[]` raises `ValueError("A purchase order must have at least one line")`.
- `cancel_po` on a PO with `status=RECEIVED` raises `ValueError`.
- `receive_po_lines` with `received_qty` exceeding remaining for a line raises a `ValueError` containing the product name.
- After `receive_po_lines`, `ProductVariant.stock_quantity` is incremented by the received quantity.
- If all lines are fully received after a session, PO status becomes `RECEIVED`.
- If only one of two lines is fully received, PO status becomes `PARTIALLY_RECEIVED`.
- `format_po_for_whatsapp` returns a string containing the supplier name, the total amount, and one entry per line.
- Two concurrent `receive_po_lines` calls on the same PO: the second call is serialised by `select_for_update()` and processes after the first commits, rather than both updating simultaneously.

---

## Notes

- `select_for_update()` on the PO row prevents two staff members from simultaneously triggering a receiving session on the same PO — critical when the warehouse team has multiple tablets.
- Django's composable `transaction.atomic()` blocks use savepoints for nested calls. `adjust_stock` may itself use `transaction.atomic()` internally — this creates a savepoint, not a full nested transaction. A failure inside `adjust_stock` rolls back only to the savepoint, allowing the outer transaction to catch and report the error.
- Always use `Decimal(str(value))` when constructing Decimal from a number-like input — never `Decimal(float_value)` due to floating-point precision issues.
- The `format_po_for_whatsapp` function intentionally has no database calls — it receives a fully-prefetched PO object with `po.supplier`, `po.tenant`, and `po.lines` already loaded. The view layer is responsible for prefetching before calling the formatter.
