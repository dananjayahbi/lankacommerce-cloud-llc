# Task 05.02.02 — Build Subscription Plan Management

## Metadata

| Field | Value |
|---|---|
| Task ID | 05.02.02 |
| SubPhase | 05.02 — Billing and WhatsApp |
| Complexity | Medium |
| Estimated Effort | 2-3 hours |
| Depends On | 05.02.01 (models migrated) |
| Produces | `backend/apps/billing/views/plan_views.py`, `backend/apps/billing/views/plan_detail_views.py`, `backend/apps/billing/serializers/plan_serializers.py`, `frontend/app/super-admin/plans/page.tsx`, `frontend/components/super-admin/PlanFormDialog.tsx` |
| Blocked By | None |

---

## Objective

Build the Super Admin plan management interface, the only place where `SubscriptionPlan` records are created, read, updated, and soft-deactivated. LankaCommerce uses a fixed set of three plans (STARTER, GROWTH, ENTERPRISE) but Super Admins need the ability to adjust prices, feature sets, and limits over time. This task delivers a DRF viewset for plan CRUD and a polished Next.js 15 management page with a ShadCN Table, a form dialog with features array management, and real-time `is_active` toggling.

There is no DELETE endpoint for subscription plans. Plans are deactivated via setting `is_active = False`, which hides them from the tenant-facing billing page. This prevents accidental data loss on subscriptions that reference a plan through a `PROTECT` foreign key.

---

## Instructions

### Step 1: Create the Plan Serializer

Create `backend/apps/billing/serializers/__init__.py` and `backend/apps/billing/serializers/plan_serializers.py`. Define a `SubscriptionPlanSerializer` as a DRF `ModelSerializer` with the following:

- Include all fields: `id`, `name`, `description`, `monthly_price`, `annual_price`, `max_users`, `max_product_variants`, `features`, `is_active`, `sort_order`, `created_at`, `updated_at`.
- Make `name` read-only on update — plan names should not change after creation since the frontend may depend on them.
- Add a `validate_features` method that checks every element in the list is a string from the `PLAN_FEATURE_ALL` constant. Raise a `ValidationError` with code `"invalid_feature"` if any slug is unrecognised.
- Add a `validate_monthly_price` method that checks the price is greater than zero. Raise a `ValidationError` with code `"invalid_price"` if the value is zero or negative.
- Define a `create` method that calls `super().create(validated_data)` and returns the instance.

### Step 2: Create the Plan List and Create View

Create `backend/apps/billing/views/plan_views.py`. Define a `PlanListView` class using `APIView` (or a `ViewSet` with `list` and `create` actions):

- `GET` handler: Query `SubscriptionPlan.objects.all().order_by('sort_order', 'name')`, serialise with `SubscriptionPlanSerializer(many=True)`, return `{"success": True, "data": serializer.data}`.
- `POST` handler: Require `request.user.role == "SUPER_ADMIN"` using the `HasTenantPermission` utility. Deserialise with `SubscriptionPlanSerializer(data=request.data)`. Call `serializer.is_valid(raise_exception=True)` then `serializer.save()`. Return `{"success": True, "data": serializer.data}` with status 201.
- Set `authentication_classes = [JWTAuthentication]` and `permission_classes = [HasTenantPermission]`.
- Map the URL as `GET /api/billing/admin/plans/` and `POST /api/billing/admin/plans/`.

### Step 3: Create the Plan Detail and Update View

Create `backend/apps/billing/views/plan_detail_views.py`. Define a `PlanDetailView` class:

- `GET` handler: Fetch `SubscriptionPlan.objects.get(id=plan_id)`, serialise, return `{"success": True, "data": serializer.data}`. Return 404 via `get_object_or_404` if not found.
- `PATCH` handler: Require `SUPER_ADMIN` role. Fetch the plan, partial-update serialise with `SubscriptionPlanSerializer(plan, data=request.data, partial=True)`. Call `serializer.is_valid(raise_exception=True)` then `serializer.save()`. Return `{"success": True, "data": serializer.data}`.
- Map the URL as `GET /api/billing/admin/plans/{id}/` and `PATCH /api/billing/admin/plans/{id}/`.

### Step 4: Create the Plan List Page

Create `frontend/app/super-admin/plans/page.tsx` as a Next.js 15 client component with `"use client"`:

- Use `useAuth()` to get the current user. If `user.role !== "SUPER_ADMIN"`, redirect to the dashboard home using `useRouter().push('/')`.
- Fetch plans using `fetch('/api/billing/admin/plans/')` with the `Authorization: Bearer <token>` header. Wrap in a `useQuery` from TanStack Query.
- Render a page header with "Subscription Plans" in `text-2xl font-semibold` using Inter (Playfair Display is dropped per the LankaCommerce typography guidelines). Add a "Create Plan" button to the right that opens the `PlanFormDialog` in create mode.
- Render a ShadCN Table with columns: Name, Monthly Price, Annual Price, Max Users, Max Variants, Features, Active, Actions.
- The Features column renders a `Popover` or `Tooltip` showing all feature labels when hovered, else shows a comma-truncated preview (e.g., "POS Terminal, Product Catalog...").
- The Active column renders a ShadCN `Switch` that calls `PATCH /api/billing/admin/plans/{id}/` with `{is_active: !currentValue}`. Use `useMutation` with optimistic update on the query cache.
- The Actions column has an "Edit" button that opens the `PlanFormDialog` in edit mode pre-filled with the plan data.
- Style table rows with alternating background using `even:bg-muted/20` from the Tailwind design tokens (navy `#1B2B3A`, orange `#F97316`, border `#E2E8F0`, text-muted `#64748B`, background `#F1F5F9`, surface `#FFFFFF`).

### Step 5: Build the Plan Form Dialog

Create `frontend/components/super-admin/PlanFormDialog.tsx` as a client component:

- Accept `open`, `onOpenChange`, `plan` (optional — null for create mode), and `onSuccess` callback props.
- Use a ShadCN `Dialog` containing a `DialogContent` with `DialogHeader` and `DialogTitle` set to "Create Plan" or "Edit Plan" based on whether `plan` is provided.
- Build a form with `react-hook-form` and `zod` validation:
  - `name`: text input, required, max 100 chars. Disabled in edit mode.
  - `description`: textarea, optional.
  - `monthly_price`: number input with `min=0.01`, `step=0.01`, prepended with LKR label.
  - `annual_price`: number input with same constraints.
  - `max_users`: number input with `min=1`.
  - `max_product_variants`: number input with `min=1`.
  - `features`: a multi-select UI built from all constant feature slugs. Each feature is a checkbox with its human-readable label. Selected features are shown as ShadCN `Badge` components that can be removed by clicking the `x` icon.
  - `is_active`: a ShadCN `Switch` in a form field.
  - `sort_order`: number input, hidden under an "Advanced" accordion.
- On submit, call `POST /api/billing/admin/plans/` (create) or `PATCH /api/billing/admin/plans/{id}/` (edit). Use `useMutation`. On success, call `onSuccess`, show a `toast.success("Plan saved")`, and close the dialog.
- Show a loading spinner on the submit button while the mutation is pending.
- Validate that `annual_price` is not less than `monthly_price * 12` (annual discount check — show a warning toast, not a blocking validation error).

### Step 6: Add URL Routing

In `frontend/middleware.ts`, ensure the Super Admin routes bypass the subscription status check. Add the route guard in the matching logic: if the path starts with `/super-admin`, allow access regardless of `subscription_status`. The middleware is implemented in a later task but the route exception must be noted here.

In `backend/config/urls.py` or `backend/apps/billing/urls.py`, register the two plan endpoints:
- `path("api/billing/admin/plans/", PlanListView.as_view(), name="billing-admin-plans-list")`.
- `path("api/billing/admin/plans/<uuid:id>/", PlanDetailView.as_view(), name="billing-admin-plans-detail")`.

---

## Expected Output

- `GET /api/billing/admin/plans/` returns all plans ordered by `sort_order` and `name`
- `POST /api/billing/admin/plans/` creates a new plan with validated features and price
- `PATCH /api/billing/admin/plans/{id}/` updates a plan; name is read-only on update
- `frontend/app/super-admin/plans/page.tsx` renders the plan table with switch toggles and edit dialog
- `PlanFormDialog` creates and edits plans with features array multi-select
- Users without `SUPER_ADMIN` role are redirected; no access to Super Admin routes

---

## Validation

- Logged in as SUPER_ADMIN, navigate to `/super-admin/plans` and confirm the page loads with an empty or populated table
- Click "Create Plan", fill all fields, select 12 features, submit — confirm the plan appears in the table
- Toggle the `is_active` switch on a plan and confirm the switch updates optimistically and stays after page refresh
- Click "Edit" on a plan, change `monthly_price` from 1500 to 1999, save — confirm the table reflects the new price
- Open the same plan in a second tab, edit the name via API directly — confirm the name field is disabled in the dialog
- Submit a plan with `monthly_price = 0` and confirm the serializer returns a 400 validation error
- Submit a plan with `features = ["nonexistent_feature"]` and confirm a 400 validation error with code `"invalid_feature"`
- Log in as an OWNER tenant user, navigate to `/super-admin/plans` directly — confirm redirect to dashboard
- Confirm no DELETE endpoint exists at `/api/billing/admin/plans/{id}/` — a 405 Method Not Allowed is returned

---

## Notes

- Plan names are intentionally read-only on update because the frontend tenant billing page may use plan names for conditional rendering. Changing a plan name would break the display without a corresponding frontend update.
- The features multi-select in `PlanFormDialog` uses all feature slugs from `PLAN_FEATURE_ALL`. If new features are added to `constants.py`, the dialog automatically includes them — no frontend change needed. This is by design for future extensibility.
- The `sort_order` field lets Super Admins reorder plans on the tenant-facing page without changing plan names. A drag-and-drop reorder UI is out of scope for this task; updates are done manually via the edit dialog.
- There is no public-facing list endpoint. Tenants see only the plan they are subscribed to on their billing page. The plan list is Super Admin-only.