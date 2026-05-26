/**
 * Consumer Account Registration Page
 *
 * Route: `/account/register`
 */

import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ConsumerRegisterForm } from "@/components/webstore/account/ConsumerRegisterForm";

export const metadata: Metadata = { title: "Create Account" };

export default async function AccountRegisterPage() {
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
          Create Account
        </h1>
        <ConsumerRegisterForm tenantSlug={slug} />
      </div>
    </main>
  );
}
