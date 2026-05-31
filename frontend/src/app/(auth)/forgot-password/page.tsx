"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { z } from "zod/v4";
import Link from "next/link";
import { Mail, AlertTriangle } from "lucide-react";

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
  } = useForm<FormData>({ resolver: standardSchemaResolver(schema) });

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
    <div className="w-full flex flex-col justify-center">
      {/* Brand/Header */}
      <div className="flex flex-col mb-8">
        {/* Mobile-only branding icon */}
        <div
          className="lg:hidden w-12 h-12 rounded-2xl flex items-center justify-center mb-5 shadow-lg shadow-orange-500/10"
          style={{ backgroundColor: "#F97316" }}
        >
          <span className="text-white font-bold text-xl font-mono">LC</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 font-sans leading-none mb-3">
          Reset Password
        </h1>
        <p className="text-base text-slate-500 font-normal">
          Enter your email and we&apos;ll send you a password reset link.
        </p>
      </div>

      {submitted ? (
        <div
          className="rounded-xl px-4 py-6 text-sm text-center border border-green-100 flex flex-col items-center gap-2.5 animate-fade-in"
          style={{ backgroundColor: "#F0FDF4", color: "#166534" }}
        >
          <Mail className="w-10 h-10 text-green-600 mb-1" />
          <p className="font-bold text-base">Check your inbox</p>
          <p className="text-slate-500 font-light leading-relaxed">
            If an account with that email exists, a reset link has been sent. The link is valid for 1 hour.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {error && (
            <div
              className="mb-4 rounded-xl px-4 py-3.5 text-sm font-medium border border-red-100 flex items-center gap-2 animate-shake"
              style={{ backgroundColor: "#FEF2F2", color: "#EF4444" }}
            >
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

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
              {...register("email")}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none transition-all duration-300 placeholder:text-slate-400 focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 disabled:opacity-50"
              style={{ borderColor: errors.email ? "#EF4444" : undefined }}
              placeholder="Enter your email"
              disabled={isLoading}
            />
            {errors.email && (
              <p className="mt-1.5 text-xs font-medium text-red-500 flex items-center gap-1">
                <span>•</span> {errors.email.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-slate-950 py-3.5 px-4 text-sm font-semibold text-white transition-all duration-300 hover:bg-slate-800 hover:shadow-lg hover:shadow-slate-950/10 focus:outline-none focus:ring-4 focus:ring-slate-950/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Sending reset link…
              </span>
            ) : (
              "Send Reset Link"
            )}
          </button>
        </form>
      )}

      <p className="mt-8 text-center text-sm text-slate-500 font-light">
        <Link
          href="/login"
          className="font-semibold text-slate-900 hover:text-slate-700 hover:underline transition-colors"
        >
          Back to login
        </Link>
      </p>
    </div>
  );
}
