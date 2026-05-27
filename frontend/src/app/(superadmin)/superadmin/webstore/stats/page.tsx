"use client";

import { useQuery } from "@tanstack/react-query";
import { BarChart3, RefreshCw, Loader2, Store, ShoppingCart, TrendingUp, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/authStore";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

interface TopTheme {
  theme_id: string;
  theme_name: string;
  theme_slug: string;
  install_count: number;
}

interface WebstoreStats {
  total_enabled_webstores: number;
  total_tenants: number;
  total_orders_today: number;
  total_revenue_today: string | number;
  top_themes: TopTheme[];
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

export default function WebstoreStatsPage() {
  const accessToken = useAuthStore((s) => s.accessToken);

  const { data, isLoading, isFetching, refetch } = useQuery<WebstoreStats>({
    queryKey: ["admin-webstore-stats"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/webstore/admin/stats/`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to load stats");
      return res.json();
    },
    enabled: !!accessToken,
    refetchOnWindowFocus: false,
  });

  const enabledPct =
    data && data.total_tenants > 0
      ? Math.round((data.total_enabled_webstores / data.total_tenants) * 100)
      : 0;

  const maxInstalls = data?.top_themes?.[0]?.install_count ?? 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-[#F97316]" />
            Webstore Stats
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Platform-wide webstore metrics</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : !data ? (
        <div className="text-center py-24 text-slate-400">Failed to load statistics.</div>
      ) : (
        <>
          {/* Metric cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              icon={<Store className="w-5 h-5 text-[#F97316]" />}
              label="Webstores Enabled"
              value={String(data.total_enabled_webstores)}
              sub={`${enabledPct}% of ${data.total_tenants} tenants`}
              color="bg-orange-50 border-orange-100"
            />
            <MetricCard
              icon={<ShoppingCart className="w-5 h-5 text-blue-500" />}
              label="Orders Today"
              value={String(data.total_orders_today)}
              sub="Across all webstores"
              color="bg-blue-50 border-blue-100"
            />
            <MetricCard
              icon={<TrendingUp className="w-5 h-5 text-emerald-500" />}
              label="Revenue Today"
              value={formatLKR(data.total_revenue_today)}
              sub="Paid orders only"
              color="bg-emerald-50 border-emerald-100"
            />
            <MetricCard
              icon={<Palette className="w-5 h-5 text-purple-500" />}
              label="Top Theme Installs"
              value={
                data.top_themes[0]
                  ? String(data.top_themes[0].install_count)
                  : "0"
              }
              sub={data.top_themes[0]?.theme_name ?? "No themes installed"}
              color="bg-purple-50 border-purple-100"
            />
          </div>

          {/* Top themes */}
          <div className="rounded-xl border bg-white p-6 space-y-4">
            <h2 className="text-base font-semibold text-slate-800">Top 5 Themes by Installs</h2>
            {data.top_themes.length === 0 ? (
              <p className="text-sm text-slate-400">No theme installs recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {data.top_themes.map((theme, idx) => (
                  <div key={theme.theme_id} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 w-4">{idx + 1}.</span>
                        <span className="font-medium text-slate-800">{theme.theme_name}</span>
                        <span className="text-xs text-slate-400 font-mono">{theme.theme_slug}</span>
                      </span>
                      <span className="font-medium text-slate-600">
                        {theme.install_count} install{theme.install_count !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#F97316] transition-all"
                        style={{
                          width: `${Math.round((theme.install_count / maxInstalls) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <div className={`rounded-xl border p-5 ${color}`}>
      <div className="flex items-center gap-3 mb-3">{icon}<span className="text-sm font-medium text-slate-600">{label}</span></div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{sub}</p>
    </div>
  );
}
