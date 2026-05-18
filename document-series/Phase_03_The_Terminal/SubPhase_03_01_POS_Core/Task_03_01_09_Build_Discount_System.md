# Task 03.01.09 — Build Discount System

## Metadata

| Field | Value |
|---|---|
| Task ID | 03.01.09 |
| Task Name | Build Discount System |
| Sub-Phase | 03.01 — POS Core |
| Complexity | High |
| Dependency | Task_03_01_08 |
| Output Files | `frontend/components/pos/LineItemDiscountControl.tsx`, `frontend/components/pos/CartDiscountControl.tsx`, `frontend/components/pos/CartManagerPINModal.tsx` |

---

## Objective

Implement the complete discount authorisation system for the LankaCommerce POS terminal: threshold-based permission checks tied to RBAC roles, inline discount controls for both line items and the full cart, a Manager PIN modal with a numeric keypad for override authorisation, and the backend PIN verification endpoint that validates manager credentials against stored hashed PINs.

---

## Step 1 — Establish Discount Threshold Rules

The discount rules for the LankaCommerce POS terminal are tiered by the current user's RBAC role.

A CASHIER-role user may apply a discount of up to 10% on any single line item without additional authorisation. They may also apply a cart-level discount of up to 5% without authorisation. If either threshold is exceeded, the system requires a manager PIN override before the discount is applied.

A MANAGER or OWNER role user faces no discount thresholds at all. They may apply any discount percentage at line or cart level and proceed directly to the "Apply" action without any PIN prompt.

These threshold values must be defined as named constants in `frontend/config/pos.config.ts`: use `LINE_DISCOUNT_CASHIER_THRESHOLD` set to 10 and `CART_DISCOUNT_CASHIER_THRESHOLD` set to 5. Defining them centrally ensures that when these thresholds need to change in a future business rule update, a developer changes one value in one file rather than searching for hard-coded numbers spread across multiple components.

The current user's role is obtained from the `useAuth()` hook, which reads the role claim from the active JWT. The role value from the JWT is `user.role` as per the LankaCommerce field convention.

---

## Step 2 — Build LineItemDiscountControl

Create `frontend/components/pos/LineItemDiscountControl.tsx` as a client component.

This component appears as a collapsible panel that slides open directly below the active `CartLineItem` row — the row whose `variantId` matches `activeLineId` in the cart store. The reveal animation is implemented using a CSS `max-height` transition from 0 to the expanded height (approximately 80px), with a 200ms ease-in-out easing curve. Animating `max-height` rather than `height` is necessary because the expanded height is not known in advance; setting `max-height` to a value larger than the maximum possible height while keeping `height: auto` produces a smooth slide-in effect.

Inside the panel, render a mode toggle consisting of two pill-shaped buttons: "%" for percentage mode and "Rs." for fixed-amount mode. Only one mode can be active at a time. The active mode button uses border (#E2E8F0) fill and navy text. The inactive mode button uses transparent fill with text-muted border and text. When the mode changes, clear the input value to prevent a previous value from being misinterpreted.

Next to the mode toggle, render a number input that is positive-only and allows two decimal places. Set `max-width` to approximately 100px. Style the input with navy (#1B2B3A) text and Inter font. The input is focused automatically when the panel opens using a `useEffect` with a `ref.current.focus()` call.

Below the input, render a live preview line: "New line total: Rs. X,XXX.XX" computed as `line_total_before_discount - discount_amount` where `discount_amount` is calculated from the current input value and the active mode. If the computed discount amount would reduce the line total below zero (a discount greater than 100% effectively), replace the preview with an inline error: "Discount exceeds the line total" in danger (#EF4444) text, and disable the apply button.

The permission boundary logic operates as follows. Read the current user's role from `useAuth()`. If the role is CASHIER and the entered percentage exceeds `LINE_DISCOUNT_CASHIER_THRESHOLD` (10%), style the input with a warning amber (#F59E0B) border and replace the "Apply" button with a "Request Manager Override" button styled in warning amber. If the role is MANAGER or OWNER, always show the "Apply" button regardless of the percentage entered.

Clicking "Request Manager Override" opens `CartManagerPINModal` with the appropriate context string, for example: "Authorise 15% discount on Silk Blouse / White / M". The `CartManagerPINModal` receives an `onSuccess(managerId)` callback. When the manager successfully authenticates, the `onSuccess` callback is invoked: call `setLineDiscount(variantId, enteredDiscountPercent)` on the cart store, call `setAuthorizingManager(managerId)`, close the `CartManagerPINModal`, and collapse the `LineItemDiscountControl` panel.

When operating in fixed-amount mode, convert the entered fixed amount to an equivalent percentage of `line_total_before_discount` before calling `setLineDiscount`. This ensures the cart store always holds a single representation (percentage) for line discounts, making the threshold check and the financial computations uniform. For example, if the line total before discount is Rs. 1,000 and the cashier enters Rs. 100 as a fixed discount, store `discountPercent = 10.00`.

---

## Step 3 — Build CartDiscountControl

Create `frontend/components/pos/CartDiscountControl.tsx` as a client component rendered below the line items list in `CartPanel`, visible whenever the cart contains at least one item.

The layout mirrors `LineItemDiscountControl` in structure: a "Cart Discount" label in Inter 13px text-muted (#64748B) on the left, followed by the mode toggle ("%" and "Rs." buttons) and the number input. Below the input, a live preview shows the new cart total after applying the entered discount.

The CASHIER permission boundary for cart discounts uses the `CART_DISCOUNT_CASHIER_THRESHOLD` (5%). The same warning amber border and "Request Manager Override" flow applies. The `CartManagerPINModal` context string for cart-level overrides reads: "Authorise [value]% cart discount" or "Authorise Rs. [value] cart discount on [N]-item cart."

On successful PIN verification via the `onSuccess(managerId)` callback: call `setCartDiscount(mode, value)` with the entered mode and value, call `setAuthorizingManager(managerId)`. The `authorizingManagerId` in the store will later be included in the `POST /api/pos/sales/` request body to record which manager authorised the cart discount.

When the cart discount is cleared by the cashier (returned to zero), also call `setAuthorizingManager(null)` to clear the authorising manager ID. A zero discount requires no authorisation; carrying over an old manager ID from a previous discount would misattribute the authorisation.

---

## Step 4 — Build CartManagerPINModal

Create `frontend/components/pos/CartManagerPINModal.tsx` as a client component using ShadCN Dialog with `max-width: sm` (approximately 384px).

The dialog header displays "Manager Authorisation Required" in Inter 17px. Below the title, display a sub-heading in Inter 13px text-muted describing exactly what is being authorised. This text is passed as a prop to the modal (for example: "Authorise 15% line discount on Silk Blouse / White / M"). Providing specific context helps the manager understand what they are approving.

Below the header separator, render the numeric PIN entry area. This is divided into two sections: the PIN display at the top and the numeric keypad below.

The PIN display shows four indicator dots arranged horizontally. Each dot is either filled (●) representing an entered digit, or hollow (○) representing an empty position. The dots must never display actual digit characters — only the filled/empty state. This is a security requirement: displaying entered digits would allow shoulder-surfing attackers to observe the PIN.

The numeric keypad is a 3×4 grid layout. The top three rows contain the digits 1 through 9 arranged as on a standard telephone keypad. The bottom row contains: a submit button on the left (a small checkmark or forward arrow icon), the digit 0 in the centre, and a backspace button on the right (a small left-arrow icon). Each button is 64×64px — large enough for reliable touch targeting on a tablet without requiring precise finger placement. Style with text-muted border, navy text, and a background (#F1F5F9) hover state.

Internal local state in the component tracks an array of entered digits. Adding a digit appends to the array (maximum 4 digits). The backspace action removes the last digit. The submit action is triggered either by clicking the submit button or automatically when the fourth digit is entered. On submit, if fewer than 4 digits have been entered, show a validation message "Enter all 4 digits" in text-muted below the pad.

On submit with 4 digits, call `POST /api/accounts/auth/verify-pin/` with the entered PIN as a 4-character string. Show a loading indicator on the submit button. On a successful response: extract `manager_id` and `role` from the response. Validate that `role` is `MANAGER` or `OWNER` — if a CASHIER's PIN was entered, return the same error as an incorrect PIN (do not distinguish between "wrong PIN" and "CASHIER PIN") to prevent role enumeration. On a valid manager, call the `onSuccess(managerId)` callback prop and close the dialog.

On an incorrect PIN response (HTTP 401): apply a CSS shake animation to the PIN indicator dot row. The animation uses a `@keyframes` block that oscillates the element horizontally ±6 pixels over 300ms with ease-in-out easing. After the animation completes, clear the entered digits array and allow reattempt. Track failure count in local state. After three consecutive failures: close the dialog automatically, show a ShadCN toast notification in danger (#EF4444): "Manager authorisation failed — please try again." Reset the failure counter when the modal is closed and reopened.

---

## Step 5 — Build the POST /api/accounts/auth/verify-pin/ Endpoint

Add a `VerifyPINView` to `backend/apps/accounts/views.py`. This endpoint is called from the frontend's `CartManagerPINModal` during discount override flows.

Authentication: the endpoint requires `JWTAuthentication` — the cashier making the request must be authenticated with their own active session. The calling cashier's identity (a CASHIER role) is irrelevant to the verification itself; the endpoint only inspects the submitted PIN to find a matching manager.

The request body carries a single field: `pin`, a 4-digit numeric string. Validate that the value is exactly 4 characters and consists only of digits — reject anything else with a 400 error.

Logic: query `User.objects.filter(tenant_id=request.user.tenant_id, hashed_pin__isnull=False)` to retrieve all users in the same tenant who have a PIN set. For each candidate user, use `bcrypt.checkpw(pin.encode('utf-8'), user.hashed_pin.encode('utf-8'))` (or the bytes form of both arguments, depending on how `hashed_pin` is stored). Return the first user whose PIN hash matches. If the matching user's role is `CASHIER`, treat it as a failed verification and return HTTP 401. If the matching user's role is `MANAGER` or `OWNER`, return HTTP 200 with the response body `{ "success": True, "data": { "user_id": "...", "role": "..." } }`. If no user's PIN matches, return HTTP 401 with `{ "success": False, "error": { "code": "INVALID_PIN", "message": "Invalid PIN" } }`. The 401 response must not distinguish between "no PIN matched" and "a CASHIER's PIN matched."

Rate limiting: add rate limiting to this endpoint to prevent automated brute-force attacks. Using `django-ratelimit` or a Redis-backed approach, allow a maximum of five failed attempts per session token per minute. On reaching the limit, return HTTP 429 with a descriptive error message. For Phase 03's single-instance deployment, a simple in-memory rate limiter per session is sufficient.

Add the URL pattern for this endpoint in `backend/apps/accounts/urls.py` at `auth/verify-pin/`.

---

## Expected Output

After this task, the discount system is fully functional. CASHIER users see the "Request Manager Override" button when exceeding thresholds. The PIN modal opens with the correct context, accepts PIN input without echoing digits, and correctly verifies against the backend. MANAGER and OWNER users apply discounts directly. All authorised discounts are recorded with the manager's `user_id` in the cart store and ultimately in the `Sale` record.

---

## Notes

The PIN display must never echo actual digit characters. Displaying filled dots only is a hard security requirement, not a stylistic preference.

The `verify-pin` endpoint returns a generic error for both "no PIN found" and "CASHIER PIN entered." This prevents an attacker from using the endpoint to determine which staff members have PINs configured or which PINs belong to managers versus cashiers.

The `authorizing_manager_id` recorded in `cartStore` flows directly into the `POST /api/pos/sales/` request body and from there into `Sale.authorizing_manager_id` in the database. This creates an immutable accountability chain: any sale with a discount above the CASHIER threshold has a record of exactly which manager approved it, permanently stored in the transaction record.

The in-memory rate limiter is suitable for Phase 03's single-instance deployment. When LankaCommerce scales to multiple server instances in Phase 05, this must be replaced with a Redis-backed rate limiter to share state across instances, otherwise each instance maintains its own counter and the effective rate limit becomes `N × 5 per minute` where N is the number of instances.
