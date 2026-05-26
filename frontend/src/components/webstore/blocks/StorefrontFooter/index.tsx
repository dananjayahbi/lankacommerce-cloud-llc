/**
 * StorefrontFooter Block
 *
 * Responsive footer rendered at the bottom of every storefront page.
 * Layout: responsive CSS grid — 4 columns desktop / 2 tablet / 1 mobile.
 *
 * Nested block types supported:
 *   - "menu_list"   — a footer navigation column with a heading and links
 *   - "newsletter"  — a compact email signup form
 *   - "social_icons"— social platform links from global_settings.social
 *   - "text_block"  — arbitrary HTML content for a column
 */

"use client";

import { useState } from "react";
import Link from "next/link";

import type { BlockComponentProps } from "@/lib/webstore/themeRenderer";

// TikTok doesn't have a Lucide icon, use a simple SVG inline.
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z" />
    </svg>
  );
}

// ── Inline SVG social icons ───────────────────────────────────────────────────

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className} aria-hidden="true">
      <rect width={20} height={20} x={2} y={2} rx={5} ry={5} />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1={17.5} x2={17.51} y1={6.5} y2={6.5} />
    </svg>
  );
}

function YoutubeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z" />
      <polygon fill="white" points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" />
    </svg>
  );
}

// ── Social icon row ──────────────────────────────────────────────────────────

interface SocialIconsProps {
  social: {
    facebook?: string;
    instagram?: string;
    tiktok?: string;
    youtube?: string;
  };
}

function SocialIcons({ social }: SocialIconsProps) {
  const links = [
    { key: "facebook", href: social.facebook, Icon: FacebookIcon, label: "Facebook" },
    { key: "instagram", href: social.instagram, Icon: InstagramIcon, label: "Instagram" },
    { key: "tiktok", href: social.tiktok, Icon: TikTokIcon, label: "TikTok" },
    { key: "youtube", href: social.youtube, Icon: YoutubeIcon, label: "YouTube" },
  ].filter((l): l is typeof l & { href: string } => Boolean(l.href));

  if (links.length === 0) return null;

  return (
    <div className="flex items-center gap-3">
      {links.map(({ key, href, Icon, label }) => (
        <a
          key={key}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          className="rounded p-1 opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ws-color-primary)]"
          style={{ color: "var(--ws-color-text)" }}
        >
          <Icon className="h-5 w-5" />
        </a>
      ))}
    </div>
  );
}

// ── Newsletter mini form ──────────────────────────────────────────────────────

function FooterNewsletter({ isPreview }: { isPreview: boolean }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPreview) {
      setStatus("success");
      return;
    }
    try {
      const res = await fetch("/api/webstore/newsletter/subscribe/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setStatus(res.ok ? "success" : "error");
    } catch {
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <p className="text-sm" style={{ color: "var(--ws-color-accent)" }}>
        {isPreview ? "Preview mode — not submitted." : "Thanks for subscribing!"}
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2" noValidate>
      <label
        htmlFor="footer-newsletter-email"
        className="text-sm font-medium"
        style={{ color: "var(--ws-color-text)" }}
      >
        Newsletter
      </label>
      <div className="flex gap-2">
        <input
          id="footer-newsletter-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Your email"
          className="min-w-0 flex-1 rounded border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ws-color-primary)]"
          style={{ borderColor: "var(--ws-color-secondary)", color: "var(--ws-color-text)" }}
        />
        <button
          type="submit"
          className="rounded px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ws-color-primary)]"
          style={{ backgroundColor: "var(--ws-color-primary)" }}
        >
          Subscribe
        </button>
      </div>
      {status === "error" && (
        <p className="text-xs text-red-500" role="alert">
          Something went wrong. Please try again.
        </p>
      )}
    </form>
  );
}

// ── Payment icons ─────────────────────────────────────────────────────────────

function PaymentIcons() {
  // Inline simple card badge labels — no external SVG dependency in Phase 6.
  const cards = ["Visa", "Mastercard", "Amex", "PayPal"];
  return (
    <div className="flex items-center gap-2" aria-label="Accepted payment methods">
      {cards.map((card) => (
        <span
          key={card}
          className="rounded border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
          style={{
            borderColor: "var(--ws-color-secondary)",
            color: "var(--ws-color-text)",
            opacity: 0.6,
          }}
        >
          {card}
        </span>
      ))}
    </div>
  );
}

// ── StorefrontFooter ──────────────────────────────────────────────────────────

export function StorefrontFooter({
  settings,
  blocks,
  blockOrder,
  isPreview,
  tenantData,
}: BlockComponentProps) {
  const { show_payment_icons, show_social_icons, copyright_text } = settings;

  // Partition nested blocks by type
  const columnBlocks = blockOrder.map((id) => ({ id, blk: blocks[id] }));

  return (
    <footer
      className="mt-auto border-t"
      style={{
        backgroundColor: "var(--ws-color-background)",
        borderColor: "var(--ws-color-secondary)",
        opacity: 0.95,
      }}
    >
      {/* Column grid */}
      {columnBlocks.length > 0 && (
        <div className="mx-auto max-w-[var(--ws-max-width,1280px)] px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {columnBlocks.map(({ id, blk }) => {
              if (!blk) return null;

              // ── Menu list column ───────────────────────────────────────────
              if (blk.type === "menu_list") {
                const menuHandle = blk.settings.menu_handle as string;
                const title = blk.settings.title as string;
                const menuData = tenantData.menus[menuHandle];
                return (
                  <div key={id}>
                    {title && (
                      <h3
                        className="mb-3 text-sm font-semibold uppercase tracking-wider"
                        style={{
                          color: "var(--ws-color-text)",
                          fontFamily: "var(--ws-font-heading)",
                        }}
                      >
                        {title}
                      </h3>
                    )}
                    {menuData && (
                      <ul className="space-y-2">
                        {menuData.items.map((item) => (
                          <li key={item.id}>
                            <Link
                              href={item.url}
                              target={item.target}
                              rel={item.target === "_blank" ? "noopener noreferrer" : undefined}
                              className="text-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus-visible:underline"
                              style={{ color: "var(--ws-color-text)" }}
                            >
                              {item.title}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              }

              // ── Newsletter column ──────────────────────────────────────────
              if (blk.type === "newsletter") {
                return (
                  <div key={id}>
                    <FooterNewsletter isPreview={isPreview} />
                  </div>
                );
              }

              // ── Social icons column ────────────────────────────────────────
              if (blk.type === "social_icons") {
                return (
                  <div key={id}>
                    <h3
                      className="mb-3 text-sm font-semibold uppercase tracking-wider"
                      style={{
                        color: "var(--ws-color-text)",
                        fontFamily: "var(--ws-font-heading)",
                      }}
                    >
                      Follow Us
                    </h3>
                    <SocialIcons social={tenantData.tenant as unknown as Record<string, string>} />
                  </div>
                );
              }

              // ── Text block column ──────────────────────────────────────────
              if (blk.type === "text_block") {
                return (
                  <div key={id}>
                    <div
                      className="prose prose-sm max-w-none text-sm"
                      style={{ color: "var(--ws-color-text)", opacity: 0.8 }}
                      dangerouslySetInnerHTML={{ __html: (blk.settings.content as string) ?? "" }}
                    />
                  </div>
                );
              }

              return null;
            })}
          </div>
        </div>
      )}

      {/* Bottom bar */}
      <div
        className="border-t"
        style={{ borderColor: "var(--ws-color-secondary)", opacity: 0.3 }}
      />
      <div className="mx-auto flex max-w-[var(--ws-max-width,1280px)] flex-col items-center justify-between gap-4 px-4 py-6 sm:flex-row sm:px-6 lg:px-8">
        {/* Copyright */}
        <p
          className="text-sm"
          style={{ color: "var(--ws-color-text)", opacity: 0.6 }}
        >
          {(copyright_text as string) ?? `© ${new Date().getFullYear()} ${tenantData.tenant.name}. All rights reserved.`}
        </p>

        <div className="flex flex-col items-center gap-3 sm:flex-row">
          {/* Social icons in bottom bar if not in columns */}
          {show_social_icons && columnBlocks.every((c) => c.blk?.type !== "social_icons") && (
            <SocialIcons social={tenantData.tenant as unknown as Record<string, string>} />
          )}
          {show_payment_icons && <PaymentIcons />}
        </div>
      </div>
    </footer>
  );
}
