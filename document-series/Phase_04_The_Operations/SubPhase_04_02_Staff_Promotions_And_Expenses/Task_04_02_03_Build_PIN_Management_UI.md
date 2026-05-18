# Task 04.02.03 — Build PIN Management UI

## Metadata

| Field | Value |
|---|---|
| Task ID | 04.02.03 |
| SubPhase | 04.02 — Staff, Promotions and Expenses |
| Complexity | Medium |
| Estimated Effort | 0.75 days |
| Dependencies | Task 04.02.02 (staff detail page and placeholder tabs in place) |
| Produces | `backend/apps/hr/views/pin_views.py`, `frontend/app/[tenantSlug]/staff/[staffId]/components/PinManagement.tsx` (replaces placeholder) |
| Blocked By | Task 04.02.02 |

---

## Objective

Allow Managers and Owners to securely set or reset a staff member's PIN from the PIN Management tab on the staff detail page. The PIN is used for quick cashier login at the POS terminal (established in SubPhase_01_02). The PIN is hashed using Django's built-in `make_password` function from `django.contrib.auth.hashers`, which uses bcrypt internally at cost factor 12 when configured correctly, ensuring stored credentials are cryptographically safe. This task replaces the placeholder `PinManagement.tsx` from Task 04.02.02 with a fully functional implementation.

---

## Instructions

### Step 1: Build the PIN Management DRF View

Create `backend/apps/hr/views/pin_views.py`.

Define `StaffPINView` extending `APIView` with `authentication_classes = [JWTAuthentication]` and `permission_classes = [HasTenantPermission]`.

**`patch` method** — `PATCH /api/hr/staff/{id}/pin/`:

1. Role check: if `user.role not in ['MANAGER', 'OWNER']`, return 403 with `{ "success": false, "error": { "code": "FORBIDDEN", "message": "Only Managers and Owners can update staff PINs." } }`.

2. Tenant scope check: fetch `target_user = User.objects.filter(id=id, tenant_id=user.tenant_id).first()`. If not found, return 404.

3. Validate request body with `SetPINSerializer`. The serializer defines `new_pin` as a `CharField`. In `validate_new_pin(self, value)`: strip whitespace from both ends. Check `re.match(r'^\d{4,8}$', value)` — if it does not match, raise `serializers.ValidationError("PIN must be 4 to 8 digits.")`. Return the validated (unmodified) value. Do NOT log the value at any point.

4. After successful serializer validation, call `make_password(validated_data['new_pin'])` (import from `django.contrib.auth.hashers`). Assign the returned bcrypt hash string to `target_user.hashed_pin`.

5. Call `target_user.save(update_fields=['hashed_pin'])` to update only that field.

6. Log the action (not the PIN value): `logger.info("PIN updated", extra={"staff_id": str(id), "authorized_by_id": str(user.user_id), "action": "pin_updated"})`.

7. Return 200 with `{ "success": true, "data": { "message": "PIN updated successfully.", "updated_at": timezone.now().isoformat() } }`.

**Never** return the hash or any credential in the response body. **Never** log the raw PIN string.

Register the URL in `backend/apps/hr/urls.py`:

Path `'staff/<uuid:id>/pin/'` → `StaffPINView.as_view()`, name `'staff-pin'`.

### Step 2: Configure bcrypt Cost Factor

Django's `make_password` uses the hasher configured first in the `PASSWORD_HASHERS` setting. To ensure bcrypt is used at cost factor 12, confirm `backend/config/settings.py` has the following order in `PASSWORD_HASHERS`:

`'django.contrib.auth.hashers.BCryptSHA256PasswordHasher'` listed first. The `bcrypt` Python package must be installed: `pip install bcrypt` or added to the project's `pyproject.toml` under dependencies and installed with `poetry add bcrypt`.

If `bcrypt` is not installed, `make_password` falls back to the next hasher in the list. Verify bcrypt is active by calling `identify_hasher(make_password('test'))` in the Django shell — it must return `BCryptSHA256PasswordHasher` (or the bcrypt variant configured).

### Step 3: PIN Clear on Staff Deactivation

In `backend/apps/hr/views/staff_views.py`, update `UpdateStaffSerializer` to add an optional `clear_pin = serializers.BooleanField(required=False, default=False)` field.

In the `patch` method of `StaffDetailView`, after building `validated_data`: if `validated_data.get('is_active') is False and validated_data.pop('clear_pin', False)`, additionally include `hashed_pin=None` in the update payload passed to `User.objects.filter(...).update(...)`.

This ensures that when a manager deactivates a staff member and explicitly requests PIN clearance, the PIN is nullified in the same atomic database write. Deactivated staff cannot use a cached PIN to log into the POS terminal.

Remove `clear_pin` from `validated_data` before passing to the ORM update (it is not a model field — it drives logic only).

### Step 4: Add has_pin to Staff Detail Serializer

Ensure `GET /api/hr/staff/{id}/` includes a computed `has_pin` field. In the serializer for `StaffDetailView`, add a `SerializerMethodField`:

`has_pin = serializers.SerializerMethodField()`

`def get_has_pin(self, obj): return bool(obj.hashed_pin)`

This boolean is the only information the frontend ever receives about the PIN state — never the hash itself.

### Step 5: Build the PinManagement Tab Component

Replace the placeholder at `frontend/app/[tenantSlug]/staff/[staffId]/components/PinManagement.tsx`.

**Props**: `staffMember: StaffMember` (which includes the `has_pin: boolean` field).

**Role guard**: read `auth.role` from `useAuth()`. If `auth.role === 'CASHIER' || auth.role === 'STOCK_CLERK'`, render a ShadCN `Card` containing only a paragraph: "Only Managers and Owners can manage staff PINs." Do not render the form. Return early.

**Layout**: ShadCN `Card` with `CardHeader` containing the title "PIN Management" in Inter. `CardContent` containing:

**PIN Status Indicator** (above the form): a horizontal row with an icon and a status message.
- If `staffMember.has_pin === true`: shield icon in `#22C55E`, text "PIN is set" in Inter 14px.
- If `staffMember.has_pin === false`: warning triangle icon in `#F59E0B`, text "No PIN assigned" in Inter 14px.

Fetch the staff detail query (TanStack Query key `['staff-member', tenantSlug, staffMember.id]`) to keep `has_pin` live after a successful PIN update, since the page-level query holds the `has_pin` value.

### Step 6: Build the PIN Input Form

Within `PinManagement.tsx`, beneath the status indicator, render the PIN form unconditionally for MANAGER and OWNER roles.

React Hook Form with Zod schema. Fields:
- "New PIN": ShadCN `Input` with `type="password"`, `inputMode="numeric"`, `maxLength={8}`, `autocomplete="new-password"`.
- "Confirm PIN": ShadCN `Input` with `type="password"`, `inputMode="numeric"`, `maxLength={8}`, `autocomplete="new-password"`.

Zod schema:
- `new_pin`: `z.string().min(4, "PIN must be at least 4 digits.").max(8, "PIN must be at most 8 digits.").regex(/^\d+$/, "PIN must contain only digits.")`.
- `confirm_pin`: same rules.
- `.refine((data) => data.new_pin === data.confirm_pin, { message: "PINs do not match.", path: ["confirm_pin"] })` — the refinement applies at the object level so the error is attached to `confirm_pin`.

On submit: TanStack Query `useMutation` calling `PATCH /api/hr/staff/${staffMember.id}/pin/` with body `{ new_pin: data.new_pin }`.

On success:
- `toast({ description: "PIN updated successfully." })`.
- Invalidate `['staff-member', tenantSlug, staffMember.id]` to refresh `has_pin`.
- Reset the form with `reset()`.

On error:
- Do NOT use toast for server errors. Instead, use `setError('new_pin', { message: serverError.message })` to surface the error inline under the "New PIN" field. This prevents double-reporting and keeps the error close to the field.

Submit button label "Set PIN" uses `orange` (#F97316) background. Show loading spinner while mutation is in-flight. Button is disabled if the form has validation errors or if mutation is in-flight.

---

## Expected Output

- `backend/apps/hr/views/pin_views.py` with `StaffPINView` that hashes the PIN using `make_password` and returns no credential data.
- `UpdateStaffSerializer` updated with `clear_pin` logic.
- `GET /api/hr/staff/{id}/` response includes `has_pin: bool`.
- `frontend/app/[tenantSlug]/staff/[staffId]/components/PinManagement.tsx` fully implemented (placeholder replaced), with status indicator, role guard, and validated PIN form.

---

## Validation

- As OWNER, navigate to the PIN Management tab for a CASHIER staff member. `has_pin` shows "No PIN assigned". Enter and confirm a 6-digit PIN — success toast, status indicator switches to "PIN is set", `has_pin` in subsequent profile fetch is `true`.
- Enter a 3-digit PIN — client-side Zod error "PIN must be at least 4 digits." — no network request is made (verify with browser DevTools Network tab).
- Enter mismatched PINs — "PINs do not match." error appears under the Confirm PIN field. No network request.
- As CASHIER, navigate to the PIN Management tab — "Only Managers and Owners can manage staff PINs." paragraph is shown; no form fields are rendered.
- Raw HTTP `PATCH /api/hr/staff/{id}/pin/` with a JWT that has `role=CASHIER` returns 403.
- Database `User.hashed_pin` value begins with `$2b$` (bcrypt identifier) — confirmed via Django shell: `from django.contrib.auth.hashers import check_password; check_password('123456', user.hashed_pin)` returns `True`.
- Deactivating a staff member with `{ is_active: false, clear_pin: true }` sets `hashed_pin` to null — confirmed in the Django shell.
- The DRF view log output contains `"action": "pin_updated"` and the staff `id` but no PIN value.

---

## Notes

The PIN endpoint must be added to the rate-limiting plan. Once rate-limiting middleware (e.g., `django-ratelimit` or DRF throttle classes) is configured for the project, this endpoint should be restricted to 5 attempts per minute per IP address. Add a `TODO(rate-limit): apply to PATCH /api/hr/staff/{id}/pin/` comment in `pin_views.py` so it is not forgotten.

The `inputMode="numeric"` attribute on the PIN Input causes mobile browsers to display the numeric keypad instead of the full keyboard, which improves UX for cashiers using tablets at the POS.

The `autocomplete="new-password"` attribute prevents password managers from attempting to auto-fill the PIN field with the user's login password, which would be confusing in this context.

Django's `make_password` with the BCrypt hasher is intentionally slow. The `PATCH /api/hr/staff/{id}/pin/` request will take roughly 300–400 ms on a typical server. This is acceptable for an admin action performed at most a few times per staff member — it is not a hot path. Do not cache or skip hashing to optimise this endpoint.
