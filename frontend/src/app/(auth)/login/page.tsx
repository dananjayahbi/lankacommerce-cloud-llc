"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { z } from "zod/v4";
import { jwtDecode } from "jwt-decode";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";

import { loginUser, getTenantPublicInfo, type TenantPublicInfo } from "@/lib/api/auth";
import { useAuthStore, UserPayload } from "@/stores/authStore";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract subdomain from hostname, e.g. "testbusiness.localhost" → "testbusiness" */
function extractSubdomain(hostname: string): string | null {
  const host = hostname.split(":")[0];
  if (!host) return null;
  const parts = host.split(".");
  if (parts.length < 2) return null;
  const sub = parts[0];
  if (!sub || sub === "www" || sub === "localhost" || sub === "127") return null;
  return sub;
}

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required.")
    .email("Please enter a valid email address."),
  password: z
    .string()
    .min(1, "Password is required.")
    .min(6, "Password must be at least 6 characters."),
});

type LoginFormData = z.infer<typeof loginSchema>;

// ---------------------------------------------------------------------------
// Role-based redirect map
// ---------------------------------------------------------------------------

function getRedirectPath(role: string): string {
  switch (role) {
    case "SUPER_ADMIN":
      return "/superadmin/dashboard";
    case "OWNER":
    case "MANAGER":
      return "/store/dashboard";
    case "CASHIER":
      return "/store/pos";
    case "STOCK_CLERK":
      return "/store/stock-control";
    default:
      return "/store/dashboard";
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionExpired = searchParams.get("sessionExpired") === "true";

  const setUser = useAuthStore((state) => state.setUser);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Subdomain / tenant context (populated client-side from hostname)
  const [tenantSlug, setTenantSlug] = useState<string | null>(null);
  const [tenantInfo, setTenantInfo] = useState<TenantPublicInfo | null>(null);

  useEffect(() => {
    const slug = extractSubdomain(window.location.hostname);
    if (slug) {
      setTenantSlug(slug);
      getTenantPublicInfo(slug).then((info) => {
        if (info) setTenantInfo(info);
      });
    }
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: standardSchemaResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setServerError(null);
    setIsLoading(true);

    try {
      // 1. Call Django login API (pass tenantSlug for subdomain-scoped login)
      const response = await loginUser(data.email, data.password, tenantSlug ?? undefined);

      // 2. Set httpOnly cookies via the Next.js API route
      await fetch("/api/auth/set-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access: response.access,
          refresh: response.refresh,
        }),
      });

      // 3. Decode access token to get user payload
      const payload = jwtDecode<UserPayload & { user_id: string }>(response.access);

      // 4. Store user info in Zustand
      setUser({
        user_id: payload.user_id,
        email: payload.email,
        role: payload.role,
        permissions: payload.permissions ?? [],
        tenant_id: payload.tenant_id,
        session_version: payload.session_version,
      });

      // 5. Redirect based on role — hard navigation ensures cookie is sent
      window.location.href = getRedirectPath(payload.role);
    } catch (error) {
      setServerError(
        error instanceof Error
          ? error.message
          : "An unexpected error occurred. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full flex flex-col justify-center">
      {/* Session expired banner */}
      {sessionExpired && (
        <div
          className="mb-6 rounded-xl px-4 py-3 text-sm text-white font-medium shadow-md shadow-blue-500/10 animate-fade-in"
          style={{ backgroundColor: "#3B82F6" }}
          role="alert"
        >
          Your session has expired. Please sign in again.
        </div>
      )}

      {/* Header / Typography */}
      <div className="flex flex-col mb-8">
        {/* Render dynamic tenant branding or fallback platform title */}
        {tenantInfo ? (
          <>
            {tenantInfo.logo_url ? (
              <img
                src={tenantInfo.logo_url}
                alt={tenantInfo.name}
                className="h-12 w-auto object-contain self-start mb-4 max-w-[180px]"
              />
            ) : (
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 shadow-md shadow-orange-500/10"
                style={{ backgroundColor: "#F97316" }}
              >
                <span className="text-white font-bold text-xl font-mono">
                  {tenantInfo.name.substring(0, 2).toUpperCase()}
                </span>
              </div>
            )}
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 font-sans leading-none mb-3">
              {tenantInfo.name}
            </h1>
            <p className="text-base text-slate-500 font-normal">
              Sign in to your store ERP dashboard
            </p>
          </>
        ) : (
          <>
            {/* Show nice brand icon on mobile since left panel is hidden */}
            <div
              className="lg:hidden w-12 h-12 rounded-2xl flex items-center justify-center mb-5 shadow-lg shadow-orange-500/10"
              style={{ backgroundColor: "#F97316" }}
            >
              <span className="text-white font-bold text-xl font-mono">LC</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 font-sans leading-none mb-3">
              Welcome Back
            </h1>
            <p className="text-base text-slate-500 font-normal">
              Tenant ERP · Sign in to your cloud account
            </p>
          </>
        )}
      </div>

      {/* Server error */}
      {serverError && (
        <div
          className="mb-6 rounded-xl px-4 py-3.5 text-sm font-medium border border-red-100 flex items-center gap-2 animate-shake"
          style={{ backgroundColor: "#FEF2F2", color: "#EF4444" }}
          role="alert"
        >
          <span className="text-base">⚠️</span>
          <span>{serverError}</span>
        </div>
      )}

      {/* Login Credentials Form */}
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        {/* Email */}
        <div>
          <label
            htmlFor="email"
            className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2"
          >
            Email address
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            {...register("email")}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none transition-all duration-300 placeholder:text-slate-400 focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 disabled:opacity-50"
            style={{
              borderColor: errors.email ? "#EF4444" : undefined,
              color: "#0F172A",
              fontFamily: "Inter, sans-serif",
            }}
            placeholder="Enter your email"
            disabled={isLoading}
          />
          {errors.email && (
            <p className="mt-1.5 text-xs font-medium text-red-500 flex items-center gap-1">
              <span>•</span> {errors.email.message}
            </p>
          )}
        </div>

        {/* Password */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label
              htmlFor="password"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-500"
            >
              Password
            </label>
          </div>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              {...register("password")}
              className="w-full rounded-xl border border-slate-200 bg-white pl-4 pr-12 py-3.5 text-sm outline-none transition-all duration-300 placeholder:text-slate-400 focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 disabled:opacity-50"
              style={{
                borderColor: errors.password ? "#EF4444" : undefined,
                color: "#0F172A",
              }}
              placeholder="Enter your password"
              disabled={isLoading}
            />
            {/* Show/Hide password toggle */}
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1.5 text-xs font-medium text-red-500 flex items-center gap-1">
              <span>•</span> {errors.password.message}
            </p>
          )}
        </div>

        {/* Remember me & Forgot Password */}
        <div className="flex items-center justify-between text-sm pt-1">
          <label className="flex items-center gap-2.5 cursor-pointer text-slate-600 select-none group">
            <input
              type="checkbox"
              className="rounded border-slate-300 text-slate-950 focus:ring-slate-950 accent-slate-950 w-4 h-4 cursor-pointer transition-all"
            />
            <span className="group-hover:text-slate-900 transition-colors">Remember me</span>
          </label>
          <Link
            href="/forgot-password"
            className="font-semibold text-slate-900 hover:text-slate-700 hover:underline transition-all"
          >
            Forgot Password?
          </Link>
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-xl bg-slate-950 py-3.5 px-4 text-sm font-semibold text-white transition-all duration-300 hover:bg-slate-800 hover:shadow-lg hover:shadow-slate-950/10 focus:outline-none focus:ring-4 focus:ring-slate-950/20 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="animate-spin h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z"
                />
              </svg>
              Signing in…
            </span>
          ) : (
            "Sign in"
          )}
        </button>
      </form>

      {/* Or Divider */}
      <div className="relative my-7 text-center select-none">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-100"></div>
        </div>
        <span className="relative bg-white px-4 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Or
        </span>
      </div>

      {/* PIN login (SSO style primary outline badge) */}
      <Link
        href="/pin-login"
        className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3.5 px-4 text-sm font-semibold text-slate-700 transition-all duration-300 hover:bg-slate-50 hover:border-slate-300 focus:outline-none focus:ring-4 focus:ring-slate-100 shadow-sm"
      >
        <span className="text-base select-none">🔑</span>
        <span>Sign in with PIN</span>
      </Link>

      {/* Platform registration link shown only on the main domain (no tenant context) */}
      {!tenantSlug && (
        <p className="mt-8 text-center text-sm text-slate-500 font-light">
          New to LankaCommerce?{" "}
          <Link
            href="/register"
            className="font-semibold text-slate-900 hover:text-slate-700 hover:underline transition-colors ml-1"
          >
            Register your business
          </Link>
        </p>
      )}
    </div>
  );
}
