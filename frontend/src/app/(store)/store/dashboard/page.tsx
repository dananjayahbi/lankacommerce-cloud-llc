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
  Calendar,
  ShoppingBag,
  Package,
  Users,
  UserCircle,
  BarChart2,
  Settings,
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
    CASH: "bg-green-50 text-green-700 border border-green-200/50",
    CARD: "bg-blue-50 text-blue-700 border border-blue-200/50",
    SPLIT: "bg-purple-50 text-purple-700 border border-purple-200/50",
  };
  const cls = map[method ?? ""] ?? "bg-slate-100 text-slate-655 border border-slate-200/50";
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold select-none shadow-sm shadow-slate-500/5 ${cls}`}>
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
      <main className="p-8 flex flex-col items-center justify-center h-80 gap-4">
        <p className="text-slate-500 font-medium">
          Could not load dashboard metrics. Please refresh the connection.
        </p>
        <Link
          href="/store/dashboard"
          className="rounded-xl bg-[#F97316] px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 shadow-md shadow-orange-500/10 transition-all duration-300"
        >
          Retry Connection
        </Link>
      </main>
    );
  }

  const { today, low_stock_count, open_shifts, recent_sales } = data;
  const deltaPositive =
    today.revenue_delta_pct !== null && today.revenue_delta_pct >= 0;

  return (
    <main className="p-6 md:p-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 select-none">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 font-sans">Dashboard</h1>
          <p className="text-xs text-slate-400 font-medium mt-1">Overview of your store&apos;s latest metrics and operations</p>
        </div>
        <div className="flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-xl border border-slate-200 shadow-sm text-xs font-semibold text-slate-500 self-start select-none">
          <Calendar size={14} className="text-[#F97316]" />
          <span>
            {new Date().toLocaleDateString("en-LK", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </span>
        </div>
      </div>

      {/* Metric Cards Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
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
          label="Avg. Basket Size"
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

      {/* delta positive yesterday ratio summary */}
      {today.revenue_delta_pct !== null && (
        <div className="flex items-center gap-2.5 bg-slate-200/30 self-start px-3 py-1.5 rounded-xl border border-slate-200/50 text-xs select-none">
          <span className="text-slate-500 font-semibold">vs yesterday:</span>
          <span
            className={`flex items-center gap-1 font-extrabold ${
              deltaPositive ? "text-green-600" : "text-red-500"
            }`}
          >
            {deltaPositive ? (
              <ArrowUpRight size={14} className="stroke-[3]" />
            ) : (
              <ArrowDownRight size={14} className="stroke-[3]" />
            )}
            {Math.abs(today.revenue_delta_pct)}%
          </span>
        </div>
      )}

      {/* Pinterest Layout Panels Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Recent Sales Datatable (occupies 2/3 on desktop) */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-100/50 flex flex-col">
          <div className="flex items-center justify-between mb-5 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 leading-tight">Recent Sales</h2>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">Overview of latest completed sales</p>
            </div>
            {/* Header controls bar */}
            <div className="flex items-center gap-3">
              <Link
                href="/store/reports/profit-loss"
                className="text-xs text-[#F97316] hover:text-orange-600 hover:underline font-bold transition-colors"
              >
                View reports →
              </Link>
            </div>
          </div>

          {recent_sales.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2.5 select-none">
              <ShoppingBag className="w-10 h-10 text-slate-300 mb-1" />
              <p className="text-sm font-semibold text-slate-400">No transactions recorded yet today</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-y border-slate-200/60 select-none">
                    <th className="py-3 px-6">Transaction ID</th>
                    <th className="py-3 px-6">Payment</th>
                    <th className="py-3 px-6">Time elapsed</th>
                    <th className="py-3 px-6 text-right">Amount</th>
                    <th className="py-3 px-6 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recent_sales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="py-3.5 px-6 font-mono text-xs text-slate-600 font-semibold select-all">
                        #{sale.id.substring(0, 8).toUpperCase()}
                      </td>
                      <td className="py-3.5 px-6">
                        {paymentBadge(sale.payment_method)}
                      </td>
                      <td className="py-3.5 px-6 text-xs text-slate-400 select-none">
                        {relativeTime(sale.completed_at)}
                      </td>
                      <td className="py-3.5 px-6 text-sm font-bold text-slate-800 text-right select-all">
                        {formatLKR(parseFloat(sale.total_amount))}
                      </td>
                      <td className="py-3.5 px-6 text-center select-none">
                        <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700 border border-green-200/50 shadow-sm shadow-green-500/5">
                          Success
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Side: Activity Timeline & Quick Actions (occupies 1/3 on desktop) */}
        <div className="space-y-6 flex flex-col">
          
          {/* Recent activities vertical system timeline */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-100/50 flex flex-col">
            <div className="mb-4">
              <h2 className="text-base font-extrabold text-slate-900 leading-tight">System Logs</h2>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">Real-time store activity nodes</p>
            </div>

            {/* Vertical timeline connects */}
            <div className="relative pl-6 border-l-2 border-slate-100 space-y-6 mt-3 ml-2.5 pb-2">
              
              {/* Node 1: Low Stock State */}
              <div className="relative">
                <span
                  className={`absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full border-2 border-white ring-4 ${
                    low_stock_count > 0 ? "bg-red-500 ring-red-500/20" : "bg-green-500 ring-green-500/20"
                  }`}
                />
                <div>
                  <p className="text-xs font-extrabold text-slate-800">
                    {low_stock_count > 0 ? "Low Stock Variant Alert" : "Inventory Status"}
                  </p>
                  <p className="text-xs text-slate-500 font-light mt-1">
                    {low_stock_count > 0 ? (
                      <>
                        <strong>{low_stock_count}</strong> variants are below threshold limits.{" "}
                        <Link href="/store/inventory" className="text-[#F97316] font-bold hover:underline">
                          Review stock
                        </Link>
                      </>
                    ) : (
                      "All stock levels are completely healthy and above threshold."
                    )}
                  </p>
                </div>
              </div>

              {/* Node 2: Open POS Shifts */}
              <div className="relative">
                <span
                  className={`absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full border-2 border-white ring-4 ${
                    open_shifts > 0 ? "bg-amber-500 ring-amber-500/20" : "bg-slate-400 ring-slate-400/20"
                  }`}
                />
                <div>
                  <p className="text-xs font-extrabold text-slate-800">POS Terminal Sessions</p>
                  <p className="text-xs text-slate-500 font-light mt-1">
                    {open_shifts > 0 ? (
                      <>
                        <strong>{open_shifts}</strong> cashier shift session active.{" "}
                        <Link href="/store/pos" className="text-[#F97316] font-bold hover:underline">
                          Manage shifts
                        </Link>
                      </>
                    ) : (
                      "No cashier sessions are currently active in POS."
                    )}
                  </p>
                </div>
              </div>

              {/* Node 3: Cloud Synchronization */}
              <div className="relative">
                <span className="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full border-2 border-white ring-4 bg-blue-500 ring-blue-500/20" />
                <div>
                  <p className="text-xs font-extrabold text-slate-800">Cloud Sync Database</p>
                  <p className="text-xs text-slate-500 font-light mt-1">
                    LankaCommerce retail engine is fully synchronized.
                  </p>
                </div>
              </div>

            </div>
          </div>

          {/* Quick Actions Action Grid */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-100/50">
            <h2 className="text-base font-extrabold text-slate-900 mb-4 select-none">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { href: "/store/pos", label: "Open POS", icon: ShoppingCart },
                { href: "/store/inventory", label: "Inventory", icon: Package },
                { href: "/store/customers", label: "Customers", icon: Users },
                { href: "/store/staff", label: "Staff", icon: UserCircle },
                {
                  href: "/store/reports/profit-loss",
                  label: "P&L Report",
                  icon: BarChart2,
                },
                { href: "/store/settings", label: "Settings", icon: Settings },
              ].map((item) => {
                const ActionIcon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex flex-col items-start gap-2.5 rounded-2xl border border-slate-150 p-4 hover:border-[#F97316]/50 hover:bg-orange-50/30 transition-all duration-300 group shadow-sm shadow-slate-100/10 hover:shadow-orange-500/5"
                  >
                    <ActionIcon className="w-6 h-6 text-slate-400 group-hover:text-[#F97316] group-hover:scale-105 transition-all duration-300" />
                    <span className="text-xs font-bold text-slate-700 group-hover:text-[#F97316] transition-colors leading-none">
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}
