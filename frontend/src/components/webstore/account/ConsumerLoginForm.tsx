/**
 * Consumer Account Login — Client Component
 *
 * Route: `/account/login`
 *
 * Separate from the staff `/login` page. Authenticates storefront consumers
 * against the public customer login API.
 *
 * POST /api/webstore/public/<slug>/customers/login/ (Phase 8)
 * On success → redirect to /account
 */

"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Props {
  tenantSlug: string;
}

export function ConsumerLoginForm({ tenantSlug }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setLoading(true);

      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000"}/api/webstore/public/${tenantSlug}/customers/login/`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          },
        );

        if (res.ok) {
          const data = await res.json() as { access: string; refresh: string };
          // Persist tokens as httpOnly cookies via the Next.js API route
          await fetch("/api/auth/set-consumer-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ access: data.access, refresh: data.refresh }),
          });
          router.push("/account");
        } else {
          const data = (await res.json()) as { detail?: string };
          setError(data.detail ?? "Invalid email or password.");
        }
      } catch {
        setError("Network error. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [email, password, tenantSlug, router],
  );

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && (
        <div
          role="alert"
          className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium" style={{ color: "var(--ws-color-text)" }}>
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2"
          style={{ color: "var(--ws-color-text)" }}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium" style={{ color: "var(--ws-color-text)" }}>
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2"
          style={{ color: "var(--ws-color-text)" }}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="rounded-md px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        style={{ backgroundColor: "var(--ws-color-primary)" }}
      >
        {loading ? "Signing in…" : "Sign In"}
      </button>

      <div className="flex items-center justify-between text-sm">
        <Link href="/account/forgot-password" className="text-blue-600 hover:underline">
          Forgot password?
        </Link>
        <Link href="/account/register" className="text-blue-600 hover:underline">
          Create account
        </Link>
      </div>

      {/* Subtle hint for staff members who land here by mistake */}
      <p className="mt-2 text-center text-xs text-gray-400">
        Looking for the store management login?{" "}
        <Link href="/login" className="underline">
          Visit /login
        </Link>
      </p>
    </form>
  );
}
