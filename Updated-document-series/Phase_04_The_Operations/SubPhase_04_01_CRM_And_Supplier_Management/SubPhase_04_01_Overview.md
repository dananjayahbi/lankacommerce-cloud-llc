# SubPhase 04.01 — CRM and Supplier Management

## Metadata

| Field | Value |
|---|---|
| SubPhase ID | 04.01 |
| Name | CRM and Supplier Management |
| Phase | Phase 04 — The Operations |
| Status | Planned |
| Complexity | High |
| Estimated Tasks | 12 |
| Prerequisites | SubPhase_03_01 + SubPhase_03_02 + SubPhase_03_03 complete |
| Owner | Backend + Frontend |

---

## Objective

Establish the relational backbone connecting LankaCommerce to its customers and suppliers. This sub-phase introduces full CRM capabilities — customer profiles, purchase history, store credit redemption at the POS terminal, birthday automation via WhatsApp, a marketing broadcast builder, and bulk CSV import. It also delivers the complete supplier and procurement cycle: supplier profiles, Purchase Orders with a defined status machine, a Goods Receiving workflow that integrates with the existing `adjust_stock` service in `backend/apps/pos/services/inventory_service.py`, and WhatsApp dispatch of purchase orders directly to supplier contacts.

---

## In Scope

- `Customer`, `Supplier`, `PurchaseOrder`, `PurchaseOrderLine`, `CustomerBroadcast`, and `BirthdayGreetingLog` Django models in `backend/apps/crm/models.py`
- `POStatus` and `Gender` TextChoices enumerations
- Customer service layer in `backend/apps/crm/services/customer_service.py`
- Supplier service layer in `backend/apps/crm/services/supplier_service.py`
- Purchase Order service layer in `backend/apps/crm/services/purchase_order_service.py`
- PO WhatsApp formatter in `backend/apps/crm/utils/po_formatter.py`
- All DRF views in `backend/apps/crm/views/`
- Customer list page, detail page, create/edit Sheet component
- Customer CSV import view and `ImportCustomersSheet` frontend component
- Birthday greeting cron DRF view secured by CRON_SECRET
- WhatsApp broadcast builder page and DRF view (capped at 200 recipients)
- POS customer linking, store credit toggle, and sale view integration
- `CustomerSearchDropdown` component and Zustand cart store extensions
- Supplier list page, `SupplierSheet` component, and archive action
- Purchase Order list page, new PO form, PO detail page
- `GoodsReceivingModal` component with `cost_prices_changed` AlertDialog
- PO WhatsApp dispatch view and wired button on the PO detail page
- Demo seed management command at `backend/apps/crm/management/commands/seed_demo_crm.py`

---

## Out of Scope

- Email marketing campaigns
- Accounts payable ledger or accounting integrations
- Multi-location inventory distribution triggered by purchase orders
- Mobile or PWA customer-facing experience
- Loyalty points or tier-based reward systems
- Asynchronous batch queuing for broadcast sends (synchronous, hard-capped at 200 recipients per request)

---

## Technical Context

### Customer Credit Balance Design

`Customer.credit_balance` is a signed `DecimalField`. A positive value means the store owes the customer money — typically store credit from a refund processed in SubPhase_03_03. A negative value means the customer owes the store. At the POS terminal, only positive balances are presented as a payment offset.

The `redeem_credit` service function uses Django's `F()` expression to decrement the balance atomically inside the active `transaction.atomic()` block enclosing the sale — never a read-then-write pattern. The `apply_credit_to_cart` function is a read-only pre-flight validation confirming the requested amount does not exceed the current balance.

### PO Status Machine

The Purchase Order status transitions are strictly enforced at the service layer:

- `DRAFT` → `SENT` (via WhatsApp dispatch)
- `DRAFT` → `CANCELLED`
- `SENT` → `PARTIALLY_RECEIVED` or `RECEIVED` (via goods receiving)
- `SENT` → `CANCELLED`
- `PARTIALLY_RECEIVED` → `RECEIVED` (via subsequent receiving session)

Once a PO reaches `RECEIVED`, it is immutable. The `status` field participates in a `(tenant, status)` composite index for efficient list-page filtering.

### Cost Price Update on Receiving

When staff enter an `actual_cost_price` during goods receiving that differs from the current `ProductVariant.cost_price`, the service updates the cost price inside the same `transaction.atomic()` block. The API response includes a `cost_prices_changed` list containing `{ variant_id, variant_description, old_cost_price, new_cost_price }` entries. If the list is non-empty, the frontend renders a follow-up `AlertDialog` listing the affected variants — this is informational only, since the database update has already committed.

### WhatsApp Integration

Birthday greetings and PO dispatch both use `send_whatsapp_message` from `backend/apps/pos/utils/whatsapp.py`, established in SubPhase_03_02. The birthday cron endpoint is a DRF view secured by a `CRON_SECRET` environment variable validated against the `Authorization: Bearer` header using `hmac.compare_digest()`. Broadcast sends are synchronous and hard-capped at 200 recipients per request to avoid timeout failures.

### Django App Structure

All new models, services, views, serializers, and management commands for this sub-phase live in `backend/apps/crm/`. The app is registered in Django settings under `INSTALLED_APPS`. URL patterns for DRF views are rooted at `/api/crm/`.

---

## Task Breakdown

| Task ID | Name | Complexity | Key Dependencies |
|---|---|---|---|
| 04.01.01 | Create Customer and Supplier Models | Medium | Phase 03 schema migrated |
| 04.01.02 | Build Customer Service Layer | High | 04.01.01 |
| 04.01.03 | Build Customer Management Pages | High | 04.01.02 |
| 04.01.04 | Build POS Customer Linking and Store Credit | High | 04.01.02 + SubPhase_03_01 |
| 04.01.05 | Build Birthday and Broadcast WhatsApp | High | 04.01.01 + SubPhase_03_02 |
| 04.01.06 | Build Customer CSV Import | Medium | 04.01.01 + 04.01.03 |
| 04.01.07 | Build Supplier Management Pages | Medium | 04.01.01 |
| 04.01.08 | Build Purchase Order Service | High | 04.01.01 + SubPhase_02_03 |
| 04.01.09 | Build Purchase Order Pages | High | 04.01.08 + 04.01.07 |
| 04.01.10 | Build Goods Receiving Modal | Medium | 04.01.08 + 04.01.09 |
| 04.01.11 | Build PO WhatsApp Dispatch | Medium | 04.01.08 + 04.01.09 + SubPhase_03_02 |
| 04.01.12 | Seed Demo CRM Data | Low | 04.01.01 + Task_03_02_12 |

---

## Validation Criteria

- All six Django models (`Customer`, `Supplier`, `PurchaseOrder`, `PurchaseOrderLine`, `CustomerBroadcast`, `BirthdayGreetingLog`) import cleanly in the Django shell with no errors.
- `poetry run python manage.py migrate --check` confirms no pending migrations.
- Customer list page paginates, filters by search/tag/spend band, and renders credit balance in colour-coded JetBrains Mono.
- Creating a customer via the Sheet appears immediately in the list without a full page reload.
- Linking a customer in the POS cart shows name and available credit balance.
- Completing a sale with store credit applied decrements `credit_balance` and increments `total_spend` atomically.
- Birthday cron endpoint returns 401 without a valid CRON_SECRET token.
- Broadcast endpoint returns 422 when recipient count exceeds 200.
- CSV import of a 10-row file returns `{ imported: 10, skipped: 0, errors: [] }`.
- Supplier archive hides the supplier from the default list.
- PO creation with empty lines is blocked both client-side and server-side.
- `receive_po_lines` increments variant stock quantities and sets PO status atomically.
- PO WhatsApp dispatch advances status from DRAFT to SENT on success and leaves it DRAFT on WhatsApp API failure.
- `poetry run python manage.py seed_demo_crm` is idempotent — a second run prints "already seeded" and creates no duplicate records.

---

## Files Created in This Sub-Phase

- `backend/apps/crm/__init__.py`
- `backend/apps/crm/apps.py`
- `backend/apps/crm/models.py`
- `backend/apps/crm/urls.py`
- `backend/apps/crm/serializers/customer_serializer.py`
- `backend/apps/crm/serializers/supplier_serializer.py`
- `backend/apps/crm/serializers/purchase_order_serializer.py`
- `backend/apps/crm/services/customer_service.py`
- `backend/apps/crm/services/supplier_service.py`
- `backend/apps/crm/services/purchase_order_service.py`
- `backend/apps/crm/views/customer_views.py`
- `backend/apps/crm/views/customer_import_view.py`
- `backend/apps/crm/views/broadcast_view.py`
- `backend/apps/crm/views/cron_views.py`
- `backend/apps/crm/views/supplier_views.py`
- `backend/apps/crm/views/purchase_order_views.py`
- `backend/apps/crm/utils/po_formatter.py`
- `backend/apps/crm/validators.py`
- `backend/apps/crm/management/__init__.py`
- `backend/apps/crm/management/commands/__init__.py`
- `backend/apps/crm/management/commands/seed_demo_crm.py`
- `frontend/stores/cartStore.ts` (modified)
- `frontend/components/customers/CustomerSheet.tsx`
- `frontend/components/customers/CustomerSearchDropdown.tsx`
- `frontend/components/customers/ImportCustomersSheet.tsx`
- `frontend/components/suppliers/SupplierSheet.tsx`
- `frontend/components/suppliers/GoodsReceivingModal.tsx`
- `frontend/components/pos/CartPanel.tsx` (modified)
- `frontend/app/[tenantSlug]/customers/page.tsx`
- `frontend/app/[tenantSlug]/customers/[customerId]/page.tsx`
- `frontend/app/[tenantSlug]/customers/broadcast/page.tsx`
- `frontend/app/[tenantSlug]/suppliers/page.tsx`
- `frontend/app/[tenantSlug]/suppliers/purchase-orders/page.tsx`
- `frontend/app/[tenantSlug]/suppliers/purchase-orders/new/page.tsx`
- `frontend/app/[tenantSlug]/suppliers/purchase-orders/[poId]/page.tsx`
- `backend/apps/pos/models.py` (modified — `customer` and `salesperson` FK fields added to `Sale`)
- `backend/apps/pos/views/sale_views.py` (modified — `customer_id`, `applied_store_credit` support)
