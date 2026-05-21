"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { z } from "zod/v4";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

const schema = z
  .object({
    new_password: z.string().min(8, "Password must be at least 8 characters."),
    confirm_password: z.string().min(8, "Please confirm your password."),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Passwords do not match.",
    path: ["confirm_password"],
  });

type FormData = z.infer<typeof schema>;

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: standardSchemaResolver(schema) });

  if (!token) {
    return (
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-[#E2E8F0] text-center">
          <p style={{ color: "#EF4444" }}>
            Invalid reset link. Please request a new password reset.
          </p>
          <a
            href="/forgot-password"
            className="mt-4 inline-block font-medium hover:underline"
            style={{ color: "#F97316" }}
          >
            Request new link
          </a>
        </div>
      </div>
    );
  }

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    setServerError(null);

    try {
      const res = await fetch(`${API_BASE}/api/auth/reset-password/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          new_password: data.new_password,
          confirm_password: data.confirm_password,
        }),
      });

      const body = await res.json();

      if (!res.ok) {
        throw new Error(body.detail ?? "Password reset failed.");
      }

      setSuccess(true);
      setTimeout(() => router.push("/login"), 3000);
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : "An error occurred."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-2xl shadow-lg p-8 border border-[#E2E8F0]">
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
            style={{ backgroundColor: "#F97316" }}
          >
            <span className="text-white font-bold text-xl font-mono">LC</span>
          </div>
          <h1 className="text-2xl font-bold" style={{ color: "#0F172A" }}>
            Set New Password
          </h1>
          <p className="text-sm mt-1" style={{ color: "#64748B" }}>
            Choose a strong password for your account.
          </p>
        </div>

        {success ? (
          <div
            className="rounded-lg px-4 py-4 text-sm text-center"
            style={{ backgroundColor: "#F0FDF4", color: "#166534" }}
          >
            <p className="font-semibold mb-1">Password updated!</p>
            <p style={{ color: "#64748B" }}>Redirecting you to the login page…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)}>
            {serverError && (
              <div
                className="mb-4 rounded-lg px-4 py-3 text-sm"
                style={{ backgroundColor: "#FEF2F2", color: "#EF4444" }}
              >
                {serverError}
              </div>
            )}

            <div className="mb-4">
              <label
                htmlFor="new_password"
                className="block text-sm font-medium mb-1.5"
                style={{ color: "#0F172A" }}
              >
                New password
              </label>
              <input
                id="new_password"
                type="password"
                autoComplete="new-password"
                {...register("new_password")}
                className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none"
                style={{
                  borderColor: errors.new_password ? "#EF4444" : "#E2E8F0",
                }}
                disabled={isLoading}
              />
              {errors.new_password && (
                <p className="mt-1 text-xs" style={{ color: "#EF4444" }}>
                  {errors.new_password.message}
                </p>
              )}
            </div>

            <div className="mb-6">
              <label
                htmlFor="confirm_password"
                className="block text-sm font-medium mb-1.5"
                style={{ color: "#0F172A" }}
              >
                Confirm new password
              </label>
              <input
                id="confirm_password"
                type="password"
                autoComplete="new-password"
                {...register("confirm_password")}
                className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none"
                style={{
                  borderColor: errors.confirm_password ? "#EF4444" : "#E2E8F0",
                }}
                disabled={isLoading}
              />
              {errors.confirm_password && (
                <p className="mt-1 text-xs" style={{ color: "#EF4444" }}>
                  {errors.confirm_password.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-lg py-2.5 px-4 text-sm font-semibold text-white disabled:opacity-60"
              style={{ backgroundColor: "#F97316" }}
            >
              {isLoading ? "Updating…" : "Reset Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-[#E2E8F0] text-center">
            <p style={{ color: "#64748B" }}>Loading…</p>
          </div>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
