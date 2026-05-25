import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ShoppingCart,
  TrendingUp,
  AlertTriangle,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import MetricCard from "@/components/MetricCard";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

interface TodayStats {
  revenue: number;
  transaction_count: number;
  avg_basket: number;
  revenue_delta_pct: number | null;
}

interface RecentSale {
  id: string;
  total_amount: string;
  payment_method: string | null;
  completed_at: string | null;
}

interface DashboardPayload {
  today: TodayStats;
  low_stock_count: number;
  open_shifts: number;
  recent_sales: RecentSale[];
}

function formatLKR(value: number): string {
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function relativeTime(isoStr: string | null): string {
  if (!isoStr) return "—";
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function paymentBadge(method: string | null) {
  const map: Record<string, string> = {
    CASH: "bg-green-50 text-green-700",
    CARD: "bg-blue-50 text-blue-700",
    SPLIT: "bg-purple-50 text-purple-700",
  };
  const cls = map[method ?? ""] ?? "bg-slate-100 text-slate-600";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {method ?? "—"}
    </span>
  );
}

export default async function StoreDashboardPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;

  if (!accessToken) redirect("/login");

  let data: DashboardPayload | null = null;
  let fetchError = false;

  try {
    const res = await fetch(`${API_BASE}/api/reports/store-dashboard/`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });

    if (res.status === 401) redirect("/login");
    if (!res.ok) {
      fetchError = true;
    } else {
      const json = await res.json();
      data = json.data ?? null;
    }
  } catch {
    fetchError = true;
  }

  if (fetchError || !data) {
    return (
      <main className="p-6 flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-slate-500">
          Could not load dashboard data. Please refresh.
        </p>
        <Link
          href="/store/dashboard"
          className="rounded-md bg-[#F97316] px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
        >
          Retry
        </Link>
      </main>
    );
  }

  const { today, low_stock_count, open_shifts, recent_sales } = data;
  const deltaPositive =
    today.revenue_delta_pct !== null && today.revenue_delta_pct >= 0;

  return (
    <main className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <span className="text-sm text-slate-400">
          {new Date().toLocaleDateString("en-LK", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </span>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Today's Revenue"
          value={formatLKR(today.revenue)}
          icon={TrendingUp}
        />
        <MetricCard
          label="Transactions Today"
          value={today.transaction_count}
          icon={ShoppingCart}
        />
        <MetricCard
          label="Avg. Basket"
          value={formatLKR(today.avg_basket)}
          icon={Activity}
          accentColour="amber"
        />
        <MetricCard
          label="Low Stock Alerts"
          value={low_stock_count}
          icon={AlertTriangle}
          accentColour={low_stock_count > 0 ? "amber" : "orange"}
        />
      </div>

      {/* vs Yesterday badge */}
      {today.revenue_delta_pct !== null && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">vs yesterday:</span>
          <span
            className={`flex items-center gap-1 text-sm font-semibold ${
              deltaPositive ? "text-green-600" : "text-red-500"
            }`}
          >
            {deltaPositive ? (
              <ArrowUpRight size={16} />
            ) : (
              <ArrowDownRight size={16} />
            )}
            {Math.abs(today.revenue_delta_pct)}%
          </span>
        </div>
      )}

      {/* Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Sales */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900">Recent Sales</h2>
            <Link
              href="/store/reports/profit-loss"
              className="text-xs text-[#F97316] hover:underline font-medium"
            >
              View reports →
            </Link>
          </div>
          {recent_sales.length === 0 ? (
            <p className="text-center text-sm text-slate-400 py-6">
              No sales yet today
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recent_sales.map((sale) => (
                <li
                  key={sale.id}
                  className="py-3 flex items-center justify-between gap-3"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      {formatLKR(parseFloat(sale.total_amount))}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {relativeTime(sale.completed_at)}
                    </p>
                  </div>
                  {paymentBadge(sale.payment_method)}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Quick Links */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-base font-bold text-slate-900 mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { href: "/store/pos", label: "Open POS", emoji: "🛒" },
              { href: "/store/inventory", label: "Inventory", emoji: "📦" },
              { href: "/store/customers", label: "Customers", emoji: "👥" },
              { href: "/store/staff", label: "Staff", emoji: "👨‍💼" },
              {
                href: "/store/reports/profit-loss",
                label: "P&L Report",
                emoji: "📊",
              },
              { href: "/store/settings", label: "Settings", emoji: "⚙️" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-lg border border-slate-100 p-3 hover:border-[#F97316] hover:bg-orange-50 transition-colors group"
              >
                <span className="text-xl">{item.emoji}</span>
                <span className="text-sm font-medium text-slate-700 group-hover:text-[#F97316]">
                  {item.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Open Shifts notice */}
      {open_shifts > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 flex items-center gap-3">
          <Activity size={16} className="text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800">
            <strong>{open_shifts}</strong> shift
            {open_shifts !== 1 ? "s are" : " is"} currently open.{" "}
            <Link
              href="/store/pos"
              className="underline font-medium hover:text-amber-900"
            >
              Go to POS
            </Link>{" "}
            to manage shifts.
          </p>
        </div>
      )}

      {/* Low stock notice */}
      {low_stock_count > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 flex items-center gap-3">
          <AlertTriangle size={16} className="text-red-500 shrink-0" />
          <p className="text-sm text-red-800">
            <strong>{low_stock_count}</strong> product variant
            {low_stock_count !== 1 ? "s are" : " is"} at or below their
            low-stock threshold.{" "}
            <Link
              href="/store/inventory"
              className="underline font-medium hover:text-red-900"
            >
              Review inventory
            </Link>
          </p>
        </div>
      )}
    </main>
  );
}
