/**
 * Consumer Account Dashboard
 *
 * Route: `/account`
 *
 * Shows welcome message, recent orders, and saved addresses.
 * Requires a consumer JWT cookie (set by the login API in Phase 8).
 * Redirects to /account/login if not authenticated.
 */

import { headers, cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "My Account" };

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ConsumerProfile {
  first_name: string;
  last_name: string;
  email: string;
}

interface OrderSummary {
  id: string;
  order_number: string;
  created_at: string;
  total: number;
  status: string;
  item_count: number;
}

// ---------------------------------------------------------------------------
// Internal API base
// ---------------------------------------------------------------------------

const INTERNAL_API =
  process.env.NEXT_INTERNAL_API_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8000";

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

async function fetchProfile(
  slug: string,
  token: string,
): Promise<ConsumerProfile | null> {
  try {
    const res = await fetch(
      `${INTERNAL_API}/api/webstore/public/${slug}/customers/me/`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      },
    );
    if (!res.ok) return null;
    return res.json() as Promise<ConsumerProfile>;
  } catch {
    return null;
  }
}

async function fetchRecentOrders(
  slug: string,
  token: string,
): Promise<OrderSummary[]> {
  try {
    const res = await fetch(
      `${INTERNAL_API}/api/webstore/public/${slug}/customers/orders/?limit=5`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      },
    );
    if (!res.ok) return [];
    return res.json() as Promise<OrderSummary[]>;
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

function OrderStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-800",
    PROCESSING: "bg-blue-100 text-blue-800",
    COMPLETED: "bg-green-100 text-green-800",
    CANCELLED: "bg-red-100 text-red-800",
  };
  const cls = colors[status] ?? "bg-gray-100 text-gray-700";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function AccountPage() {
  const headerStore = await headers();
  const cookieStore = await cookies();
  const slug = headerStore.get("x-tenant-slug");

  if (!slug) notFound();

  const customerToken = cookieStore.get("consumer_access_token")?.value;

  if (!customerToken) {
    redirect("/account/login");
  }

  const [profile, orders] = await Promise.all([
    fetchProfile(slug, customerToken),
    fetchRecentOrders(slug, customerToken),
  ]);

  if (!profile) {
    // Token invalid or expired
    redirect("/account/login");
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <h1
        className="mb-2 text-3xl font-bold"
        style={{
          color: "var(--ws-color-text)",
          fontFamily: "var(--ws-font-heading)",
        }}
      >
        Hello, {profile.first_name}!
      </h1>
      <p className="mb-8 text-sm opacity-60" style={{ color: "var(--ws-color-text)" }}>
        {profile.email}
      </p>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Recent orders */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2
              className="text-lg font-semibold"
              style={{ color: "var(--ws-color-text)" }}
            >
              Recent Orders
            </h2>
            <Link
              href="/account/orders"
              className="text-sm text-blue-600 hover:underline"
            >
              View all
            </Link>
          </div>

          {orders.length === 0 ? (
            <p className="text-sm text-gray-400">No orders yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
              {orders.map((order) => (
                <li key={order.id} className="flex items-center justify-between gap-2 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium" style={{ color: "var(--ws-color-text)" }}>
                      #{order.order_number}
                    </p>
                    <p className="text-xs opacity-60" style={{ color: "var(--ws-color-text)" }}>
                      {new Date(order.created_at).toLocaleDateString()} · {order.item_count} item{order.item_count !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <OrderStatusBadge status={order.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Account actions */}
        <section>
          <h2
            className="mb-4 text-lg font-semibold"
            style={{ color: "var(--ws-color-text)" }}
          >
            Account
          </h2>
          <ul className="flex flex-col gap-2">
            {[
              { href: "/account/orders", label: "Order History" },
              { href: "/account/addresses", label: "Saved Addresses" },
              { href: "/account/profile", label: "Edit Profile" },
              { href: "/account/change-password", label: "Change Password" },
            ].map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="block rounded-md border border-gray-200 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-gray-50"
                  style={{ color: "var(--ws-color-text)" }}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
