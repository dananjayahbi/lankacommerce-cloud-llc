"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { z } from "zod/v4";
import { jwtDecode } from "jwt-decode";

import { registerBusiness } from "@/lib/api/auth";
import { useAuthStore, UserPayload } from "@/stores/authStore";

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------

const registerSchema = z
  .object({
    store_name: z
      .string()
      .min(2, "Store name must be at least 2 characters.")
      .max(255, "Store name is too long."),
    owner_email: z
      .string()
      .min(1, "Email is required.")
      .email("Please enter a valid email address."),
    owner_password: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
      .regex(/[0-9]/, "Password must contain at least one number."),
    confirm_password: z.string().min(1, "Please confirm your password."),
    timezone: z.string().default("Asia/Colombo"),
    currency: z.string().default("LKR"),
  })
  .refine((d) => d.owner_password === d.confirm_password, {
    message: "Passwords do not match.",
    path: ["confirm_password"],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function RegisterPage() {
  const setUser = useAuthStore((state) => state.setUser);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState<{
    storeUrl: string;
    devHint: string | null;
    slug: string;
  } | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: standardSchemaResolver(registerSchema),
    defaultValues: {
      timezone: "Asia/Colombo",
      currency: "LKR",
    },
  });

  // Live slug preview
  const storeName = watch("store_name") ?? "";
  const slugPreview = storeName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);

  const onSubmit = async (data: RegisterFormData) => {
    setServerError(null);
    setIsLoading(true);

    try {
      const response = await registerBusiness({
        store_name: data.store_name,
        owner_email: data.owner_email,
        owner_password: data.owner_password,
        timezone: data.timezone,
        currency: data.currency,
      });

      // If we got tokens, log the user in immediately
      if (response.tokens) {
        await fetch("/api/auth/set-tokens", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            access: response.tokens.access,
            refresh: response.tokens.refresh,
          }),
        });

        const payload = jwtDecode<UserPayload & { user_id: string }>(
          response.tokens.access
        );
        setUser({
          user_id: payload.user_id,
          email: payload.email,
          role: payload.role,
          permissions: payload.permissions ?? [],
          tenant_id: payload.tenant_id,
          session_version: payload.session_version,
        });
      }

      setSuccess({
        storeUrl: response.store_url,
        devHint: response.dev_hint,
        slug: response.tenant.slug,
      });
    } catch (error) {
      setServerError(
        error instanceof Error
          ? error.message
          : "Registration failed. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // ── Success state ──────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="w-full max-w-lg">
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-[#E2E8F0] text-center">
          <div className="mb-4 flex justify-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <span className="text-3xl">🎉</span>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-[#0F172A] mb-2">
            Your store is ready!
          </h2>
          <p className="text-sm text-[#64748B] mb-6">
            <strong className="text-[#0F172A]">{success.slug}.localhost:3000</strong> is
            your store&apos;s address. Open the link below to go to your
            dashboard.
          </p>

          <a
            href={success.storeUrl}
            className="block w-full rounded-xl bg-blue-600 hover:bg-blue-500 px-6 py-3 text-sm font-semibold text-white text-center transition-colors mb-4"
          >
            Open My Store Dashboard →
          </a>

          {success.devHint && (
            <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800 text-left">
              <p className="font-semibold mb-1">Dev note:</p>
              <pre className="whitespace-pre-wrap break-words font-mono leading-relaxed">
                {success.devHint}
              </pre>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Registration form ──────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-lg">
      <div className="bg-white rounded-2xl shadow-lg p-8 border border-[#E2E8F0]">
        {/* Logo / Brand */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
            style={{ backgroundColor: "#F97316" }}
          >
            <span className="text-white font-bold text-xl font-mono">LC</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
            Create your store
          </h1>
          <p className="text-sm mt-1 text-[#64748B]">
            30-day free trial · No credit card required
          </p>
        </div>

        {serverError && (
          <div
            className="mb-4 rounded-lg px-4 py-3 text-sm bg-[#FEF2F2] text-[#EF4444]"
            role="alert"
          >
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
          {/* Store name */}
          <div>
            <label
              htmlFor="store_name"
              className="block text-sm font-medium mb-1.5 text-[#0F172A]"
            >
              Business / Store Name
            </label>
            <input
              id="store_name"
              type="text"
              autoComplete="organization"
              placeholder="Lanka Boutique"
              {...register("store_name")}
              className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors focus:ring-2 focus:ring-blue-500"
              style={{ borderColor: errors.store_name ? "#EF4444" : "#E2E8F0" }}
            />
            {slugPreview && (
              <p className="mt-1 text-xs text-[#64748B]">
                Your store URL:{" "}
                <span className="font-mono font-medium text-blue-600">
                  {slugPreview}.localhost:3000
                </span>
              </p>
            )}
            {errors.store_name && (
              <p className="mt-1 text-xs text-[#EF4444]">
                {errors.store_name.message}
              </p>
            )}
          </div>

          {/* Owner email */}
          <div>
            <label
              htmlFor="owner_email"
              className="block text-sm font-medium mb-1.5 text-[#0F172A]"
            >
              Your Email Address
            </label>
            <input
              id="owner_email"
              type="email"
              autoComplete="email"
              placeholder="owner@yourbusiness.com"
              {...register("owner_email")}
              className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors focus:ring-2 focus:ring-blue-500"
              style={{
                borderColor: errors.owner_email ? "#EF4444" : "#E2E8F0",
              }}
            />
            {errors.owner_email && (
              <p className="mt-1 text-xs text-[#EF4444]">
                {errors.owner_email.message}
              </p>
            )}
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="owner_password"
              className="block text-sm font-medium mb-1.5 text-[#0F172A]"
            >
              Password
            </label>
            <input
              id="owner_password"
              type="password"
              autoComplete="new-password"
              placeholder="Min. 8 characters, 1 uppercase, 1 number"
              {...register("owner_password")}
              className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors focus:ring-2 focus:ring-blue-500"
              style={{
                borderColor: errors.owner_password ? "#EF4444" : "#E2E8F0",
              }}
            />
            {errors.owner_password && (
              <p className="mt-1 text-xs text-[#EF4444]">
                {errors.owner_password.message}
              </p>
            )}
          </div>

          {/* Confirm password */}
          <div>
            <label
              htmlFor="confirm_password"
              className="block text-sm font-medium mb-1.5 text-[#0F172A]"
            >
              Confirm Password
            </label>
            <input
              id="confirm_password"
              type="password"
              autoComplete="new-password"
              {...register("confirm_password")}
              className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors focus:ring-2 focus:ring-blue-500"
              style={{
                borderColor: errors.confirm_password ? "#EF4444" : "#E2E8F0",
              }}
            />
            {errors.confirm_password && (
              <p className="mt-1 text-xs text-[#EF4444]">
                {errors.confirm_password.message}
              </p>
            )}
          </div>

          {/* Region preferences */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="timezone"
                className="block text-sm font-medium mb-1.5 text-[#0F172A]"
              >
                Timezone
              </label>
              <select
                id="timezone"
                {...register("timezone")}
                className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="Asia/Colombo">Asia/Colombo (LKT)</option>
                <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                <option value="UTC">UTC</option>
                <option value="America/New_York">America/New_York (EST)</option>
                <option value="Europe/London">Europe/London (GMT)</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="currency"
                className="block text-sm font-medium mb-1.5 text-[#0F172A]"
              >
                Currency
              </label>
              <select
                id="currency"
                {...register("currency")}
                className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="LKR">LKR — Sri Lankan Rupee</option>
                <option value="USD">USD — US Dollar</option>
                <option value="EUR">EUR — Euro</option>
                <option value="GBP">GBP — British Pound</option>
                <option value="INR">INR — Indian Rupee</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed px-6 py-3 text-sm font-semibold text-white transition-colors"
          >
            {isLoading ? "Creating your store…" : "Create My Store"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[#64748B]">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-blue-600 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
