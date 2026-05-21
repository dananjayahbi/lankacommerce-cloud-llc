import { decodeJwt, jwtVerify, type JWTPayload } from "jose";
import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const JWT_SECRET = new TextEncoder().encode(
  process.env.DJANGO_JWT_SECRET ?? ""
);

const PUBLIC_ROUTES = [
  "/login",
  "/pin-login",
  "/forgot-password",
  "/reset-password",
];

const SUPERADMIN_ROUTES = ["/superadmin"];

const MANAGEMENT_ONLY_ROUTES = [
  "/store/settings",
  "/store/reports",
  "/store/staff",
];

const NON_CASHIER_ROUTES = ["/store/stock"];

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

// ---------------------------------------------------------------------------
// Main middleware function
// ---------------------------------------------------------------------------

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Always allow public routes through
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // 2. Read access token from httpOnly cookie
  const accessToken = request.cookies.get("access_token")?.value;

  if (!accessToken) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // 3. Verify JWT signature and extract payload
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

  const { role } = payload;

  // 4. Enforce role-based route access

  if (isSuperAdminRoute(pathname) && role !== "SUPER_ADMIN") {
    return NextResponse.redirect(new URL("/store/dashboard", request.url));
  }

  if (pathname.startsWith("/store") && role === "SUPER_ADMIN") {
    return NextResponse.redirect(new URL("/superadmin/dashboard", request.url));
  }

  if (isManagementOnlyRoute(pathname)) {
    if (!["OWNER", "MANAGER", "SUPER_ADMIN"].includes(role)) {
      return NextResponse.redirect(new URL("/store/dashboard", request.url));
    }
  }

  if (isNonCashierRoute(pathname) && role === "CASHIER") {
    return NextResponse.redirect(new URL("/store/pos", request.url));
  }

  if (isNonStockClerkRoute(pathname) && role === "STOCK_CLERK") {
    return NextResponse.redirect(new URL("/store/stock", request.url));
  }

  // 5. Subscription status enforcement (JWT-based, non-SUPER_ADMIN only)
  if (role !== "SUPER_ADMIN") {
    const subscriptionStatus = payload.subscription_status ?? "SUSPENDED";
    const isSuspendedOrCancelled =
      subscriptionStatus === "SUSPENDED" || subscriptionStatus === "CANCELLED";

    if (isSuspendedOrCancelled) {
      // Allow billing (to pay) and suspended page (to avoid redirect loop)
      const allowedForSuspended =
        pathname === "/suspended" ||
        pathname.startsWith("/suspended/") ||
        pathname.includes("/billing") ||
        pathname.startsWith("/api/");

      if (!allowedForSuspended) {
        const suspendedUrl = new URL("/suspended", request.url);
        suspendedUrl.searchParams.set("from", pathname);
        return NextResponse.redirect(suspendedUrl);
      }
    }
  }

  // 6. Pass verified user info to page components via request headers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-id", payload.user_id);
  requestHeaders.set("x-user-role", role);
  requestHeaders.set("x-user-email", payload.email);
  requestHeaders.set("x-tenant-id", payload.tenant_id ?? "");
  requestHeaders.set("x-session-version", String(payload.session_version));

  return NextResponse.next({ request: { headers: requestHeaders } });
}

// ---------------------------------------------------------------------------
// Matcher
// ---------------------------------------------------------------------------

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|otf)$).*)",
  ],
};
