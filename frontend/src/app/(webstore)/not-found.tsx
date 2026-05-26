/**
 * Webstore Not Found Page
 *
 * Renders a branded 404 page using the tenant's theme.
 * Includes the storefront header and footer via the parent layout.
 */

import Link from "next/link";

export default function WebstoreNotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-24 text-center">
      <p
        className="text-8xl font-extrabold tracking-tight opacity-20"
        style={{ color: "var(--ws-color-primary)" }}
        aria-hidden="true"
      >
        404
      </p>
      <div>
        <h1
          className="text-2xl font-bold"
          style={{
            color: "var(--ws-color-text)",
            fontFamily: "var(--ws-font-heading)",
          }}
        >
          Page not found
        </h1>
        <p
          className="mt-2 text-sm opacity-60"
          style={{ color: "var(--ws-color-text)" }}
        >
          We can&apos;t find the page you&apos;re looking for.
        </p>
      </div>
      <Link
        href="/"
        className="rounded-md px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        style={{ backgroundColor: "var(--ws-color-primary)" }}
      >
        Back to Home
      </Link>
    </main>
  );
}
