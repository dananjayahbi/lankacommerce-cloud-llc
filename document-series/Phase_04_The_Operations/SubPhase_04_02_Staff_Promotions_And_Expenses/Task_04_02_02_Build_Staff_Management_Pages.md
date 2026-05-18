# Task 04.02.02 — Build Staff Management Pages

## Metadata

| Field | Value |
|---|---|
| Task ID | 04.02.02 |
| SubPhase | 04.02 — Staff, Promotions and Expenses |
| Complexity | Medium |
| Estimated Effort | 1.5 days |
| Dependencies | Task 04.02.01 (all models migrated) |
| Produces | `backend/apps/hr/views/staff_views.py`, `frontend/app/[tenantSlug]/staff/page.tsx`, `frontend/app/[tenantSlug]/staff/[staffId]/page.tsx`, `StaffTable.tsx`, `CreateStaffModal.tsx`, `ProfileTab.tsx`, three placeholder tab components |
| Blocked By | Task 04.02.01 |

---

## Objective

Build the staff management section of the LankaCommerce operations dashboard. The staff list page presents all users for the authenticated tenant with role-coloured badges and an active/inactive status toggle. The staff detail page provides a tabbed interface — Profile, PIN Management, Commission History, and Time Clock History — with full profile editing on the Profile tab. All pages enforce RBAC: CASHIER and STOCK_CLERK roles are denied access and redirected. The PIN, Commission, and Time Clock tabs are stubbed as placeholders in this task and fully implemented in Tasks 04.02.03, 04.02.05, and 04.02.06.

---

## Instructions

### Step 1: Build the Staff List/Create DRF View

Create `backend/apps/hr/views/staff_views.py`. Define `StaffListCreateView` extending `APIView` with `authentication_classes = [JWTAuthentication]` and `permission_classes = [HasTenantPermission]`.

**`get` method** — `GET /api/hr/staff/`: Query `User.objects.filter(tenant_id=user.tenant_id).order_by('-created_at')`. For each user record, serialise only safe fields: `id`, `name`, `email`, `role`, `is_active`, `commission_rate`, `clocked_in_at`, `created_at`. Never include `password`, `hashed_pin`, or any credential field in the response. Return the list wrapped in `{ "success": true, "data": [...] }`.

**`post` method** — `POST /api/hr/staff/`: Enforce `user.role in ['MANAGER', 'OWNER']` — return 403 if not. Validate the request body with `CreateStaffSerializer` accepting `name` (CharField, required), `email` (EmailField, required — validate uniqueness across the tenant), `role` (ChoiceField over the role enum — must not include `SUPER_ADMIN`), `commission_rate` (DecimalField, optional, min 0, max 100). Create the new `User` with `tenant_id = user.tenant_id`. Set `is_active = True` by default. Do not set a password or PIN at creation — the user's PIN is assigned separately in Task 04.02.03. Return 201 with the created user record.

### Step 2: Build the Staff Detail DRF View

In the same `backend/apps/hr/views/staff_views.py`, define `StaffDetailView` extending `APIView` with the same authentication and permission classes.

**`get` method** — `GET /api/hr/staff/{id}/`: Query `User.objects.get(id=id, tenant_id=user.tenant_id)`. Return 404 if not found. Serialise the full profile (excluding credential fields). Additionally compute and include `has_pin: bool` — `True` if `user.hashed_pin` is non-null and non-empty — so the frontend can display PIN status without ever receiving the hash.

**`patch` method** — `PATCH /api/hr/staff/{id}/`: Enforce `user.role in ['MANAGER', 'OWNER']`. Validate with `UpdateStaffSerializer` accepting all optional fields: `name`, `email`, `role`, `is_active`, `commission_rate`, `clear_pin` (BooleanField, optional). Apply partial update with `User.objects.filter(id=id, tenant_id=user.tenant_id).update(**validated_data)`. If `is_active=False` and `clear_pin=True` are both present, additionally set `hashed_pin=None` in the same update call. Return 200 with the updated record.

### Step 3: Register URL Patterns

In `backend/apps/hr/urls.py`, define the `urlpatterns` list with:
- Path `'staff/'` → `StaffListCreateView.as_view()`, name `'staff-list-create'`.
- Path `'staff/<uuid:id>/'` → `StaffDetailView.as_view()`, name `'staff-detail'`.

In `backend/config/urls.py`, include `backend.apps.hr.urls` under the prefix `'api/hr/'` with the namespace `'hr'`.

### Step 4: Build the Staff List Page

Create `frontend/app/[tenantSlug]/staff/page.tsx` as a Client Component (add `'use client'` at the top).

Import and call `useAuth()` to get the current user. In a `useEffect`, check `auth.role` — if role is `CASHIER` or `STOCK_CLERK`, call `router.replace(`/${tenantSlug}/dashboard`)` immediately. This redirect prevents the page from rendering at all for unauthorised roles.

Page layout:
- Page header row: Inter heading "Staff" on the left; a staff count subtitle in `text-muted` (#64748B) below it showing "X members"; a "New Staff Member" button on the right using the `orange` (#F97316) accent colour. The button opens `CreateStaffModal`.
- TanStack Query key `['staff', tenantSlug]` fetching `GET /api/hr/staff/`. While loading: ShadCN Skeleton rows. On error: ShadCN `Alert` with "Failed to load staff. Please try again." On success: render `StaffTable` passing the fetched array as `staff` prop.

### Step 5: Build the StaffTable Component

Create `frontend/app/[tenantSlug]/staff/components/StaffTable.tsx`.

**Props**: `staff: StaffMember[]` where `StaffMember` is a TypeScript interface matching the API response fields.

**ShadCN `Table`** with columns: Name, Email, Role, Status, Commission Rate, Actions.

**Role badge colour scheme** — use a `ROLE_BADGE_CONFIG` lookup object defined once at the top of the file (not inline):
- `OWNER`: background `#1B2B3A` (navy), text `#FFFFFF` (surface).
- `MANAGER`: background `#F97316` (orange), text `#FFFFFF` (surface).
- `CASHIER`: background `#E2E8F0` (border), text `#1B2B3A` (navy).
- `STOCK_CLERK`: background `#64748B` (text-muted), text `#FFFFFF` (surface).

Render the badge as a `<span>` with inline style or a Tailwind class that references the config, never hardcoded colour strings scattered in JSX.

**Status column**: ShadCN `Switch` component. `checked={member.is_active}`. On change: call `useMutation` with `PATCH /api/hr/staff/${member.id}/` payload `{ is_active: !member.is_active }`. Use optimistic update — immediately flip the switch in the TanStack Query cache, then revert on error with `toast({ variant: "destructive", description: "Failed to update status." })`. On success, invalidate `['staff', tenantSlug]`.

**Commission Rate column**: Format as "X.XX%" using `Intl.NumberFormat` (2 decimal places). Show "—" (em-dash) if `commission_rate` is null.

**Actions column**: "View" link rendered as a ShadCN `Button` variant `'ghost'` navigating to `/${tenantSlug}/staff/${member.id}`.

### Step 6: Build the CreateStaffModal

Create `frontend/app/[tenantSlug]/staff/components/CreateStaffModal.tsx`.

**Props**: `open: boolean`, `onClose: () => void`.

Wrap in ShadCN `Dialog` with `open={open}` and `onOpenChange={onClose}`. Title "Add Staff Member".

React Hook Form controlled form with Zod schema. Fields:
- `name`: ShadCN `Input`, label "Full Name", required.
- `email`: ShadCN `Input` type `email`, label "Email Address", required.
- `role`: ShadCN `Select` with options OWNER, MANAGER, CASHIER, STOCK_CLERK. Default to CASHIER.
- `commission_rate`: ShadCN `Input` type `number`, label "Commission Rate (%)", shown conditionally when `watch('role') === 'CASHIER'`. Helper text below the input: "Percentage of each sale credited to this staff member. Enter 5 for 5%." Min 0, max 100, step 0.01. Uses `Controller` to handle the numeric input correctly with React Hook Form.

On submit: TanStack Query `useMutation` to `POST /api/hr/staff/`. On success: invalidate `['staff', tenantSlug]`, call `onClose()`, `toast({ description: "Staff member created." })`. On 400 validation error: map server error messages to the corresponding form field using `setError` from React Hook Form (e.g., if the server returns an email uniqueness error, show it under the email field). On 403: `toast({ variant: "destructive", description: "You do not have permission to create staff." })`.

Dialog footer has "Cancel" (variant `'outline'`, calls `onClose()`) and "Create Member" (type `submit`, orange background) buttons. The submit button shows a loading spinner while the mutation is in-flight.

### Step 7: Build the Staff Detail Page Shell

Create `frontend/app/[tenantSlug]/staff/[staffId]/page.tsx` as a Client Component.

TanStack Query key `['staff-member', tenantSlug, staffId]` fetching `GET /api/hr/staff/${staffId}/`. While loading: skeleton layout. On 404: ShadCN `Alert` "Staff member not found." with a back link to `/${tenantSlug}/staff`.

Page layout:
- ShadCN `Breadcrumb` showing: Dashboard → Staff → [member name].
- Staff name rendered in Inter heading (h1, 28px). Role badge inline below the name using the same `ROLE_BADGE_CONFIG` from `StaffTable`. `is_active` badge beside the role: "Active" in `#22C55E` pill or "Inactive" in `#64748B` pill.
- ShadCN `Tabs` component with four tabs labelled "Profile", "PIN Management", "Commission History", "Time Clock History". The default tab is "Profile". Tab content lazy-renders — only the active tab component is mounted.

Each tab renders the corresponding component from the `components/` subdirectory of this page route. The `staffMember` object from the TanStack Query result is passed as a prop to each tab component.

### Step 8: Build the Profile Tab

Create `frontend/app/[tenantSlug]/staff/[staffId]/components/ProfileTab.tsx`.

**Props**: `staffMember: StaffMember`, `tenantSlug: string`.

Display section (read-only mode by default):
- Name: Inter body text.
- Email: `text-muted` (#64748B) colour.
- Role: badge using `ROLE_BADGE_CONFIG`.
- Status: "Active" or "Inactive" pill.
- Commission Rate: formatted as "X.XX%" or "No commission" (if null) in Inter.
- Clock Status: if `clocked_in_at` is non-null, display "Currently clocked in since [formatted time]" with a green dot indicator. If null, display "Not clocked in" in `text-muted` (#64748B).

"Edit Profile" button (ShadCN `Button` variant `'outline'`) switches the component to edit mode, replacing the display section with a React Hook Form controlled form containing the same fields as `UpdateStaffSerializer` (`name`, `email`, `role`, `is_active` toggle, `commission_rate`). The `clear_pin` field is hidden in this tab — PIN management belongs in the PIN tab. A "Save Changes" button and a "Cancel" button are shown. On save: `useMutation` to `PATCH /api/hr/staff/${staffMember.id}/`. On success: invalidate `['staff-member', tenantSlug, staffMember.id]`, switch back to display mode, `toast({ description: "Profile updated." })`.

### Step 9: Scaffold the Three Placeholder Tabs

Create the following three files. Each renders a single ShadCN `Card` with a `CardHeader` title and a `CardContent` paragraph that says "This section is implemented in a later task." These files will be replaced wholesale in Tasks 04.02.03, 04.02.05, and 04.02.06:

- `frontend/app/[tenantSlug]/staff/[staffId]/components/PinManagement.tsx` — Card title "PIN Management".
- `frontend/app/[tenantSlug]/staff/[staffId]/components/CommissionHistory.tsx` — Card title "Commission History".
- `frontend/app/[tenantSlug]/staff/[staffId]/components/TimeClockHistory.tsx` — Card title "Time Clock History".

Each placeholder accepts a `staffMember` prop typed as `StaffMember` to avoid TypeScript errors when the detail page passes it.

---

## Expected Output

- `backend/apps/hr/views/staff_views.py` with `StaffListCreateView` and `StaffDetailView`.
- `backend/apps/hr/urls.py` with staff route registrations.
- `frontend/app/[tenantSlug]/staff/page.tsx` — staff list with role-guard, count subtitle, and "New Staff Member" button.
- `frontend/app/[tenantSlug]/staff/components/StaffTable.tsx` — table with badges, status switch, commission rate, and view link.
- `frontend/app/[tenantSlug]/staff/components/CreateStaffModal.tsx` — dialog with role-aware commission rate field.
- `frontend/app/[tenantSlug]/staff/[staffId]/page.tsx` — detail shell with breadcrumb, header, and four-tab layout.
- `frontend/app/[tenantSlug]/staff/[staffId]/components/ProfileTab.tsx` — display/edit profile.
- Three placeholder tab components.

---

## Validation

- Staff list page renders with role badges using the correct colour scheme for all four roles.
- Toggling `is_active` switch applies an optimistic update, reverts on error, and persists on success.
- Creating a new CASHIER staff member via the modal — the "Commission Rate (%)" field appears; creating a MANAGER — the field is hidden.
- Staff detail page breadcrumb, heading, and role badge display correctly.
- Profile tab shows "Not clocked in" when `clocked_in_at` is null; shows clock-in time when non-null.
- Profile tab "Edit Profile" → edit form → save → display mode cycle works without page reload.
- CASHIER or STOCK_CLERK navigating directly to `/[tenantSlug]/staff` is redirected immediately.
- `GET /api/hr/staff/` response never contains `hashed_pin` or `password` fields — verify with a raw HTTP client.
- `POST /api/hr/staff/` with `role = 'SUPER_ADMIN'` returns 400 validation error.
- `PATCH /api/hr/staff/{id}/` as a CASHIER returns 403.

---

## Notes

The `has_pin` boolean returned by `GET /api/hr/staff/{id}/` is computed in the serializer as `bool(instance.hashed_pin)`. It is a derived field, not stored in the database. This ensures the PIN status is always accurate and the hash is never transmitted over the wire.

The `CreateStaffSerializer` must validate email uniqueness scoped to the tenant — not globally. Two tenants may share an email address if they are separate businesses using LankaCommerce. The validator should run `User.objects.filter(tenant_id=tenant_id, email=value).exists()` where `tenant_id` is passed as context from the view.

The optimistic update in `StaffTable` uses TanStack Query's `onMutate` callback to update the `['staff', tenantSlug]` cache before the request completes, and the `onError` callback to restore the previous cache snapshot. This prevents the toggle from appearing to freeze for the duration of the PATCH request.
