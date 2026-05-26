# Phase 8: Checkout & Order Flow

**Phase:** 8 of 10  
**Depends on:** Phase 7 (consumer storefront pages and cart), Phase 3 (order management API), Phase 2 (public consumer API stubs)  
**Unlocks:** Phase 10 (analytics needs orders to exist)  
**Estimated Scope:** Frontend (checkout UI) + Backend (order placement, PayHere integration)

---

## 1. Overview

This phase implements the complete path from "Add to Cart" to "Order Confirmed". It covers:

1. **Multi-step checkout flow** — contact info, shipping address, shipping method selection, payment, and order review
2. **Consumer account authentication** — a separate JWT system for storefront consumers (completely independent of staff JWTs)
3. **PayHere payment gateway integration** — Sri Lanka's leading payment gateway, used for collecting payment before order fulfillment
4. **Order creation and inventory deduction** — placing the order record, deducting inventory via the existing POS system, and sending confirmation
5. **Admin order management** — fulfillment, cancellation, and refund actions from the store admin

This is the most operationally critical phase — real money flows through this code. Security, atomicity, and idempotency are paramount.

---

## 2. Existing System Context

### 2.1 The Separation of Consumer and Staff Auth

**Critical distinction:** The codebase currently has one user model (`CustomUser` in `apps.accounts`) for store staff. Consumers are stored in `WebstoreCustomer` (Phase 1). These are completely different systems:

| Aspect | Staff (CustomUser) | Consumer (WebstoreCustomer) |
|---|---|---|
| Model | `apps.accounts.CustomUser` | `apps.webstore.WebstoreCustomer` |
| Login endpoint | `/api/accounts/auth/token/` | `/api/webstore/public/<slug>/customers/login/` |
| JWT role | OWNER, MANAGER, CASHIER, etc. | "CONSUMER" |
| Stored in cookie | `access_token` | `consumer_access_token` (different name) |
| Middleware guard | `/store/*` routes | `/account/*` routes |

Consumer JWTs must NEVER be accepted by staff-only endpoints. Staff JWTs must NEVER grant consumer account access.

### 2.2 Existing POS Sale Model

`apps.pos.Sale` is the inventory-deduction model. When a webstore order is paid and confirmed, a `Sale` record is created via the POS service. This ties the webstore into the existing inventory management: stock quantities are decremented exactly once, via the same pathway as a physical POS sale.

Look at `backend/apps/pos/services/` for the existing `SaleService` or equivalent that creates `Sale` records. The webstore order service will call this service after payment confirmation.

### 2.3 Promotions / Discount Codes

The `apps.promotions` app has `DiscountCode` and `PriceRule` models. For Phase 8, implement basic discount code validation:
- Validate the code exists and is active
- Check the code hasn't exceeded its usage limit
- Apply the discount amount/percentage to the order subtotal
- Increment the code's usage count on order confirmation

Full promotions logic (automatic discounts, BOGO, etc.) is out of scope for Phase 8.

### 2.4 Currency

All pricing is in Sri Lankan Rupees (LKR). The `Tenant.settings.currency` field stores the currency code. PayHere also uses LKR for Sri Lankan merchants. All decimal fields are stored with 2 decimal places.

---

## 3. Backend: Consumer Authentication

### 3.1 Consumer Registration Endpoint

**`POST /api/webstore/public/<slug>/customers/register/`**

**Request body:** `first_name`, `last_name`, `email`, `password`, `accepts_marketing`

**Actions:**
1. Resolve the tenant by slug
2. Validate email uniqueness within the tenant (a consumer email is unique per tenant, not globally)
3. Hash the password using Django's `make_password()` — never store plain text
4. Create the `WebstoreCustomer` record
5. Issue a consumer JWT (see Section 3.3)
6. Return the customer summary and the JWT

**Validation:** Email format validation, password minimum length (8 characters), password strength (at least one number and one letter).

### 3.2 Consumer Login Endpoint

**`POST /api/webstore/public/<slug>/customers/login/`**

**Request body:** `email`, `password`

**Actions:**
1. Look up `WebstoreCustomer` by tenant + email
2. Verify the password using `check_password(submitted, stored_hash)`
3. If invalid: return 401 with `{"detail": "Invalid email or password."}`
4. Update `last_login_at = now()`
5. Issue a consumer JWT and return it

### 3.3 Consumer JWT Issuance

Consumer tokens must have a different structure from staff tokens. Key claims:
- `sub` — the `WebstoreCustomer.id` (UUID string)
- `email` — the consumer's email
- `tenant_slug` — the tenant slug
- `role` — the literal string `"CONSUMER"` (not a staff role)
- `type` — `"consumer_access"`
- Standard claims: `iat`, `exp`, `jti`

Token lifetimes: access token = 30 minutes, refresh token = 30 days (longer than staff tokens because consumers don't log in frequently).

**Use the same `SECRET_KEY` and `SIGNING_ALGORITHM` already configured in `settings/base.py` for SimpleJWT.** Create a separate utility function (not a viewset) in the webstore services that issues these consumer-specific tokens.

**Cookie storage:** The Next.js API route handling the consumer login must store the consumer token in a cookie named `consumer_access_token` (NOT `access_token` — that name is reserved for staff). The cookie must be: `httpOnly`, `sameSite=lax`, `secure` in production.

### 3.4 Consumer Auth Middleware (Frontend)

In `middleware.ts`, add handling for `/account/*` routes on tenant subdomains:
- Read the `consumer_access_token` cookie
- Verify it using `jose` (same library used for staff token verification)
- Check `role === "CONSUMER"` — reject if it's a staff token
- If invalid or missing: redirect to `/account/login`

---

## 4. Backend: Order Placement

### 4.1 Order Placement Endpoint

**`POST /api/webstore/public/<slug>/orders/`**

This endpoint is called by the checkout flow when the consumer confirms their order details. It creates a `WebstoreOrder` with `payment_status = "unpaid"` and `status = "pending"` and returns the order with payment details needed to redirect to PayHere.

**Request body:**

- `customer_email` — required (supports guest checkout even without a consumer account)
- `customer_id` — optional UUID (if the consumer is logged in)
- `line_items` — array of `{variant_id, quantity}` — **the server must re-fetch prices from the database**, never trust client-submitted prices
- `shipping_address` — full address object (see Phase 1 WebstoreCustomer addresses schema)
- `billing_address` — full address object, or `same_as_shipping: true`
- `discount_code` — optional string
- `notes` — optional string
- `shipping_method_id` — optional (Phase 8 implements basic flat-rate shipping)

**Server-side validation:**
1. Resolve tenant from slug
2. Validate each `variant_id` exists, belongs to this tenant, and is in stock
3. Re-fetch the price for each variant — never use client-submitted prices (this prevents price manipulation)
4. Validate the discount code if provided (exists, active, not over limit)
5. Calculate: `subtotal = sum(variant.price * quantity)`, `discount_amount`, `tax_amount`, `shipping_amount`, `total`
6. Validate `total > 0`

**Stock reservation:** Before creating the order, check that `ProductVariant.stock_quantity >= requested_quantity` for each line item. If not: return 400 with `{"detail": "Some items are no longer available.", "out_of_stock": [{"variant_id": "...", "available": 3}]}`.

**Order creation (atomic):**
1. Create `WebstoreOrder` with all fields, `payment_status = "unpaid"`, `status = "pending"`
2. Generate a sequential order number: `WS-` prefix + zero-padded sequential number per tenant (e.g., `WS-0001`, `WS-0002`)
3. If a discount code was used, increment its `usage_count`
4. Return the order with a `payment_initiation_data` object for PayHere (see Section 5.1)

**Do NOT deduct inventory at this point.** Inventory is only deducted after payment confirmation to prevent stock from being held for unpaid orders.

---

## 5. PayHere Integration

### 5.1 PayHere Flow Overview

PayHere is a hosted payment page — the consumer is redirected from the LankaCommerce storefront to PayHere's payment page, enters their card/bank details there, and is redirected back. PayHere also sends a server-to-server notification (webhook) when payment is confirmed.

The full flow:

```
Consumer clicks "Pay Now"
       ↓
Next.js checkout page collects order details
       ↓
POST /api/webstore/public/<slug>/orders/ → creates pending WebstoreOrder
       ↓
Checkout page receives: { order_id, payhere_merchant_id, payhere_params, payhere_hash }
       ↓
Browser submits a hidden HTML form to PayHere's payment URL
       ↓
Consumer completes payment on PayHere's page
       ↓
PayHere redirects browser back to: /checkout/success?order_id=WS-0001
       ↓ (simultaneously)
PayHere sends server-to-server notification to:
POST /api/webstore/webhooks/payhere/<slug>/
       ↓
Webhook handler verifies signature, confirms payment, deducts inventory
```

### 5.2 PayHere Configuration

PayHere credentials are stored in `TenantWebstore`:
- `payhere_merchant_id` — add this field in the Phase 3 serializer (or add it to the `TenantWebstore` model if not added in Phase 1)
- `payhere_merchant_secret` — used for hash generation (NEVER returned in any API response)

Store the merchant secret in the database encrypted, OR require it to be set via environment variable per tenant. For Phase 8, storing in the database is acceptable but document the security consideration.

### 5.3 PayHere Hash Generation

PayHere uses an MD5 hash for request authentication:

**Hash formula:** `MD5(merchant_id + order_id + amount + currency + MD5(merchant_secret))`

Where `amount` is the total formatted as a decimal with 2 places (e.g., "5000.00").

The hash is computed **server-side only**. The `merchant_secret` must never be sent to the browser. The hash is returned from the order placement endpoint as part of `payment_initiation_data`.

Create a utility function in `backend/apps/webstore/services/payhere_service.py` for hash generation.

### 5.4 PayHere API Fields Required

When initiating payment, the checkout page must submit these fields to PayHere's URL (via a form POST):

| Field | Value |
|---|---|
| `merchant_id` | Tenant's PayHere merchant ID |
| `return_url` | `https://<slug>.lankacommerce.com/checkout/success` |
| `cancel_url` | `https://<slug>.lankacommerce.com/checkout?cancelled=true` |
| `notify_url` | `https://api.lankacommerce.com/api/webstore/webhooks/payhere/<slug>/` |
| `first_name` | Consumer's first name |
| `last_name` | Consumer's last name |
| `email` | Consumer's email |
| `phone` | Consumer's phone (can be blank) |
| `address` | Shipping address line 1 |
| `city` | Shipping city |
| `country` | Shipping country |
| `order_id` | The WebstoreOrder's `order_number` (e.g., "WS-0001") |
| `items` | A description of the items (e.g., "Test Business Store Order WS-0001") |
| `currency` | "LKR" |
| `amount` | The total formatted as "5000.00" |
| `hash` | The computed MD5 hash |

PayHere sandbox URL (development): `https://sandbox.payhere.lk/pay/checkout`  
PayHere production URL: `https://www.payhere.lk/pay/checkout`

Use `PAYHERE_ENVIRONMENT = "sandbox"` in development settings, `"production"` in production settings.

### 5.5 PayHere Webhook Handler

**`POST /api/webstore/webhooks/payhere/<slug>/`**

This endpoint receives payment confirmation from PayHere's servers. It must be:
- Publicly accessible (no authentication — PayHere cannot send JWTs)
- Verified via MD5 hash (PayHere sends a `md5sig` parameter to validate the payload)
- **Idempotent** — PayHere may send the same notification multiple times; the handler must not create duplicate orders or deduct inventory twice

**Webhook payload fields (from PayHere):**
- `merchant_id` — verify this matches the tenant's merchant ID
- `order_id` — the WebstoreOrder's `order_number`
- `payment_id` — PayHere's transaction ID
- `payhere_amount` — the charged amount
- `payhere_currency` — the currency
- `status_code` — 2 = success, 0 = pending, -1 = cancelled, -2 = failed, -3 = chargedback
- `md5sig` — the verification hash

**Verification:** Recompute the hash: `MD5(merchant_id + order_id + payhere_amount + payhere_currency + status_code + MD5(merchant_secret))`. If it does not match `md5sig`: reject with 400. Never process a webhook without verifying the signature.

**On success (`status_code = 2`):**
1. Look up `WebstoreOrder` by `order_number`
2. Check `payment_status` — if already `"paid"`, return 200 immediately (idempotency)
3. Update: `payment_status = "paid"`, `payment_reference = payment_id`, `payment_gateway = "payhere"`, `status = "confirmed"`
4. **Deduct inventory:** Call the existing POS service to create a `Sale` record. Map each line item to a POS sale line item. The sale deducts stock from `ProductVariant.stock_quantity`.
5. Link the created `Sale` to the `WebstoreOrder.pos_sale`
6. Send order confirmation email (see Section 6)
7. Return 200 OK

**On cancellation/failure:** Update `WebstoreOrder.status = "cancelled"`, `payment_status = "unpaid"`. **Re-release the reserved stock** if stock was reserved.

**Wrap steps 2-5 in `django.db.transaction.atomic()`** to prevent partial state (paid but no inventory deduction).

---

## 6. Checkout Frontend

### 6.1 Checkout Flow (`checkout/page.tsx`)

A **Client Component** (fully client-side for interactivity). Uses a multi-step stepper with 4 steps:

**Step 1: Contact & Address**
- "Contact Information" section: Email field, optional phone
- "Shipping Address" section: First name, Last name, Address line 1, Address line 2 (optional), City, Province (dropdown — Sri Lanka provinces), Postal Code, Country (fixed to "Sri Lanka" for now)
- "Create account?" checkbox (shown only if not already logged in) — if checked, shows password field
- If the consumer is logged in (`consumer_access_token` cookie): pre-fill from their default saved address

**Step 2: Shipping Method**
For Phase 8, implement a simplified shipping options list:
- "Standard Delivery" — free or a flat rate (configurable per tenant — add a basic `shipping_methods` JSONField to `TenantWebstore` or hardcode for Phase 8)
- "Express Delivery" — optional higher-rate option
- The consumer selects one option

**Step 3: Payment**
- Order summary (item list, discount code input, totals breakdown)
- "Discount Code" input with "Apply" button
- "Pay with PayHere" button — this triggers the backend call and PayHere redirect
- Alternative: "Pay on Delivery" option (if enabled in `TenantWebstore.cart_settings`) — skips PayHere, creates order with `payment_status = "pending"`
- Notice: "You will be redirected to PayHere to complete your payment securely"

**Step 4: Review** (optional — can combine with Step 3)
- Final order summary before payment

### 6.2 PayHere Redirect Mechanism

After the backend returns `payment_initiation_data`:
1. Build a hidden `<form>` element dynamically in the browser pointing to PayHere's checkout URL
2. Populate all required fields as hidden inputs
3. Auto-submit the form via JavaScript (`form.submit()`)

This must NOT use a redirect (302) because PayHere requires a POST request to initiate payment. A form auto-submit is the standard approach.

**Important:** Use `useEffect` to auto-submit the form (to ensure the DOM is ready). Show a "Redirecting to PayHere..." overlay to prevent the user from clicking twice.

### 6.3 Order Success Page (`checkout/success/page.tsx`)

After PayHere redirects back to `/checkout/success?order_id=WS-0001`:
- Show a success animation (checkmark)
- "Thank you for your order!" heading
- Order number prominently displayed
- "We'll email your order confirmation to [email]"
- Order summary (fetched from `GET /api/webstore/public/<slug>/orders/<order_number>/`)
- "Continue Shopping" button → `/`
- "View Order Details" → `/account/orders` (if the consumer has an account)

**After displaying success:** Call `cartStore.clearCart()` to empty the cart.

**Delayed PayHere webhook:** The browser redirect happens before the PayHere webhook fires. The order status may still be `"pending"` when the success page loads. Show a "Processing payment..." message with a spinner that polls `GET /api/webstore/public/<slug>/orders/<order_number>/` every 3 seconds until `payment_status = "paid"` or timeout (30 seconds). After timeout, show a "Payment verification taking longer than expected. Check your email for confirmation." message.

---

## 7. Consumer Account — Order History

When a consumer is logged in, their orders are linked via `WebstoreOrder.customer` FK.

**`GET /api/webstore/public/<slug>/orders/<order_number>/`** — Returns the full order for status checking.

**`GET /api/webstore/public/<slug>/customers/orders/`** — Consumer-authenticated endpoint. Returns paginated order history for the logged-in consumer. Requires `consumer_access_token` cookie.

The `/account/orders` page (Phase 7) calls this endpoint and renders the order list.

---

## 8. Email Notifications

Phase 8 must send two transactional emails:

### 8.1 Order Confirmation Email

Sent after `payment_status = "paid"` is set (webhook handler).

**Subject:** "Your order [WS-0001] is confirmed — [Store Name]"

**Content:**
- Store logo and name
- "Thank you for your order!" heading
- Order number, date
- Line items table: image, product name, variant, quantity, price
- Totals breakdown (subtotal, shipping, discount, tax, total)
- Shipping address
- Estimated delivery note

**Implementation:** Use the existing notification system in `apps.notifications`. Look at how existing notification emails are sent (there should be a `send_email` utility or a notification model). If no email system exists yet, use Django's built-in `send_mail()` with the configured email backend.

For development, use Django's `console` email backend (emails print to the terminal, no SMTP needed). For production, use the configured SMTP settings.

HTML email template: Create `backend/apps/webstore/templates/webstore/emails/order_confirmation.html` using Django's template engine. Use inline CSS (email clients don't support external stylesheets).

### 8.2 Order Status Update Email

Sent when a store owner updates the order status to "Shipped" or "Fulfilled" from the admin UI.

**Subject:** "Your order [WS-0001] has been shipped — [Store Name]"

**Content:** Tracking information (if provided), estimated delivery, "Track My Order" button.

---

## 9. Backend: Order Service

Create `backend/apps/webstore/services/order_service.py`.

### 9.1 `create_order(tenant, order_data)` → WebstoreOrder

The central order creation function. Contains all the validation and calculation logic described in Section 4.1. Returns the created `WebstoreOrder` or raises a `ValidationError` with structured error data.

### 9.2 `confirm_order_payment(order, payment_id, amount)` → WebstoreOrder

Called by the webhook handler. Updates payment status, creates POS Sale, sends confirmation email. Must be atomic.

### 9.3 `generate_order_number(tenant)` → string

Generates the next sequential order number for the tenant (e.g., `WS-0001`). Use a database query to find the highest existing order number and increment:

The tenant's order count must be queried with a database-level lock (`select_for_update()`) to prevent two simultaneous orders from getting the same number.

### 9.4 `fulfill_order(order, tracking_info)` → WebstoreOrder

Sets `fulfillment_status = "fulfilled"`. Sends the shipped email. Called from the admin order management page.

### 9.5 `cancel_order(order)` → WebstoreOrder

Sets `status = "cancelled"`. If `payment_status = "paid"`, this should raise an error — paid orders cannot be cancelled without a refund. The admin must manually issue a refund first.

---

## 10. Security Requirements

### 10.1 Price Integrity
The server must ALWAYS re-fetch product variant prices from the database when processing an order. Never accept prices from the client request body. A malicious user could submit `unit_price: 1` for a product worth 5000 LKR.

### 10.2 Webhook Authentication
The PayHere webhook endpoint must verify the MD5 signature on EVERY request before processing. Log all webhook attempts (tenant, order_id, status_code, verified: true/false) to the existing `apps.audit` system.

### 10.3 CSRF on the PayHere Form
The PayHere redirect uses a browser-submitted HTML form. This form is generated client-side and does NOT need a CSRF token (it's not posting to your own server). Do not add Django CSRF to the PayHere redirect form — it will break the redirect.

### 10.4 Consumer Password Security
- Minimum 8 characters
- Hash using Django's `make_password()` which uses PBKDF2-SHA256 by default — sufficient security
- Never log, return, or store the plain-text password anywhere
- The login endpoint must use a constant-time comparison function for password verification to prevent timing attacks

### 10.5 Rate Limiting
The consumer login endpoint should be rate-limited. Check if `apps.accounts.throttling` has an existing throttle class — extend it or create `WebstoreLoginThrottle` in `backend/apps/webstore/throttling.py`. Limit: 10 attempts per minute per IP.

---

## 11. Verification Checklist

- [ ] `POST /api/webstore/public/test-business/customers/register/` creates a new consumer
- [ ] `POST /api/webstore/public/test-business/customers/login/` returns a consumer JWT
- [ ] Consumer JWT is stored in `consumer_access_token` cookie (not `access_token`)
- [ ] Consumer JWT is rejected by staff-only endpoints (403)
- [ ] `POST /api/webstore/public/test-business/orders/` creates an order with `payment_status = "unpaid"`
- [ ] The order placement endpoint rejects price manipulation (verify by submitting altered prices in request body)
- [ ] The PayHere hash generated server-side matches PayHere's expected formula
- [ ] The checkout page redirects to PayHere sandbox on clicking "Pay with PayHere"
- [ ] A simulated PayHere webhook `POST` to `/api/webstore/webhooks/payhere/test-business/` with valid signature updates `payment_status = "paid"` and deducts inventory
- [ ] A webhook with invalid MD5 signature returns 400 and does NOT update the order
- [ ] Sending the same webhook twice (idempotency test) does NOT create a duplicate POS Sale
- [ ] The `/checkout/success` page shows the correct order summary
- [ ] `cartStore.clearCart()` is called on the success page (cart is empty after checkout)
- [ ] Order confirmation email is sent (check the console email backend output in development)
- [ ] The admin `/store/webstore/orders` page shows the new order
- [ ] Clicking "Fulfill" on the order updates its status and sends the shipped email
