/**
 * Consumer Order History Page
 *
 * Route: `/account/orders`
 *
 * Lists all consumer orders with: order number, date, item summary, total,
 * and status badge. Requires consumer JWT.
 */

import { headers, cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Order History" };

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OrderSummary {
  id: string;
  order_number: string;
  created_at: string;
  total: number;
  status: string;
  items_preview: string;
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
// Fetch
// ---------------------------------------------------------------------------

async function fetchOrders(slug: string, token: string): Promise<OrderSummary[]> {
  try {
    const res = await fetch(
      `${INTERNAL_API}/api/webstore/public/${slug}/customers/orders/`,
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

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-800",
    PROCESSING: "bg-blue-100 text-blue-800",
    COMPLETED: "bg-green-100 text-green-800",
    CANCELLED: "bg-red-100 text-red-800",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] ?? "bg-gray-100 text-gray-700"}`}
    >
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function OrderHistoryPage() {
  const headerStore = await headers();
  const cookieStore = await cookies();
  const slug = headerStore.get("x-tenant-slug");

  if (!slug) notFound();

  const token = cookieStore.get("consumer_access_token")?.value;
  if (!token) redirect("/account/login");

  const orders = await fetchOrders(slug, token);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <h1
        className="mb-8 text-3xl font-bold"
        style={{
          color: "var(--ws-color-text)",
          fontFamily: "var(--ws-font-heading)",
        }}
      >
        Order History
      </h1>

      {orders.length === 0 ? (
        <p className="text-center text-gray-400 py-16">No orders yet.</p>
      ) : (
        <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
          {orders.map((order) => (
            <li
              key={order.id}
              className="flex items-center justify-between gap-4 px-5 py-4"
            >
              <div className="min-w-0 flex-1">
                <p
                  className="text-sm font-semibold"
                  style={{ color: "var(--ws-color-text)" }}
                >
                  Order #{order.order_number}
                </p>
                <p
                  className="mt-0.5 truncate text-xs opacity-60"
                  style={{ color: "var(--ws-color-text)" }}
                >
                  {new Date(order.created_at).toLocaleDateString()} ·{" "}
                  {order.item_count} item{order.item_count !== 1 ? "s" : ""}
                  {order.items_preview ? ` — ${order.items_preview}` : ""}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-3">
                <StatusBadge status={order.status} />
                <span
                  className="text-sm font-medium"
                  style={{ color: "var(--ws-color-text)" }}
                >
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "LKR",
                  }).format(order.total / 100)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
