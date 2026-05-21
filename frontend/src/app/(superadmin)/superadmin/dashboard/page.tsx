import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  TrendingUp,
  Clock,
  Calendar,
  Plus,
  Activity,
} from "lucide-react";
import MetricCard from "@/components/MetricCard";
import { TenantStatusBadge } from "@/components/TenantStatusBadge";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

interface RecentTenant {
  id: string;
  name: string;
  slug: string;
  status: string;
  created_at: string;
}

interface UpcomingRenewal {
  id: string;
  tenant__name: string;
  plan__name: string;
  next_billing_date: string;
  status: string;
}

interface DashboardData {
  active_tenant_count: number;
  grace_period_count: number;
  mrr_lkr: string;
  upcoming_renewals_count: number;
  recent_tenants: RecentTenant[];
  upcoming_renewals: UpcomingRenewal[];
}

function formatLKR(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num || 0);
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months > 1 ? "s" : ""} ago`;
}

export default async function SuperAdminDashboardPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;

  if (!accessToken) {
    redirect("/login");
  }

  let data: DashboardData | null = null;
  let fetchError = false;

  try {
    const res = await fetch(`${API_BASE}/api/superadmin/dashboard/`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });

    if (res.status === 401) redirect("/login");

    if (!res.ok) {
      fetchError = true;
    } else {
      data = await res.json();
    }
  } catch {
    fetchError = true;
  }

  if (fetchError || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-slate-500">Failed to load dashboard data. Please refresh.</p>
        <Link
          href="/superadmin/dashboard"
          className="rounded-md bg-[#F97316] px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
        >
          Retry
        </Link>
      </div>
    );
  }

  const now = new Date();
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          label="Active Tenants"
          value={data.active_tenant_count}
          icon={Building2}
        />
        <MetricCard
          label="Monthly Revenue"
          value={formatLKR(data.mrr_lkr)}
          icon={TrendingUp}
        />
        <MetricCard
          label="In Grace Period"
          value={data.grace_period_count}
          icon={Clock}
          accentColour={data.grace_period_count > 0 ? "amber" : "orange"}
        />
        <MetricCard
          label="Renewals (7 days)"
          value={data.upcoming_renewals_count}
          icon={Calendar}
        />
      </div>

      {/* Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Tenants */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-base font-bold text-slate-900 mb-4">
            Recent Tenants
          </h2>
          {data.recent_tenants.length === 0 ? (
            <p className="text-center text-sm text-slate-400 py-6">
              No tenants yet
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.recent_tenants.map((t) => (
                <li key={t.id} className="py-3 flex items-center justify-between gap-3">
                  <div>
                    <Link
                      href={`/superadmin/tenants/${t.id}`}
                      className="text-sm font-medium text-slate-900 hover:text-[#F97316] transition-colors"
                    >
                      {t.name}
                    </Link>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">
                      {t.slug} · {relativeTime(t.created_at)}
                    </p>
                  </div>
                  <TenantStatusBadge status={t.status} />
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Upcoming Renewals */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-base font-bold text-slate-900 mb-4">
            Renewals (Next 30 Days)
          </h2>
          {data.upcoming_renewals.length === 0 ? (
            <p className="text-center text-sm text-slate-400 py-6">
              No renewals due soon
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                  <th className="pb-2 font-medium">Tenant</th>
                  <th className="pb-2 font-medium">Plan</th>
                  <th className="pb-2 font-medium text-right">Due Date</th>
                </tr>
              </thead>
              <tbody>
                {data.upcoming_renewals.map((r) => {
                  const dueDate = new Date(r.next_billing_date);
                  const isUrgent = dueDate <= threeDaysFromNow;
                  return (
                    <tr key={r.id} className="border-b border-slate-50 last:border-0">
                      <td className="py-2 font-medium text-slate-800">
                        {r.tenant__name}
                      </td>
                      <td className="py-2 text-slate-500">{r.plan__name}</td>
                      <td
                        className={`py-2 text-right font-mono text-xs ${
                          isUrgent ? "text-red-500 font-semibold" : "text-slate-600"
                        }`}
                      >
                        {dueDate.toLocaleDateString("en-LK")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/superadmin/tenants/new"
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-4 hover:border-[#F97316]/40 hover:bg-orange-50 transition-colors"
        >
          <div className="rounded-lg bg-orange-50 p-2">
            <Plus size={16} className="text-[#F97316]" />
          </div>
          <span className="text-sm font-medium text-slate-800">
            Provision New Tenant
          </span>
        </Link>
        <Link
          href="/superadmin/tenants"
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-4 hover:border-[#1B2B3A]/40 hover:bg-slate-50 transition-colors"
        >
          <div className="rounded-lg bg-slate-100 p-2">
            <Building2 size={16} className="text-[#1B2B3A]" />
          </div>
          <span className="text-sm font-medium text-slate-800">
            View All Tenants
          </span>
        </Link>
        <Link
          href="/superadmin/health"
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-4 hover:border-[#1B2B3A]/40 hover:bg-slate-50 transition-colors"
        >
          <div className="rounded-lg bg-slate-100 p-2">
            <Activity size={16} className="text-[#1B2B3A]" />
          </div>
          <span className="text-sm font-medium text-slate-800">
            System Health
          </span>
        </Link>
      </div>
    </div>
  );
}
