# Task 05-03-04: Configure Custom Subdomain Routing

## Metadata

| Attribute | Value |
|-----------|-------|
| **Phase** | Phase 05 — The Platform |
| **Sub-Phase** | SubPhase 05-03 — Polish and Deployment |
| **Task ID** | Task 05-03-04 |
| **Priority** | High |
| **Dependencies** | Task 01-01-01 (Initialize Next.js Project), Task 01-02-01 (Tenant Model) |
| **Estimated Effort** | 4 hours |
| **Status** | Not Started |

## Objective

LankaCommerce is a multi-tenant SaaS platform where each tenant accesses their dashboard via a unique subdomain (e.g., `acme.lankacommerce.com`). Subdomain-based routing provides a clean, professional URL scheme, isolates tenant sessions via cookies scoped to the subdomain, and enables seamless white-labeling in the future. The Next.js middleware must intercept every incoming request, extract the tenant slug from the hostname, validate it against an in-memory cache, and inject the tenant context into downstream request headers.

This task covers the full subdomain routing pipeline: hostname parsing in middleware, tenant slug extraction and validation, spoofing prevention via header stripping, local development overrides, and Vercel DNS configuration with a wildcard CNAME record. Security is paramount — the system must prevent `X-Tenant-Slug` header spoofing from external clients while allowing internal overrides during development.

## Instructions

1. **Update `frontend/middleware.ts` with subdomain routing logic.**
   - Open `frontend/middleware.ts`.
   - Add a new function `extractTenantFromHostname(hostname)`:
     - Strip the port from the hostname if present (e.g., `localhost:3000` → `localhost`).
     - If the hostname ends with `.lankacommerce.com`:
       - Extract the subdomain prefix (e.g., `acme.lankacommerce.com` → `acme`).
       - Return the prefix as the potential tenant slug.
     - If the hostname is `localhost` or an IP address, return `null` (dev mode).
     - Otherwise, return `null`.

2. **Build an in-memory tenant slug cache.**
   - At the module level of `middleware.ts`, declare a `Map<string, boolean>`:
     ```ts
     const tenantCache = new Map<string, boolean>();
     ```
   - Define `async function validateTenantSlug(slug: string): Promise<boolean>`:
     - If the slug is in `tenantCache`, return the cached value.
     - Otherwise, fetch `process.env.NEXT_PUBLIC_APP_URL`/api/tenants/validate-slug/?slug={slug}` (or call a direct API route).
     - Cache the result in `tenantCache.set(slug, result)` with a TTL of 5 minutes.
     - Return the result.
   - The cache prevents a database lookup on every request while keeping staleness acceptable.

3. **Inject tenant context into the request.**
   - In the `middleware` function, after extracting the slug:
     - If a slug is found and `await validateTenantSlug(slug)` returns `true`:
       - **Strip** any incoming `X-Tenant-Slug` header from the request (prevents spoofing).
       - **Set** `request.headers.set("X-Tenant-Slug", slug)`.
       - Continue to the next middleware or route handler.
     - If the slug is found but validation fails:
       - In production (`process.env.NODE_ENV === "production"`), redirect to `/not-found`.
       - In development, log a warning and continue (allow unknown slugs for testing).

4. **Handle local development overrides.**
   - In development mode, if no subdomain slug is extracted from the hostname:
     - Check for an incoming `X-Tenant-Slug` header (set by the developer via browser extension or curl).
     - If present, use it directly **without** validation (for testing purposes).
     - Log a warning: `"DEV MODE: Using X-Tenant-Slug override: ${slug}"`.
   - This allows developers to test multiple tenants without configuring DNS.

5. **Prevent header spoofing in production.**
   - In the middleware, **always** strip any incoming `X-Tenant-Slug` header from external requests before processing:
     ```ts
     const requestHeaders = new Headers(request.headers);
     requestHeaders.delete("X-Tenant-Slug");
     ```
   - Only re-inject the header after subdomain validation passes.
   - This ensures that external clients cannot impersonate a tenant by manually setting the header.

6. **Update the middleware matcher config.**
   - Ensure the middleware runs on all routes except public assets:
     ```ts
     export const config = {
       matcher: ["/((?!_next/static|_next/image|favicon.ico|status|api/health).*)"],
     };
     ```

7. **Create the tenant slug validation API route.**
   - Create `frontend/app/api/tenants/validate-tenant-slug/route.ts`:
     - Export `GET` handler that reads `slug` from query params.
     - Calls `getAuthFromCookies()` to verify internal request (optional, for basic security).
     - Returns `{"valid": true}` or `{"valid": false}`.
     - In production, this route should be called internally only (not exposed to clients).

8. **Update the Django backend to trust the `X-Tenant-Slug` header.**
   - In `backend/apps/accounts/middleware/tenant_middleware.py`:
     - Read `request.META.get("HTTP_X_TENANT_SLUG")`.
     - If present, look up the tenant by slug and attach `request.tenant`.
     - If not present, fall back to the existing tenant resolution logic (e.g., from session or API key).
   - This ensures the backend can receive the tenant context from the frontend middleware.

9. **Configure Vercel DNS with wildcard CNAME.**
   - In the Vercel dashboard for the LankaCommerce project:
     - Add a custom domain: `lankacommerce.com`.
     - Add a wildcard CNAME record: `*.lankacommerce.com` pointing to `cname.vercel-dns.com`.
     - Ensure the apex domain (`lankacommerce.com`) also has a CNAME or A record pointing to Vercel.
   - Document the DNS configuration in the project README.

10. **Update the Next.js configuration for subdomain support.
    - In `frontend/next.config.ts`, ensure the `hostname` is allowed for image optimization if needed:
      ```ts
      images: {
        remotePatterns: [
          { protocol: "https", hostname: "*.lankacommerce.com" },
      },
      ```

11. **Test subdomain routing end-to-end.**
    - Locally, use `curl -H "Host: acme.lankacommerce.com" http://localhost:3000/` to simulate a subdomain request.
    - Verify that the middleware extracts `acme`, validates it, and injects `X-Tenant-Slug`.
    - Verify that setting `X-Tenant-Slug` header directly in the request is ignored (stripped) in production mode.
    - Verify that an unknown subdomain redirects to `/not-found` in production.

## Expected Output

- Requests to `acme.lankacommerce.com` routes to the tenant dashboard for `acme` with tenant context injected.
- Unknown subdomains (e.g., `nonexistent.lankacommerce.com`) redirect to `/not-found`.
- External clients cannot spoof tenant identity by setting `X-Tenant-Slug` headers.
- Local developers can override the tenant slug via `X-Tenant-Slug` header for testing.
- The in-memory cache reduces tenant validation lookups to a minimum.
- Vercel wildcard CNAME `*` → `cname.vercel-dns.com` is configured and documented.

## Validation

1. `frontend/middleware.ts` contains `contains `extractTenantFromHostname()` that correctly parses subdomains.
2. The middleware strips incoming `X-Tenant-Slug` headers before processing.
3. The middleware injects `X-Tenant-Slug` header only after successful slug validation.
4. `tenantCache` is a module-level `Map<string, boolean>` with TTL logic.
5. Unknown subdomains in production redirect to `/not-found`.
6. Local dev mode accepts `X-Tenant-Slug` header override without validation.
7. `frontend/app/api/validate-tenant-slug/route.ts` exists and returns `{"valid": true/false}`.
8. `backend/apps/accounts/middleware/tenant_middleware.py` reads `HTTP_X_TENANT_SLUG` from request META.
9. Vercel DNS has wildcard CNAME `*` → `cname.vercel-dns.com`.
10. `next.config.ts` includes `remotePatterns` for `*.lankacommerce.com`.
11. `curl -H "Host: acme.lankacommerce.com" http://localhost:3000/` correctly routes to the tenant dashboard.
12. `curl -H "X-Tenant-Slug: acme" http://localhost:3000/` is ignored (slug extracted from hostname instead).

## Notes

- The wildcard CNAME `*` → `cname.vercel-dns.com` is a Vercel-specific DNS setting. It routes all subdomains to Vercel's edge network, where the Next.js middleware handles tenant resolution.
- The in-memory cache (`tenantCache`) is per-instance and resets on server restart. For serverless deployments (Vercel), each cold start will miss the cache. Consider using Redis or Vercel KV for persistent caching if cold start latency becomes an issue.
- Cookie scope is automatically handled by the browser — cookies set on `acme.lankacommerce.com` are not sent to `other.lankacommerce.com`, providing natural session isolation.
- For custom domains (e.g., `pos.acme.com`), a future iteration can add domain verification and mapping in the tenant settings.
- The middleware runs on every request, including API calls. Keep the tenant validation lightweight — avoid external HTTP calls in the critical path.
- If using Vercel Edge Middleware, note that `node:crypto` and `fs` modules are not available. The middleware.ts should only use web-standard APIs.
- Document the local development workflow: use `curl` or a browser extension like "ModHeader" to set the `Host` header for testing different tenants.
