/**
 * LankaCommerce Next.js Middleware
 *
 * Handles two distinct contexts:
 *
 * 1. MAIN DOMAIN  (localhost:3000 / lankacommerce.com)
 *    - "/" → marketing landing page
 *    - "/register" → business self-registration
 *    - "/login" → superadmin login only
 *    - "/superadmin/*" → superadmin dashboard (SUPER_ADMIN role required)
 *
 * 2. TENANT SUBDOMAIN  (testbusiness.localhost:3000 / testbusiness.lankacommerce.com)
 *    - "/" → redirect to "/login" (unauthenticated) or "/store/dashboard"
 *    - "/login" → tenant-branded login page (scoped to that tenant only)
 *    - "/store/*" → tenant store dashboard (normal role-based guards)
 *    - "/superadmin/*" → redirect to main domain
 *    - "/register" → redirect to main domain registration
 */

import { jwtVerify, type JWTPayload } from "jose";
import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const JWT_SECRET = new TextEncoder().encode(
  process.env.DJANGO_JWT_SECRET ?? ""
);

// ---------------------------------------------------------------------------
// Custom domain resolution cache (in-memory, 5-minute TTL)
// ---------------------------------------------------------------------------

interface DomainCacheEntry {
  tenantSlug: string;
  expiresAt: number;
}

const domainCache = new Map<string, DomainCacheEntry>();
const DOMAIN_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const INTERNAL_API =
  process.env.NEXT_INTERNAL_API_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8000";

/**
 * Resolves a custom domain to a tenant slug by calling the backend
 * domain resolution API. Results are cached for 5 minutes.
 * Returns null if the domain is not registered.
 */
async function resolveCustomDomain(hostname: string): Promise<string | null> {
  const now = Date.now();
  const cached = domainCache.get(hostname);
  if (cached && cached.expiresAt > now) {
    return cached.tenantSlug;
  }

  try {
    const res = await fetch(
      `${INTERNAL_API}/api/webstore/resolve-domain/?domain=${encodeURIComponent(hostname)}`,
      { next: { revalidate: 0 } },
    );
    if (!res.ok) {
      // Cache negative result briefly (30s) to avoid hammering the API
      domainCache.set(hostname, { tenantSlug: "", expiresAt: now + 30_000 });
      return null;
    }
    const data = (await res.json()) as { tenant_slug?: string };
    if (!data.tenant_slug) return null;

    domainCache.set(hostname, {
      tenantSlug: data.tenant_slug,
      expiresAt: now + DOMAIN_CACHE_TTL_MS,
    });
    return data.tenant_slug;
  } catch {
    return null;
  }
}

// Routes that are always publicly accessible (no JWT required)
const PUBLIC_ROUTES = [
  "/login",
  "/pin-login",
  "/forgot-password",
  "/reset-password",
  "/status",
  "/suspended",
  "/register",
];

// Paths on a tenant subdomain that are routed to staff layouts (require JWT).
// Everything else on a subdomain is a public webstore consumer route.
const STAFF_PATH_PREFIXES = [
  "/store",
  "/login",
  "/pin-login",
  "/forgot-password",
  "/reset-password",
  "/suspended",
  "/webstore-preview",
  "/api",
];

/**
 * Returns true if the path targets a staff / admin layout on a tenant subdomain.
 * All other subdomain paths are forwarded to the (webstore) route group.
 */
function isStaffPath(pathname: string): boolean {
  return STAFF_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/"),
  );
}

const API_ROUTE_PREFIX = "/api/";

const SUPERADMIN_ROUTES = ["/superadmin"];

const MANAGEMENT_ONLY_ROUTES = [
  "/store/settings",
  "/store/reports",
  "/store/staff",
];

const NON_CASHIER_ROUTES = ["/store/stock-control"];

const NON_STOCKCLERK_ROUTES = ["/store/pos"];

// ---------------------------------------------------------------------------
// JWT payload type
// ---------------------------------------------------------------------------

interface LankaCommerceJWTPayload extends JWTPayload {
  user_id: string;
  email: string;
  role: "SUPER_ADMIN" | "OWNER" | "MANAGER" | "CASHIER" | "STOCK_CLERK";
  permissions: string[];
  tenant_id: string | null;
  session_version: number;
  subscription_status?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );
}

function isSuperAdminRoute(pathname: string): boolean {
  return SUPERADMIN_ROUTES.some((route) => pathname.startsWith(route));
}

function isManagementOnlyRoute(pathname: string): boolean {
  return MANAGEMENT_ONLY_ROUTES.some((route) => pathname.startsWith(route));
}

function isNonCashierRoute(pathname: string): boolean {
  return NON_CASHIER_ROUTES.some((route) => pathname.startsWith(route));
}

function isNonStockClerkRoute(pathname: string): boolean {
  return NON_STOCKCLERK_ROUTES.some((route) => pathname.startsWith(route));
}

/**
 * Extract the subdomain from a hostname.
 *
 * Dev:  "testbusiness.localhost"  → "testbusiness"
 * Dev:  "localhost"               → null
 * Prod: "testbusiness.lankacommerce.com" → "testbusiness"
 * Prod: "lankacommerce.com"       → null
 * Prod: "www.lankacommerce.com"   → null
 */
function getSubdomain(hostname: string): string | null {
  const host = hostname.split(":")[0]; // strip port
  const parts = host.split(".");

  // Need at least two segments: ["subdomain", "localhost"] or ["subdomain", "domain", "tld"]
  if (parts.length < 2) return null;

  const subdomain = parts[0];

  // Skip "www" and bare "localhost" / "127"
  if (subdomain === "www" || subdomain === "localhost" || subdomain === "127") {
    return null;
  }

  return subdomain;
}

function getStoreRedirectPath(role: string): string {
  switch (role) {
    case "CASHIER":
      return "/store/pos";
    case "STOCK_CLERK":
      return "/store/stock-control";
    default:
      return "/store/dashboard";
  }
}

// ---------------------------------------------------------------------------
// Role-based route enforcement (shared between main domain and subdomains)
// ---------------------------------------------------------------------------

function applyRoleGuards(
  request: NextRequest,
  pathname: string,
  payload: LankaCommerceJWTPayload,
  subdomain: string | null
): NextResponse {
  const { role } = payload;

  // Superadmin can only access superadmin routes (not store routes)
  if (isSuperAdminRoute(pathname) && role !== "SUPER_ADMIN") {
    return NextResponse.redirect(new URL("/store/dashboard", request.url));
  }

  if (pathname.startsWith("/store") && role === "SUPER_ADMIN") {
    return NextResponse.redirect(new URL("/superadmin/dashboard", request.url));
  }

  // Management-only routes (OWNER / MANAGER / SUPER_ADMIN)
  if (isManagementOnlyRoute(pathname)) {
    if (!["OWNER", "MANAGER", "SUPER_ADMIN"].includes(role)) {
      return NextResponse.redirect(new URL("/store/dashboard", request.url));
    }
  }

  if (isNonCashierRoute(pathname) && role === "CASHIER") {
    return NextResponse.redirect(new URL("/store/pos", request.url));
  }

  if (isNonStockClerkRoute(pathname) && role === "STOCK_CLERK") {
    return NextResponse.redirect(new URL("/store/stock-control", request.url));
  }

  // Subscription status enforcement (non-SUPER_ADMIN only)
  if (role !== "SUPER_ADMIN") {
    const subscriptionStatus = payload.subscription_status ?? "SUSPENDED";
    const isSuspendedOrCancelled =
      subscriptionStatus === "SUSPENDED" || subscriptionStatus === "CANCELLED";

    if (isSuspendedOrCancelled && !pathname.includes("/billing")) {
      const suspendedUrl = new URL("/suspended", request.url);
      suspendedUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(suspendedUrl);
    }
  }

  // Pass verified user info as request headers to page components
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-id", payload.user_id);
  requestHeaders.set("x-user-role", role);
  requestHeaders.set("x-user-email", payload.email);
  requestHeaders.set("x-tenant-id", payload.tenant_id ?? "");
  requestHeaders.set("x-session-version", String(payload.session_version));
  if (subdomain) {
    requestHeaders.set("x-tenant-slug", subdomain);
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

// ---------------------------------------------------------------------------
// Main middleware function
// ---------------------------------------------------------------------------

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get("host") ?? "";
  const subdomain = getSubdomain(hostname);

  // Always let API routes through — they handle their own auth
  if (pathname.startsWith(API_ROUTE_PREFIX)) {
    return NextResponse.next();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TENANT SUBDOMAIN CONTEXT
  // ─────────────────────────────────────────────────────────────────────────
  if (subdomain) {
    // Superadmin routes are not accessible on tenant subdomains
    if (isSuperAdminRoute(pathname)) {
      const mainDomain = hostname.replace(`${subdomain}.`, "");
      return NextResponse.redirect(new URL(`http://${mainDomain}/superadmin/dashboard`));
    }

    // Registration is on the main domain only
    if (pathname === "/register" || pathname.startsWith("/register/")) {
      const mainDomain = hostname.replace(`${subdomain}.`, "");
      return NextResponse.redirect(new URL(`http://${mainDomain}/register`));
    }

    // ── Webstore consumer routes ─────────────────────────────────────────────
    // If the path does NOT target a staff/admin layout, treat it as a public
    // consumer-facing webstore page. No JWT is required for most routes;
    // /account/* routes require a valid consumer JWT cookie.
    if (!isStaffPath(pathname)) {
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set("x-tenant-slug", subdomain);

      // Consumer-protected routes: /account/* (order history, profile, etc.)
      // /account/login and /account/register are always public
      if (
        pathname.startsWith("/account/") &&
        pathname !== "/account/login" &&
        !pathname.startsWith("/account/login/") &&
        pathname !== "/account/register" &&
        !pathname.startsWith("/account/register/")
      ) {
        const consumerToken = request.cookies.get("consumer_access_token")?.value;

        if (!consumerToken) {
          const loginUrl = new URL("/account/login", request.url);
          loginUrl.searchParams.set("callbackUrl", pathname);
          return NextResponse.redirect(loginUrl);
        }

        try {
          const { payload: consumerPayload } = await jwtVerify(
            consumerToken,
            JWT_SECRET,
            { algorithms: ["HS256"] }
          );

          // Enforce consumer token type — never accept staff tokens
          if (
            consumerPayload["role"] !== "CONSUMER" ||
            consumerPayload["type"] !== "consumer_access"
          ) {
            throw new Error("Not a consumer token");
          }

          requestHeaders.set("x-consumer-id", String(consumerPayload["sub"] ?? ""));
          requestHeaders.set("x-consumer-email", String(consumerPayload["email"] ?? ""));
        } catch {
          const loginUrl = new URL("/account/login", request.url);
          loginUrl.searchParams.set("sessionExpired", "true");
          const response = NextResponse.redirect(loginUrl);
          response.cookies.delete("consumer_access_token");
          return response;
        }
      }

      return NextResponse.next({ request: { headers: requestHeaders } });
    }

    // ── Staff / admin routes below ────────────────────────────────────────────

    // Login page on subdomain — let it through with the tenant slug header so
    // the page component can fetch tenant branding and scope the login call.
    if (pathname === "/login" || pathname.startsWith("/login/")) {
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set("x-tenant-slug", subdomain);
      return NextResponse.next({ request: { headers: requestHeaders } });
    }

    // All other public routes pass through
    if (isPublicRoute(pathname)) {
      return NextResponse.next();
    }

    // Protected routes — require valid JWT
    const accessToken = request.cookies.get("access_token")?.value;

    if (!accessToken) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    let payload: LankaCommerceJWTPayload;

    try {
      const { payload: verified } = await jwtVerify(accessToken, JWT_SECRET, {
        algorithms: ["HS256"],
      });
      payload = verified as LankaCommerceJWTPayload;
    } catch {
      const refreshToken = request.cookies.get("refresh_token")?.value;
      if (refreshToken) {
        const refreshUrl = new URL("/api/auth/refresh-session", request.url);
        refreshUrl.searchParams.set("callbackUrl", pathname);
        return NextResponse.redirect(refreshUrl);
      }
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("sessionExpired", "true");
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete("access_token");
      response.cookies.delete("refresh_token");
      return response;
    }

    return applyRoleGuards(request, pathname, payload, subdomain);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CUSTOM DOMAIN CONTEXT
  // Handles requests from merchants' own domains (e.g. www.mystore.lk)
  // that are not subdomains of lankacommerce.com.
  // ─────────────────────────────────────────────────────────────────────────

  // A custom domain is any host that:
  //  - has no recognizable subdomain (getSubdomain returned null)
  //  - is not localhost, 127.0.0.1, or the main lankacommerce.com
  //  - is not a staff path (store admin)
  const bareHost = (hostname.split(":")[0] ?? "").toLowerCase();
  const isKnownMainDomain =
    bareHost === "localhost" ||
    bareHost === "127.0.0.1" ||
    bareHost === "lankacommerce.com" ||
    bareHost === "www.lankacommerce.com";

  if (!isKnownMainDomain && !isStaffPath(pathname)) {
    const customTenantSlug = await resolveCustomDomain(bareHost);
    if (customTenantSlug) {
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set("x-tenant-slug", customTenantSlug);
      requestHeaders.set("x-custom-domain", bareHost);
      return NextResponse.next({ request: { headers: requestHeaders } });
    }
    // Unknown custom domain — fall through to main domain handling
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MAIN DOMAIN CONTEXT
  // ─────────────────────────────────────────────────────────────────────────

  // Marketing landing page, registration, and public routes are always accessible
  if (pathname === "/" || isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Protected routes — require valid JWT
  const accessToken = request.cookies.get("access_token")?.value;

  if (!accessToken) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  let payload: LankaCommerceJWTPayload;

  try {
    const { payload: verified } = await jwtVerify(accessToken, JWT_SECRET, {
      algorithms: ["HS256"],
    });
    payload = verified as LankaCommerceJWTPayload;
  } catch {
    const refreshToken = request.cookies.get("refresh_token")?.value;

    if (refreshToken) {
      const refreshUrl = new URL("/api/auth/refresh-session", request.url);
      refreshUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(refreshUrl);
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("sessionExpired", "true");
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete("access_token");
    response.cookies.delete("refresh_token");
    return response;
  }

  return applyRoleGuards(request, pathname, payload, null);
}

// ---------------------------------------------------------------------------
// Matcher
// ---------------------------------------------------------------------------

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|otf)$).*)",
  ],
};
