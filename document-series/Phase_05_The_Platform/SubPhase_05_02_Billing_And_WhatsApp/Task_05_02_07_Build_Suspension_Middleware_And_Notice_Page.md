# Task 05.02.07 — Build Suspension Middleware and Notice Page

## Metadata

| Field | Value |
|---|---|
| Task ID | 05.02.07 |
| SubPhase | 05.02 — Billing and WhatsApp |
| Complexity | Medium |
| Estimated Effort | 2-3 hours |
| Depends On | 05.02.06 (Grace period engine), Phase 01 Auth (JWT middleware) |
| Produces | `frontend/middleware.ts` (updated), `frontend/app/[tenantSlug]/suspended/page.tsx` |
| Blocked By | None |

---

## Objective

Implement the application-layer access control that prevents tenants with SUSPENDED or CANCELLED subscriptions from using LankaCommerce. The Next.js 15 middleware intercepts every incoming request, decodes the JWT, reads the `subscription_status` claim, and redirects delinquent tenants to a branded suspension notice page. The suspension page explains the situation, shows the amount due, provides a "Renew" button that links to the billing page, and displays support contact information.

The middleware must bypass the check for paths that should remain accessible: API routes (the suspension page itself needs API access), authentication routes, the billing page (needed to pay), the suspended page itself, Super Admin routes, static assets, and Next.js internal paths.

---

## Instructions

### Step 1: Update the JWT to Include subscription_status

Ensure the JWT token generated during authentication includes the `subscription_status` claim. Locate the token generation in `backend/apps/authentication/utils.py` or the login serializer:

- For tenant users (non-SUPER_ADMIN), add: `"subscription_status": user.tenant.subscription_status`.
- For SUPER_ADMIN users, add: `"subscription_status": "ACTIVE"` (bypasses all middleware checks).

The token payload should look like:

```
{
  "user_id": "uuid",
  "tenant_id": "uuid",
  "role": "OWNER",
  "subscription_status": "TRIAL"  // or ACTIVE, PAST_DUE, SUSPENDED, CANCELLED
}
```

This is critical — if `subscription_status` is missing from the token, the middleware cannot evaluate access, and all tenants will be redirected to the suspension page.

### Step 2: Build the Middleware

Update `frontend/middleware.ts`. If the file does not exist from Phase 01, create it. Define a `config` matcher that excludes Next.js internal paths and static files:

```javascript
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

Define the `middleware` function:

1. Extract the pathname from `request.nextUrl.pathname`.

2. Define bypass paths — requests to these paths skip the subscription check entirely:
   - Paths starting with `/api/` — API routes must be accessible so the billing page and suspension page can fetch data.
   - Paths starting with `/auth/` or `/login` or `/register` — unauthenticated users must reach login.
   - Paths matching `/suspended` — the suspension page itself must be accessible (to avoid redirect loops).
   - Paths starting with `/super-admin` — Super Admins are exempt from subscription enforcement.
   - Paths starting with `/billing` — the billing page must be accessible so tenants can pay.
   - The root path `/` — the landing page is public.
   - Paths starting with `/_next/` — Next.js internal assets.

3. Check if the current path matches any bypass pattern. Use `pathname.startsWith()` for prefix checks. If it matches, call `return NextResponse.next()`.

4. Extract the JWT from cookies. The token is stored in a cookie named `lankacommerce_token` (or as configured in Phase 01 auth). Use `request.cookies.get("lankacommerce_token")?.value`.

5. If no token is found, redirect to `/auth/login` with the current path as a `callbackUrl` query parameter: `nextUrl.searchParams.set("callbackUrl", pathname)`.

6. Decode the JWT without verification (the edge runtime may not have the public key). Use a simple base64 decode of the payload:

   ```javascript
   function decodeToken(token) {
     try {
       const payload = token.split(".")[1];
       return JSON.parse(atob(payload));
     } catch {
       return null;
     }
   }
   ```

   In production, validate the signature using `jose` library's `jwt using `jose.jwtVerify` if the public key is available in the edge runtime.

7. Extract `subscription_status` from the decoded token. If it is missing, treat the tenant as SUSPENDED (safe default).

8. If `subscription_status` is `"SUSPENDED"` or `"CANCELLED"`, redirect to `/suspended`:

   ```javascript
   const suspendedUrl = new URL("/suspended", request.url);
   suspendedUrl.searchParams.set("tenant", pathname.split("/")[1] || "");
   return NextResponse.redirect(suspendedUrl);
   ```

   Include the tenant slug as a query parameter so the suspension page can render context-specific content.

9. If `subscription_status` is `"TRIAL"` or `"ACTIVE"` or `"PAST_DUE"`, allow the request: `return NextResponse.next()`.

10. Add a response header `X-Subscription-Status` to all allowed responses for debugging purposes.

### Step 3: Build the Suspension Notice Page

Create `frontend/app/[tenantSlug]/suspended/page.tsx` as a client component with `"use client"`:

- Use `useAuth()` to check if the user is authenticated. If not, redirect to login.
- Use `useQuery` to fetch the subscription status from `GET /api/billing/subscription/status/`.
- Render a centred card layout (max-width `max-w-lg`) with the following content:

  1. **Icon**: A large `Lock` or `ShieldOff` icon from `lucide-react` in red (`text-red-500`).

  2. **Heading**: "Account Suspended" in `text-2xl font-bold` using Inter.

  3. **Explanatory text**: "Your LankaCommerce account has been suspended due to non-payment. You can reactivate your account by settling the outstanding balance."

  4. **Amount due section**: If the query returns a pending invoice with an amount, show:
     - Label: "Amount Due"
     - Value: `{formatLkr(invoice.amount)}` using the `formatLkr` utility from `frontend/lib/format.ts`.
     - Invoice number reference.

  5. **Renew button**: A large ShadCN `Button` with `bg-orange text-white hover:bg-orange/90` that links to `/[tenantSlug]/billing`. Text: "Pay Now & Reactivate".

  6. **Support section**: Below the button, show:
     - "Need help? Contact our support team."
     - Email link: `support@lankacommerce.lk`
     - Phone: `+94 11 234 5678`

  7. **Logout link**: A subtle text link at the bottom: "Logout" that calls `useAuth().logout()`.

- If the subscription status is `ACTIVE` or `TRIAL` (i.e., the tenant was incorrectly redirected), show a "Go to Dashboard" button instead, and log a warning.
- Style: Use `bg-background` (#F1F5F9) for the page background and `bg-surface` (#FFFFFF) for the card. Border: `border border-red-200`. Text colours: `text-text-muted` (#64748B) for body text, `text-navy` (#1B2B3A) for headings.

### Step 4: Create the formatLkr Utility

Create `frontend/lib/format.ts` if it does not exist. Add:

- `formatLkr(amount: number | string): string` — formats a number as Sri Lankan Rupees with the LKR symbol. Use `new Intl.NumberFormat("si-LK", { style: "currency", currency: "LKR" }).format(Number(amount))`. For zero or negative values, return `"LKR 0.00"`.
- `formatDate(date: string | Date): string` — formats a date string using `Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric" })`.
- `formatDateRelative(date: string | Date): string` — returns "Today", "Tomorrow", "In X days", "X days ago", or the formatted date for dates beyond 30 days.
- `formatPercent(value: number): string` — formats as "X.XX%".

### Step 5: Test Middleware Bypass for Billing Page

Verify that the middleware correctly allows access to `/[tenantSlug]/billing` for SUSPENDED tenants. The billing page must be reachable so that the tenant can view their outstanding invoice and initiate checkout. The bypass check for `/billing` in the middleware must match any path that starts with the tenant slug followed by `/billing` — use `pathname.includes("/billing")` as the bypass check rather than `pathname.startsWith("/billing")`, because the path is `/[tenantSlug]/billing`, not `/billing`.

---

## Expected Output

- `frontend/middleware.ts` intercepts all requests, decodes the JWT, and redirects SUSPENDED/CANCELLED tenants to `/suspended`
- Bypass paths (API, auth, billing, suspended, super-admin, static) are excluded from the check
- `frontend/app/[tenantSlug]/suspended/page.tsx` renders a branded card with amount due, renew button, and support contact
- `formatLkr` utility formats LKR values with correct locale
- Missing JWT redirects to `/auth/login` with callback URL
- Missing `subscription_status` in JWT defaults to SUSPENDED (safe default)

---

## Validation

- Log in as a tenant with `subscription_status = SUSPENDED` — confirm every page request redirects to `/suspended`
- Log in as a SUSPENDED tenant and navigate to `/[tenantSlug]/billing` — confirm the billing page loads (bypass works)
- Log in as a SUSPENDED tenant and navigate to `/[tenantSlug]/suspended` — confirm the page renders with the amount due and "Pay Now" button
- Navigate to `/super-admin/plans` while the Super Admin's tenant is SUSPENDED — confirm the page loads (Super Admin bypass)
- Navigate to `/api/billing/subscription/status/` while SUSPENDED — confirm the API returns data (API bypass)
- Log in as an ACTIVE tenant — confirm all pages load normally
- Log in as a CANCELLED tenant — confirm redirect to `/suspended`
- Remove the JWT cookie and navigate to any dashboard page — confirm redirect to `/auth/login`
- Click "Pay Now & Reactivate" on the suspension page — confirm navigation to `/[tenantSlug]/billing`
- Confirm the `formatLkr` utility formats `1500` as `LKR 1,500.00` and `0` as `LKR 0.00`

---

## Notes

- The middleware runs on the Vercel Edge Runtime (or Node.js for self-hosted). JWT decoding without signature verification is acceptable for the redirect decision because the JWT was already verified at the API layer by the backend. If the token is tampered with, the decode will fail and redirect to login, which is a safe failure mode.
- The bypass for `/billing` uses `pathname.includes("/billing")` rather than a prefix check because the actual path is `/[tenantSlug]/billing`. This is slightly broader than necessary (it would also match `/super-admin/billing` if such a path existed), but in practice there are no conflicting paths.
- For self-hosted deployments on Node.js, the JWT can be verified using the `jose` library with the RS256 public key. The edge-compatible `jose` package works in both environments.
- The suspension page intentionally does not auto-redirect after payment. The tenant must click "Pay Now & Reactivate" to go to the billing page, complete payment via PayHere, and be redirected back by return_url. After the IPN processes the payment, the tenant can navigate freely.
- The `subscription_status` cookie/claim is not real-time — it reflects the state at the time the JWT was issued. If a suspended tenant pays their invoice and the IPN processes the payment, the JWT still shows SUSPENDED until the token is refreshed. The tenant should log out and log back in, or the billing page should force a token refresh after payment. This is an accepted limitation — the middleware is a safety net, not a real-time enforcement system.