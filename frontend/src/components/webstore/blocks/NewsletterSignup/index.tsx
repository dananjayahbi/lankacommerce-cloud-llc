/**
 * NewsletterSignup Block
 *
 * Email capture section. POSTs to the webstore newsletter endpoint.
 * In preview mode: shows a "Preview mode" message instead of submitting.
 * On success: replaces the form with the configured success_message.
 */

"use client";

import { useState } from "react";
import type { BlockComponentProps } from "@/lib/webstore/themeRenderer";

export function NewsletterSignup({
  settings,
  isPreview,
  tenantData,
}: BlockComponentProps) {
  const {
    heading,
    subheading,
    button_label,
    placeholder,
    success_message,
    background_color,
    text_color,
    button_color,
  } = settings;

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPreview) {
      setStatus("success");
      return;
    }
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch(
        `/api/webstore/public/${tenantData.tenant.slug}/newsletter/subscribe/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        },
      );
      if (res.ok) {
        setStatus("success");
      } else {
        const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        setErrorMsg((data.detail as string) ?? "Something went wrong. Please try again.");
        setStatus("error");
      }
    } catch {
      setErrorMsg("Network error. Please check your connection.");
      setStatus("error");
    }
  };

  const bg = (background_color as string) ?? "var(--ws-color-primary)";
  const fg = (text_color as string) ?? "#FFFFFF";
  const btnBg = (button_color as string) ?? "var(--ws-color-secondary)";

  return (
    <section
      className="w-full py-14"
      style={{ backgroundColor: bg }}
    >
      <div className="mx-auto max-w-[var(--ws-max-width,1280px)] px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-xl text-center">
          {heading && (
            <h2
              className="mb-3 text-2xl font-bold sm:text-3xl"
              style={{ color: fg, fontFamily: "var(--ws-font-heading)" }}
            >
              {heading as string}
            </h2>
          )}
          {subheading && (
            <p className="mb-6 text-sm sm:text-base" style={{ color: fg, opacity: 0.85 }}>
              {subheading as string}
            </p>
          )}

          {status === "success" ? (
            <p
              className="rounded-lg border border-white/30 px-6 py-4 text-base font-semibold"
              style={{ color: fg }}
              role="status"
            >
              {isPreview
                ? "Preview mode — form not submitted."
                : ((success_message as string) ?? "Thanks for subscribing!")}
            </p>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="flex flex-col gap-3 sm:flex-row"
              noValidate
              aria-label="Newsletter signup"
            >
              <label htmlFor="newsletter-email" className="sr-only">
                Email address
              </label>
              <input
                id="newsletter-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={(placeholder as string) ?? "Your email address"}
                className="min-w-0 flex-1 rounded-md border border-white/30 bg-white/10 px-4 py-3 text-sm placeholder-white/60 text-white focus:outline-none focus:ring-2 focus:ring-white"
                aria-describedby={status === "error" ? "newsletter-error" : undefined}
                disabled={status === "loading"}
              />
              <button
                type="submit"
                disabled={status === "loading"}
                className="flex-shrink-0 rounded-md px-6 py-3 text-sm font-semibold transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-60"
                style={{ backgroundColor: btnBg, color: "#FFFFFF" }}
              >
                {status === "loading"
                  ? "Subscribing…"
                  : ((button_label as string) ?? "Subscribe")}
              </button>
            </form>
          )}

          {status === "error" && errorMsg && (
            <p
              id="newsletter-error"
              className="mt-3 text-sm"
              style={{ color: fg, opacity: 0.85 }}
              role="alert"
            >
              {errorMsg}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
