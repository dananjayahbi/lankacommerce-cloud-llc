/**
 * Consumer Account Login Page — Server Component wrapper
 *
 * Route: `/account/login`
 */

import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ConsumerLoginForm } from "@/components/webstore/account/ConsumerLoginForm";

export const metadata: Metadata = { title: "Sign In" };

export default async function AccountLoginPage() {
  const headerStore = await headers();
  const slug = headerStore.get("x-tenant-slug");
  if (!slug) notFound();

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <h1
          className="mb-6 text-2xl font-bold text-center"
          style={{
            color: "var(--ws-color-text)",
            fontFamily: "var(--ws-font-heading)",
          }}
        >
          Sign In
        </h1>
        <ConsumerLoginForm tenantSlug={slug} />
      </div>
    </main>
  );
}
