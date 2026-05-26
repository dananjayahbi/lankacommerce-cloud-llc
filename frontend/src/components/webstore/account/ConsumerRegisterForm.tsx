/**
 * Consumer Registration Form — Client Component
 *
 * POST /api/webstore/public/<slug>/customers/register/ (Phase 8)
 * On success → redirect to /account
 */

"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Props {
  tenantSlug: string;
}

export function ConsumerRegisterForm({ tenantSlug }: Props) {
  const router = useRouter();
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    confirm_password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      if (form.password !== form.confirm_password) {
        setError("Passwords do not match.");
        return;
      }

      setLoading(true);

      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000"}/api/webstore/public/${tenantSlug}/customers/register/`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              first_name: form.first_name,
              last_name: form.last_name,
              email: form.email,
              password: form.password,
            }),
            credentials: "include",
          },
        );

        if (res.ok) {
          router.push("/account");
        } else {
          const data = (await res.json()) as Record<string, string[] | string>;
          const firstError = Object.values(data).flat()[0];
          setError(typeof firstError === "string" ? firstError : "Registration failed.");
        }
      } catch {
        setError("Network error. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [form, tenantSlug, router],
  );

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && (
        <div role="alert" className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {(
          [
            { id: "first_name", label: "First Name", autoComplete: "given-name" },
            { id: "last_name", label: "Last Name", autoComplete: "family-name" },
          ] as const
        ).map(({ id, label, autoComplete }) => (
          <div key={id} className="flex flex-col gap-1">
            <label htmlFor={id} className="text-sm font-medium" style={{ color: "var(--ws-color-text)" }}>
              {label}
            </label>
            <input
              id={id}
              type="text"
              required
              autoComplete={autoComplete}
              value={form[id]}
              onChange={set(id)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2"
            />
          </div>
        ))}
      </div>

      {(
        [
          { id: "email", label: "Email", type: "email", autoComplete: "email" },
          { id: "password", label: "Password", type: "password", autoComplete: "new-password" },
          { id: "confirm_password", label: "Confirm Password", type: "password", autoComplete: "new-password" },
        ] as const
      ).map(({ id, label, type, autoComplete }) => (
        <div key={id} className="flex flex-col gap-1">
          <label htmlFor={id} className="text-sm font-medium" style={{ color: "var(--ws-color-text)" }}>
            {label}
          </label>
          <input
            id={id}
            type={type}
            required
            autoComplete={autoComplete}
            value={form[id]}
            onChange={set(id)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2"
          />
        </div>
      ))}

      <button
        type="submit"
        disabled={loading}
        className="rounded-md px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        style={{ backgroundColor: "var(--ws-color-primary)" }}
      >
        {loading ? "Creating account…" : "Create Account"}
      </button>

      <p className="text-center text-sm text-gray-500">
        Already have an account?{" "}
        <Link href="/account/login" className="text-blue-600 hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
