"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

const schema = z.object({
  email: z.string().min(1, "Email is required.").email("Enter a valid email."),
});

type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/auth/forgot-password/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email }),
      });
      if (res.status === 429) {
        throw new Error(
          "Too many requests. Please wait an hour before requesting another reset link."
        );
      }
      // Always show success regardless of outcome to prevent enumeration
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-2xl shadow-lg p-8 border border-[#E2E8F0]">
        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
            style={{ backgroundColor: "#F97316" }}
          >
            <span className="text-white font-bold text-xl font-mono">LC</span>
          </div>
          <h1 className="text-2xl font-bold" style={{ color: "#0F172A" }}>
            Reset Password
          </h1>
          <p className="text-sm mt-1 text-center" style={{ color: "#64748B" }}>
            Enter your email and we&apos;ll send you a reset link.
          </p>
        </div>

        {submitted ? (
          <div
            className="rounded-lg px-4 py-4 text-sm text-center"
            style={{ backgroundColor: "#F0FDF4", color: "#166534" }}
          >
            <p className="font-semibold mb-1">Check your inbox</p>
            <p style={{ color: "#64748B" }}>
              If an account with that email exists, a reset link has been sent.
              The link is valid for 1 hour.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)}>
            {error && (
              <div
                className="mb-4 rounded-lg px-4 py-3 text-sm"
                style={{ backgroundColor: "#FEF2F2", color: "#EF4444" }}
              >
                {error}
              </div>
            )}

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
                {...register("email")}
                className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none"
                style={{ borderColor: errors.email ? "#EF4444" : "#E2E8F0" }}
                placeholder="you@example.com"
                disabled={isLoading}
              />
              {errors.email && (
                <p className="mt-1 text-xs" style={{ color: "#EF4444" }}>
                  {errors.email.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-lg py-2.5 px-4 text-sm font-semibold text-white disabled:opacity-60"
              style={{ backgroundColor: "#F97316" }}
            >
              {isLoading ? "Sending…" : "Send Reset Link"}
            </button>
          </form>
        )}

        <p className="mt-4 text-center text-sm" style={{ color: "#64748B" }}>
          <a
            href="/login"
            className="font-medium hover:underline"
            style={{ color: "#F97316" }}
          >
            Back to login
          </a>
        </p>
      </div>
    </div>
  );
}
