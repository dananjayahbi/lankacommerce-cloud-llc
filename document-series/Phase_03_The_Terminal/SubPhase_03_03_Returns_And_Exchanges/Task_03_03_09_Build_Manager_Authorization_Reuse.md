# Task 03.03.09 — Build Manager Authorization Reuse

## Metadata

| Field | Value |
|---|---|
| Task | 03.03.09 |
| Name | Build Manager Authorization Reuse |
| SubPhase | 03.03 |
| Complexity | LOW |
| Dependencies | Task 03.03.03 |
| Produces | `frontend/components/pos/CartManagerPINModal.tsx` (modified), DRF view `POST /api/accounts/auth/verify-pin/` |

---

## Objective

Adapt the `CartManagerPINModal` component from SubPhase_03_01 to serve the return authorization use case, build the `POST /api/accounts/auth/verify-pin/` DRF endpoint, and integrate the PIN step as Step 3 of `ReturnWizardSheet`.

---

## Instructions

### Step 1: Review CartManagerPINModal from SubPhase_03_01

Read the existing `CartManagerPINModal` component in `frontend/components/pos/`. Identify the current title, description text, PIN input behaviour, and callback signatures.

### Step 2: Add the required Prop

Update `CartManagerPINModal` to accept a `required: boolean` prop (default `False`).

When `required=False` (discount override context — existing behaviour): Title "Manager Override Required", description "Enter a manager PIN to approve a discount above the cashier limit", a "Cancel Override" button that closes the modal without returning a `user_id`.

When `required=True` (return authorization context): Title "Manager Authorization Required", subtitle "Enter a manager PIN to authorize this return.", no cancel or dismiss button at the modal level. Override `onOpenChange` to prevent closing when `required=True`. The user must back-navigate via the wizard's "Back" button.

The PIN input, verification logic, and response handling remain identical across both modes.

### Step 3: Build POST /api/accounts/auth/verify-pin/

Create a DRF view in `backend/apps/accounts/views/auth_views.py`. Use `JWTAuthentication` and `IsAuthenticated`. The request body must have a `pin` field (non-empty string of digits, 4–8 characters). Validate using a small inline DRF Serializer.

Handler logic:

1. Extract `tenant_id` from JWT claims.
2. Query for a `User` in the same tenant where the `pin` field matches. Use `hmac.compare_digest()` for timing-safe string comparison to prevent timing attacks.
3. If a matching user is found and their role is `MANAGER`, `OWNER`, or `SUPER_ADMIN`: return `{ "success": true, "user_id": user.id, "role": user.role, "name": user.get_full_name() }`.
4. If no match or insufficient role: return `{ "success": false, "error": "Invalid PIN or insufficient permissions" }` with HTTP status 200 (do NOT return 401/403 for PIN mismatch — response uniformity and rate limiting require a 200 status; the client reads the `success` field).

Rate limiting: allow a maximum of 5 failed attempts per requesting user per 5-minute window. Store attempt counts in Django's cache framework (`django.core.cache.cache`) keyed by `"pin_attempts:{tenant_id}:{user_id}"`. On the 6th failed attempt, return `{ "success": false, "error": "Too many attempts. Try again in 5 minutes." }` with HTTP 200. Use `cache.set(key, count, timeout=300)` to enforce the 5-minute window.

Register the URL in `backend/apps/accounts/urls.py` at `POST /api/accounts/auth/verify-pin/`.

### Step 4: Update CartManagerPINModal to Use verify-pin

Update the PIN submission logic in `CartManagerPINModal` to call `POST /api/accounts/auth/verify-pin/` via the frontend API utility. On success, call `onAuthorized(user_id, manager_name)` callback. On failure, display the error message beneath the PIN input. Clear the error message when the user begins typing a new PIN.

### Step 5: Integrate Step 3 into ReturnWizardSheet

In `ReturnWizardSheet.tsx`, replace the Step 3 placeholder with an inline rendering of the PIN entry form (not as a modal overlay — avoid modal-over-modal). When PIN is verified, store `authorizing_manager_id` and `authorization_timestamp` (Date.now()) in wizard state. Show a success row: green checkmark icon, the manager's name, and "Authorized at HH:mm". The "Process Return" button becomes active.

If the `authorization_timestamp` is older than 5 minutes when "Process Return" is clicked, reset the authorization state and re-show the PIN input with the message "Authorization expired. Please re-enter the PIN."

---

## Expected Output

- `CartManagerPINModal` works correctly in both optional (discount) and required (return) modes
- `POST /api/accounts/auth/verify-pin/` verifies PINs, enforces role, and rate-limits attempts
- `ReturnWizardSheet` Step 3 shows inline PIN entry with post-authorization confirmation and 5-minute expiry

---

## Validation

- Five failed PIN attempts lock the endpoint for 5 minutes
- A successful PIN from a CASHIER-role user returns `success: false`
- Authorization timeout correctly re-prompts when submitting after 5 minutes
- In discount override context (`required=False`), the Cancel button is still shown

---

## Notes

`hmac.compare_digest()` in Python is the correct timing-safe comparison function, equivalent to `crypto.timingSafeEqual` in Node.js. Both strings must be the same type (both `str` or both `bytes`) before comparison.
