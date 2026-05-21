"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { z } from "zod/v4";
import { jwtDecode } from "jwt-decode";

import { loginUser } from "@/lib/api/auth";
import { useAuthStore, UserPayload } from "@/stores/authStore";

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
      return "/store/stock";
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
      // 1. Call Django login API
      const response = await loginUser(data.email, data.password);

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

      // 5. Redirect based on role
      router.push(getRedirectPath(payload.role));
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
    <div className="w-full max-w-md">
      {/* Session expired banner */}
      {sessionExpired && (
        <div
          className="mb-4 rounded-lg px-4 py-3 text-sm text-white"
          style={{ backgroundColor: "#3B82F6" }}
          role="alert"
        >
          Your session has expired. Please sign in again.
        </div>
      )}

      {/* Login card */}
      <div className="bg-white rounded-2xl shadow-lg p-8 border border-[#E2E8F0]">
        {/* Logo / Brand */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
            style={{ backgroundColor: "#F97316" }}
          >
            <span className="text-white font-bold text-xl font-mono">LC</span>
          </div>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ color: "#0F172A", fontFamily: "Inter, sans-serif" }}
          >
            LankaCommerce
          </h1>
          <p className="text-sm mt-1" style={{ color: "#64748B" }}>
            Tenant ERP · Sign in to your account
          </p>
        </div>

        {/* Server error */}
        {serverError && (
          <div
            className="mb-4 rounded-lg px-4 py-3 text-sm"
            style={{ backgroundColor: "#FEF2F2", color: "#EF4444" }}
            role="alert"
          >
            {serverError}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          {/* Email */}
          <div className="mb-4">
            <label
              htmlFor="email"
              className="block text-sm font-medium mb-1.5"
              style={{ color: "#0F172A" }}
            >
              Email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              {...register("email")}
              className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors"
              style={{
                borderColor: errors.email ? "#EF4444" : "#E2E8F0",
                color: "#0F172A",
                fontFamily: "Inter, sans-serif",
              }}
              onFocus={(e) =>
                (e.target.style.borderColor = errors.email ? "#EF4444" : "#F97316")
              }
              onBlur={(e) =>
                (e.target.style.borderColor = errors.email ? "#EF4444" : "#E2E8F0")
              }
              placeholder="you@example.com"
              disabled={isLoading}
            />
            {errors.email && (
              <p className="mt-1 text-xs" style={{ color: "#EF4444" }}>
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Password */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="password"
                className="block text-sm font-medium"
                style={{ color: "#0F172A" }}
              >
                Password
              </label>
              <a
                href="/forgot-password"
                className="text-xs font-medium hover:underline"
                style={{ color: "#F97316" }}
              >
                Forgot password?
              </a>
            </div>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              {...register("password")}
              className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors"
              style={{
                borderColor: errors.password ? "#EF4444" : "#E2E8F0",
                color: "#0F172A",
              }}
              onFocus={(e) =>
                (e.target.style.borderColor = errors.password
                  ? "#EF4444"
                  : "#F97316")
              }
              onBlur={(e) =>
                (e.target.style.borderColor = errors.password
                  ? "#EF4444"
                  : "#E2E8F0")
              }
              placeholder="••••••••"
              disabled={isLoading}
            />
            {errors.password && (
              <p className="mt-1 text-xs" style={{ color: "#EF4444" }}>
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg py-2.5 px-4 text-sm font-semibold text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              backgroundColor: isLoading ? "#EA6C05" : "#F97316",
              fontFamily: "Inter, sans-serif",
            }}
            onMouseEnter={(e) => {
              if (!isLoading)
                (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                  "#EA6C05";
            }}
            onMouseLeave={(e) => {
              if (!isLoading)
                (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                  "#F97316";
            }}
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

        {/* PIN login link */}
        <p className="mt-4 text-center text-sm" style={{ color: "#64748B" }}>
          Quick access?{" "}
          <a
            href="/pin-login"
            className="font-medium hover:underline"
            style={{ color: "#F97316" }}
          >
            Use PIN login
          </a>
        </p>
      </div>
    </div>
  );
}
