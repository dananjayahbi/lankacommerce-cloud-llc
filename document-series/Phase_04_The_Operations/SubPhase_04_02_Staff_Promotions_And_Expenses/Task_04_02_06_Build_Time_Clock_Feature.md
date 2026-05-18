# Task 04.02.06 — Build Time Clock Feature

## Metadata

| Field | Value |
|---|---|
| Task ID | 04.02.06 |
| SubPhase | 04.02 — Staff, Promotions and Expenses |
| Complexity | Medium |
| Estimated Effort | 1.5 days |
| Dependencies | Task 04.02.01 (`TimeClock` model migrated); Task 04.02.02 (staff detail page and placeholder tab in place) |
| Produces | `backend/apps/hr/views/timeclock_views.py`, `backend/apps/hr/services/timeclock_service.py`, `frontend/app/[tenantSlug]/components/TimeClockWidget.tsx`, updated `frontend/app/[tenantSlug]/staff/[staffId]/components/TimeClockHistory.tsx` |
| Blocked By | Task 04.02.01, Task 04.02.02 |

---

## Objective

Allow authenticated staff to clock in and out from the main dashboard using a persistent widget. Time clock records are stored as `TimeClock` entries and the user's `clocked_in_at` field is kept in sync atomically. Managers can view the complete clock history for any staff member, and an optional `auto_clock_in` parameter links the clock-in event to the POS shift being opened. This task replaces the placeholder `TimeClockHistory.tsx` tab with a full implementation.

---

## Instructions

### Step 1: Extract the Clock-In Logic to a Service Function

Create `backend/apps/hr/services/timeclock_service.py`. This file extracts the clock-in business logic into a standalone service function so that both `ClockInView` and the POS shift view can call it without duplicating code.

Define `clock_in_for_user(tenant_id, user_id, shift_id=None)`:
1. `from django.utils import timezone; now = timezone.now()`.
2. Fetch `user = User.objects.select_for_update().get(id=user_id, tenant_id=tenant_id)`.
3. If `user.clocked_in_at is not None`: raise `AlreadyClockedInError(f"User is already clocked in since {user.clocked_in_at.isoformat()}")`. Define `AlreadyClockedInError` as a custom exception class in this file: `class AlreadyClockedInError(Exception): pass`.
4. Inside `with transaction.atomic():` (wrapping the `select_for_update` query as well — move the fetch inside the atomic block): `time_clock = TimeClock.objects.create(tenant_id=tenant_id, user_id=user_id, clocked_in_at=now, shift_id=shift_id)`. `User.objects.filter(id=user_id).update(clocked_in_at=now)`.
5. Return `time_clock`.

Define `clock_out_for_user(tenant_id, user_id, notes='')`:
1. `now = timezone.now()`.
2. Inside `with transaction.atomic():`: fetch `user = User.objects.select_for_update().get(id=user_id, tenant_id=tenant_id)`. If `user.clocked_in_at is None`: raise `NotClockedInError("User is not currently clocked in.")`. Find open session: `time_clock = TimeClock.objects.filter(user_id=user_id, clocked_out_at__isnull=True).order_by('-clocked_in_at').select_for_update().first()`. `TimeClock.objects.filter(id=time_clock.id).update(clocked_out_at=now, notes=notes)`. `User.objects.filter(id=user_id).update(clocked_in_at=None)`. Compute: `duration_minutes = int((now - time_clock.clocked_in_at).total_seconds() / 60)`.
3. Refresh from DB: `time_clock.refresh_from_db()`.
4. Return `(time_clock, duration_minutes)`.

Also define `NotClockedInError(Exception): pass`.

### Step 2: Build the Clock-In DRF View

Create `backend/apps/hr/views/timeclock_views.py`. Import `clock_in_for_user`, `clock_out_for_user`, `AlreadyClockedInError`, `NotClockedInError` from `backend.apps.hr.services.timeclock_service`.

Define `ClockInView` extending `APIView` with `JWTAuthentication` and `HasTenantPermission`.

**`post` method** — `POST /api/hr/timeclock/clock-in/`:
1. Validate optional `shift_id` (UUIDField, optional) from request body.
2. Call `clock_in_for_user(tenant_id=user.tenant_id, user_id=user.user_id, shift_id=shift_id)`.
3. On `AlreadyClockedInError as e`: return 409 with `{ "success": false, "error": { "code": "ALREADY_CLOCKED_IN", "message": str(e) } }`.
4. On success: return 201 with `{ "success": true, "data": { "time_clock": serialised_time_clock, "clocked_in_at": time_clock.clocked_in_at.isoformat() } }`.

Define `ClockOutView` extending `APIView`.

**`post` method** — `POST /api/hr/timeclock/clock-out/`:
1. Validate optional `notes` (CharField, max_length 500, optional) from request body.
2. Call `clock_out_for_user(tenant_id=user.tenant_id, user_id=user.user_id, notes=notes or '')`.
3. On `NotClockedInError as e`: return 409 with `{ "success": false, "error": { "code": "NOT_CLOCKED_IN", "message": str(e) } }`.
4. On success: return 200 with `{ "success": true, "data": { "time_clock": serialised_time_clock, "duration_minutes": duration_minutes } }`.

Define `TimeClockHistoryView` extending `APIView`.

**`get` method** — `GET /api/hr/timeclock/`:
1. Parse `user_id` query param (optional UUID, defaults to `user.user_id`).
2. If `user_id != user.user_id`: enforce `user.role in ['MANAGER', 'OWNER']` — return 403 if not.
3. Verify target user belongs to `user.tenant_id`.
4. Parse `page` (positive int, default 1) and `page_size` (max 100, default 20).
5. Query: `qs = TimeClock.objects.filter(tenant_id=user.tenant_id, user_id=user_id).select_related('shift').order_by('-clocked_in_at')`. Paginate.
6. Compute `duration_minutes` for each record: `int((record.clocked_out_at - record.clocked_in_at).total_seconds() / 60)` if `clocked_out_at` is not null, else `None`.
7. Compute aggregate extras: `this_week_minutes = TimeClock.objects.filter(user_id=user_id, clocked_in_at__gte=start_of_week, clocked_out_at__isnull=False).aggregate(...)` using a Python sum over `(r.clocked_out_at - r.clocked_in_at).total_seconds()`. Similarly for this month. Include `total_hours_this_week` and `total_hours_this_month` (as float hours rounded to 1 decimal place) in the response.
8. Return paginated result with aggregates.

Register URLs in `backend/apps/hr/urls.py`:
- `'timeclock/clock-in/'` → `ClockInView.as_view()`, name `'timeclock-clock-in'`.
- `'timeclock/clock-out/'` → `ClockOutView.as_view()`, name `'timeclock-clock-out'`.
- `'timeclock/'` → `TimeClockHistoryView.as_view()`, name `'timeclock-history'`.

### Step 3: Build the TimeClockWidget

Create `frontend/app/[tenantSlug]/components/TimeClockWidget.tsx` as a Client Component.

Import and call `useAuth()` to get `auth.user_id` and `auth.name`.

TanStack Query key `['time-clock-status', auth.user_id]` fetching `GET /api/hr/timeclock/?user_id=${auth.user_id}&page=1&page_size=1` and reading `records[0]` for the latest entry. The widget reads `User.clocked_in_at` via a separate query keyed `['user-profile', auth.user_id]` for the authoritative clock-in time.

**When `clocked_in_at` is non-null (clocked in)**:
- Green indicator dot and "Clocked In" label in Inter 14px.
- Live session duration display (see Step 4).
- "Clock Out" button with `#F97316` (orange) background, `#FFFFFF` text, rounded. On click: `useMutation` to `POST /api/hr/timeclock/clock-out/`. On success: invalidate user profile query, invalidate time-clock-status query. `toast({ description: "You have clocked out." })`. On 409: `toast({ variant: "destructive", description: "You are not clocked in." })`.

**When `clocked_in_at` is null (not clocked in)**:
- Neutral grey dot and "Not Clocked In" label in `text-muted` (#64748B).
- "Clock In" button with `#1B2B3A` (navy) background, `#FFFFFF` text. On click: `useMutation` to `POST /api/hr/timeclock/clock-in/` with no body (no shift linking from the dashboard widget — shift-linked clock-in happens via `auto_clock_in` in the POS terminal). On success: invalidate queries. `toast({ description: "You have clocked in." })`. On 409: `toast({ variant: "destructive", description: "You are already clocked in." })`.

The widget is rendered in the dashboard layout `frontend/app/[tenantSlug]/layout.tsx`, positioned in the navigation header row.

### Step 4: Add the Live Session Timer

Within `TimeClockWidget.tsx`, add a local state `elapsedMinutes: number` initialised to `0`.

When `clocked_in_at` transitions from null to a datetime value, start a `setInterval` in a `useEffect` with a 60-second interval that computes `elapsedMinutes = Math.floor((Date.now() - new Date(clocked_in_at).getTime()) / 60000)` on each tick. Store the initial elapsed minutes when the effect runs (the user may have clocked in before this component mounted).

Define and use a shared formatting utility in `frontend/utils/formatDurationMinutes.ts`:

`export function formatDurationMinutes(minutes: number): string` — returns the string `"Xh Ym"` for any input. Examples: `75 → "1h 15m"`, `59 → "0h 59m"`, `120 → "2h 0m"`. Compute `hours = Math.floor(minutes / 60)` and `mins = minutes % 60`.

Render `formatDurationMinutes(elapsedMinutes)` below the "Clocked In" indicator.

Clean up the interval on component unmount by returning the `clearInterval` function from the `useEffect` cleanup.

### Step 5: Build the TimeClockHistory Tab

Replace the placeholder at `frontend/app/[tenantSlug]/staff/[staffId]/components/TimeClockHistory.tsx`.

**Props**: `staffMember: StaffMember`, `tenantSlug: string`.

TanStack Query key `['staff-timeclock', tenantSlug, staffMember.id, page]` fetching `GET /api/hr/timeclock/?user_id=${staffMember.id}&page=${page}&page_size=20`.

**Summary aggregate chips** at the top: "This Week: Xh Ym", "This Month: Xh Ym" — computed from `total_hours_this_week` and `total_hours_this_month` in the API response. Display using `formatDurationMinutes(hours * 60)`.

ShadCN `Table` with columns: Date, Clock In, Clock Out, Duration, Linked Shift, Notes, Status, Actions.

Column details:
- "Date": formatted as "DD MMM YYYY".
- "Clock In": time formatted as "HH:MM" (24-hour) in Inter.
- "Clock Out": "HH:MM" if `clocked_out_at` is set; "—" if null.
- "Duration": `formatDurationMinutes(duration_minutes)` or "In progress" in `#F59E0B` if null.
- "Linked Shift": if `shift` is non-null, render the shift reference as a link to the shift report; if null, "—".
- "Notes": first 50 characters with ellipsis if longer; full text in a ShadCN `Tooltip` on hover.
- "Status" badge: if `clocked_out_at` is null — "Open" pill with `#F59E0B` background; if set — "Completed" pill with `#64748B` (text-muted) background.
- "Actions": shown only for MANAGER/OWNER role. For open sessions: "Close Session" button.

**Close Session action** (for MANAGER/OWNER only): clicking "Close Session" opens a ShadCN `Dialog` with title "Close Time Clock Session for [staffMember.name]". Fields: `clocked_out_at` datetime picker (required, must not be before `clocked_in_at`), `notes` optional `Textarea`. On submit: `PATCH /api/hr/timeclock/${record.id}/` (add a `TimeClockDetailView` patch handler in `timeclock_views.py` that validates `clocked_out_at >= clocked_in_at`). On success: invalidate query, close dialog, `toast({ description: "Session closed." })`.

Add the `TimeClockDetailView` to `backend/apps/hr/views/timeclock_views.py` at `PATCH /api/hr/timeclock/{id}/`, restricted to MANAGER/OWNER. It updates only `clocked_out_at` and `notes` on the `TimeClock` record identified by `id`, scoped to the authenticated tenant. It also computes and calls `User.objects.filter(id=time_clock.user_id).update(clocked_in_at=None)` to sync the user's denormalised state.

### Step 6: Integrate Clock-In with POS Shift Opening

Open `backend/apps/pos/views/shift_views.py`. In the `OpenShiftView.post` method, after the new `Shift` record is created inside `transaction.atomic()`, add the following optional integration:

1. Parse `auto_clock_in` boolean from the request body (default `False`).
2. If `auto_clock_in is True`: outside the shift transaction (but after it commits), call `clock_in_for_user(tenant_id=user.tenant_id, user_id=user.user_id, shift_id=new_shift.id)` wrapped in a `try/except AlreadyClockedInError:` block. If the user is already clocked in, log a debug message and skip — do not raise an error on the shift-open response.
3. The shift-open response succeeds regardless of the auto-clock-in outcome.

Import `clock_in_for_user` and `AlreadyClockedInError` from `backend.apps.hr.services.timeclock_service` in `shift_views.py`. This import is additive and does not change any existing code path when `auto_clock_in` is not provided.

---

## Expected Output

- `backend/apps/hr/services/timeclock_service.py` with `clock_in_for_user`, `clock_out_for_user`, `AlreadyClockedInError`, `NotClockedInError`.
- `backend/apps/hr/views/timeclock_views.py` with `ClockInView`, `ClockOutView`, `TimeClockHistoryView`, `TimeClockDetailView`.
- `frontend/app/[tenantSlug]/components/TimeClockWidget.tsx` with live timer, clock in/out buttons.
- `frontend/utils/formatDurationMinutes.ts` shared utility.
- `frontend/app/[tenantSlug]/staff/[staffId]/components/TimeClockHistory.tsx` — replaces placeholder.
- Updated `backend/apps/pos/views/shift_views.py` with optional `auto_clock_in` support.

---

## Validation

- Clock in as CASHIER: `User.clocked_in_at` is set, `TimeClock` record created, widget shows "Clocked In" indicator and elapsed time.
- Second clock-in while already clocked in: `POST /api/hr/timeclock/clock-in/` returns 409 with `ALREADY_CLOCKED_IN` code.
- Clock out: `User.clocked_in_at` cleared, `TimeClock.clocked_out_at` set, `duration_minutes` computed correctly.
- Widget session timer increments after 60 seconds (verify by mocking `Date.now()` in a unit test or by inspecting state).
- Open POS Shift with `auto_clock_in=true`: `TimeClock` record created with `shift_id` matching the newly created shift. Shift opens successfully.
- Open POS Shift with `auto_clock_in=true` while already clocked in: shift opens successfully (warning logged), no duplicate `TimeClock` created.
- MANAGER views any staff member's TimeClockHistory: all records visible with "Close Session" button on open entries.
- CASHIER requesting another user's clock history via `GET /api/hr/timeclock/?user_id=[other_id]`: 403.
- `PATCH /api/hr/timeclock/{id}/` with `clocked_out_at` earlier than `clocked_in_at`: 400 validation error.
- `formatDurationMinutes(75)` returns `"1h 15m"` — verify with a unit test in `frontend/utils/formatDurationMinutes.test.ts`.

---

## Notes

The `select_for_update()` in both `clock_in_for_user` and `clock_out_for_user` prevents race conditions if a user somehow submits two simultaneous clock-in requests (e.g., double-tap on a slow connection). The row-level lock ensures only one request reads `clocked_in_at = None` and proceeds; the second will read the updated `clocked_in_at` (set by the first) and raise `AlreadyClockedInError`.

The live timer in `TimeClockWidget.tsx` uses a 60-second interval rather than a 1-second interval because the display format is "Xh Ym" (minute precision). A 1-second interval would update the DOM every second for no visible user benefit and would increase CPU usage on low-end hardware where LankaCommerce POS terminals might operate.

The `total_hours_this_week` and `total_hours_this_month` aggregates in `TimeClockHistoryView` should be computed using Python `timedelta` arithmetic over closed `TimeClock` records — open sessions (null `clocked_out_at`) are excluded from totals because their duration is not yet known. The frontend TimeClockWidget's live timer accounts for open session time separately.
