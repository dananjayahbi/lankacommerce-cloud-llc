# Task 02.03.07 — Implement Low Stock Threshold Notifications

## Metadata

| Field | Value |
|---|---|
| Task ID | 02.03.07 |
| Task Name | Implement Low Stock Threshold Notifications |
| Parent Sub-Phase | SubPhase_02_03 |
| Complexity | Medium |
| Dependencies | Task_02_03_02 complete |
| Output Paths | `backend/apps/notifications/models.py`, `backend/apps/catalog/services/inventory_service.py` (modified), `frontend/components/notifications/NotificationPopover.tsx` |

---

## Objective

Implement the full in-app notification system for low stock threshold alerts. When any stock adjustment causes a variant's quantity to reach or drop below its `low_stock_threshold`, the system must atomically create `Notification` records for all OWNER and MANAGER users of the tenant, surface an immediate warning toast to the adjusting user, and display persistent in-app notifications accessible via a bell icon in the top navigation bar. Notifications are delivered per-variant and per-recipient for full traceability, not as aggregated summaries.

---

## Step 1 — Create the Notification Django App and Model

Create a new Django application at `backend/apps/notifications/`. This is a dedicated app for all notification concerns and must not be placed inside the catalog or accounts apps.

In `backend/apps/notifications/models.py`, define the `Notification` model with the following fields:

**`id`** — a UUID primary key using Django's `UUIDField` with `default=uuid.uuid4` and `editable=False`.

**`tenant`** — a `ForeignKey` to the `Tenant` model from `backend/apps/accounts/`, with `on_delete=CASCADE`. Every notification belongs to exactly one tenant.

**`recipient`** — a `ForeignKey` to the `User` model from `backend/apps/accounts/`, with `on_delete=CASCADE`. This is the user who will see the notification in their popover.

**`notification_type`** — a `CharField` using a `NotificationType` inner class that inherits from `models.TextChoices`. Define the following choice values: `LOW_STOCK_ALERT`, `STOCK_TAKE_SUBMITTED`, `STOCK_TAKE_APPROVED`, `STOCK_TAKE_REJECTED`, and `SYSTEM_ALERT`.

**`title`** — a non-nullable `CharField` with a maximum length of 255 characters. This is the short notification heading.

**`body`** — a non-nullable `TextField`. This is the longer notification description shown in the popover.

**`related_entity_type`** — a nullable `CharField` with a maximum length of 100 characters. Store the Django model class name of the entity this notification relates to, for example "ProductVariant" or "StockTakeSession".

**`related_entity_id`** — a nullable `CharField` with a maximum length of 100 characters. Store the string representation of the related entity's primary key.

**`is_read`** — a `BooleanField` defaulting to `False`. Updated when the recipient reads or dismisses the notification.

**`created_at`** — a `DateTimeField` with `auto_now_add=True`.

Add a `Meta` inner class with two composite database indexes: one on `[tenant_id, recipient_id, is_read]` for efficiently fetching unread notifications for a user, and one on `[tenant_id, recipient_id, created_at]` for efficiently fetching the most recent notifications ordered by creation time.

Register `backend.apps.notifications` in the `INSTALLED_APPS` list in `backend/settings.py`. Then run `poetry run python manage.py makemigrations notifications` followed by `poetry run python manage.py migrate` to apply the migration to the database.

---

## Step 2 — Extend adjust_stock in inventory_service.py

Open `backend/apps/catalog/services/inventory_service.py` and locate the `adjust_stock` function. After the main stock adjustment logic completes and the resulting `new_quantity` has been computed and persisted, add the low-stock notification logic. This logic must remain inside the same `transaction.atomic()` block that handles the quantity update and `StockMovement` creation, ensuring all three operations succeed or fail together — there must never be a committed stock adjustment without the corresponding notification records.

The notification logic proceeds as follows: first check whether the variant has a configured `low_stock_threshold` that is greater than zero. If `low_stock_threshold` is zero or `None`, skip notification creation entirely — a threshold of zero is the same as no threshold. If a threshold is configured, check whether `new_quantity` is less than or equal to `low_stock_threshold`. If it is, proceed to create notifications; otherwise do nothing.

To create notifications, query all `User` records for the tenant whose role is `OWNER` or `MANAGER`. For each such user, create one `Notification` record with the following field values: `notification_type` set to `LOW_STOCK_ALERT`, `title` set to a string formatted as "[Product Name — SKU] is low on stock", `body` set to a descriptive message including the current stock level, the configured threshold, and the name of the adjusting user (for example: "Current stock: 2 units. Threshold: 5 units. Adjusted by: Priya Senanayake."), `related_entity_type` set to "ProductVariant", and `related_entity_id` set to the string form of the variant's ID.

After creating all notifications, the function should return metadata to the caller indicating that a low-stock threshold was crossed. Specifically, return `low_stock_triggered: True` along with the `new_quantity` and the `low_stock_threshold` value. The calling Django view will include this boolean in the API response body for the frontend to consume.

---

## Step 3 — Implement the Same Pattern in bulk_adjust_stock

Open `backend/apps/catalog/services/inventory_service.py` and locate the `bulk_adjust_stock` function. After all variants in the bulk adjustment have been processed and their new quantities determined, collect the subset of variants whose `new_quantity` is at or below their `low_stock_threshold` (applying the same zero-threshold exclusion check as in Step 2).

For this at-risk subset, determine the set of OWNER and MANAGER users for the tenant (a single query shared across all variants in the batch). Then prepare a list of `Notification` instances — one per affected variant per recipient user — using Python list comprehension without saving to the database yet. Once all instances are prepared, call `Notification.objects.bulk_create([...])` with `ignore_conflicts=False` to insert them all in a single database round-trip.

Each recipient receives one notification per affected variant, not a single aggregated notification covering all affected variants in the batch. This maintains full traceability at the variant level and allows the recipient to click through to the specific low-stock list entry for each alert.

All notification creates must remain within the same `transaction.atomic()` block as the bulk quantity updates and bulk `StockMovement` creates.

---

## Step 4 — Build the Notifications API in Django DRF

Create `backend/apps/notifications/views.py` and `backend/apps/notifications/urls.py`.

**`NotificationListView` (GET `/api/notifications/`):** Requires `JWTAuthentication`. No special RBAC permission is needed beyond being an authenticated user belonging to an active tenant — every user can read their own notifications. Supported query parameters: `limit` (integer, default 10, maximum 50) and `include_read` (boolean string "true"/"false", default "false"). Query `Notification` records where `tenant_id` matches the authenticated user's tenant and `recipient_id` matches the authenticated user's ID, filtering out `is_read=True` records unless `include_read=true`. Order by `created_at` descending. Additionally compute `total_unread` as a separate count query for records where `is_read=False` for this recipient — this count drives the notification badge regardless of the `limit` parameter. Return the standard response envelope: a JSON object with `success: true` and `data` containing a `notifications` array and a `total_unread` integer.

**`MarkNotificationReadView` (PATCH `/api/notifications/{id}/read/`):** Requires `JWTAuthentication`. Fetch the `Notification` by `id`, verify `recipient_id` matches the authenticated user, set `is_read=True`, save, and return the updated notification. Return 404 if not found or if the notification belongs to a different user.

**`MarkAllReadView` (PATCH `/api/notifications/read-all/`):** Requires `JWTAuthentication`. Perform a bulk update: `Notification.objects.filter(tenant_id=tenant_id, recipient_id=user_id, is_read=False).update(is_read=True)`. Return a response with the count of records updated.

Register all three URL patterns in `backend/apps/notifications/urls.py` and include the `notifications` app URLs in `backend/urls.py` under the prefix `/api/notifications/`.

---

## Step 5 — Build the NotificationPopover Frontend Component

Create `frontend/components/notifications/NotificationPopover.tsx` as a client component. This component lives in the top navigation bar and is rendered for every authenticated dashboard user.

Use a TanStack Query hook calling `GET /api/notifications/` with a stale time of 30 seconds. The automatic background refetch keeps the unread count reasonably current without real-time WebSocket infrastructure.

**Bell Icon and Badge.** Render a clickable bell icon button in the top navigation bar. If `total_unread` is greater than zero, overlay a small circular badge on the upper-right of the bell icon. The badge uses the orange (#F97316) background with white text and displays the unread count. If the count exceeds 99, display "99+" to prevent layout overflow. When `total_unread` is zero, render the bell icon without any badge.

**Popover Panel.** When the bell icon is clicked, open a ShadCN `Popover` anchored below the bell icon. The popover has a maximum height with an internal scroll area so it does not overflow small screens. At the top of the popover, render a header row containing the title "Notifications" in Inter semibold and a "Mark all as read" text link. The "Mark all as read" link is only rendered when `total_unread > 0`; clicking it calls `PATCH /api/notifications/read-all/` and then invalidates the notifications query to trigger a refetch.

**Notification Items.** Each notification entry in the list contains: the notification `title` in Inter medium, the `body` in muted Inter at a smaller font size, the `created_at` formatted as a relative timestamp such as "5 minutes ago" or "2 hours ago", and a small blue dot indicator (#3B82F6) on the left edge for notifications where `is_read` is `false`. The dot disappears once a notification is read.

When a notification item is clicked, perform two actions: send `PATCH /api/notifications/{id}/read/` to mark it read, and then navigate based on the `related_entity_type`. If `related_entity_type` is "ProductVariant", navigate to the low-stock list page. If `related_entity_type` is "StockTakeSession", navigate to the session review page. If `related_entity_type` is null or unrecognised, simply close the popover.

When the notifications list is empty (no unread and `include_read` is false), render an empty state within the popover: "No new notifications."

---

## Step 6 — Wire the Low Stock Toast

In the stock adjustment form at `frontend/app/dashboard/[tenantSlug]/stock-control/adjust/page.tsx`, update the submission success handler to inspect the `low_stock_triggered` boolean in the API response body. This value is returned by the backend when the adjustment caused the variant to reach or drop below its threshold.

When `low_stock_triggered` is `true`, display a second toast notification after the standard success toast. This warning amber (#F59E0B) styled toast contains a message formatted as: "Low stock alert: [Variant SKU] has fallen to [N] units, below the threshold of [T] units." Use JetBrains Mono for the SKU value within the toast message. This gives the adjusting user immediate visibility of the threshold crossing even if they do not open the notification popover. Both toasts should be visible simultaneously — do not delay the warning toast until the success toast has dismissed.
