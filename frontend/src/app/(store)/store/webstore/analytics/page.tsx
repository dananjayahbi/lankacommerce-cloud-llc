"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import { BarChart2, Eye, Loader2, TrendingUp, Users } from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

type Days = 7 | 30 | 90;

interface DayCount {
  date: string;
  count: number;
}

interface TopProduct {
  handle: string;
  title: string;
  views: number;
}

interface PageTypeCount {
  page_type: string;
  count: number;
}

interface AnalyticsSummary {
  total_views: number;
  unique_visitors: number;
  views_by_day: DayCount[];
  top_products: TopProduct[];
  by_page_type: PageTypeCount[];
}

const PAGE_TYPE_COLORS: Record<string, string> = {
  home: "#F97316",
  product: "#3B82F6",
  collection: "#10B981",
  blog: "#8B5CF6",
  page: "#F59E0B",
  search: "#6B7280",
};

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
}) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-5 flex items-center gap-4">
      <div className="p-2.5 rounded-full bg-orange-50">
        <Icon className="w-5 h-5 text-[#F97316]" />
      </div>
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="text-2xl font-bold text-slate-900">{value.toLocaleString()}</p>
      </div>
    </div>
  );
}

function formatDate(dateStr: string) {
  try {
    return format(parseISO(dateStr), "MMM d");
  } catch {
    return dateStr;
  }
}

export default function AnalyticsDashboardPage() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [days, setDays] = useState<Days>(30);

  const { data, isLoading, isError } = useQuery<AnalyticsSummary>({
    queryKey: ["admin-analytics-summary", days],
    queryFn: async () => {
      const res = await fetch(
        `${API_BASE}/api/webstore/tenants/analytics/summary/?days=${days}`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (!res.ok) throw new Error("Failed to load analytics");
      return res.json();
    },
    enabled: !!accessToken,
  });

  const viewsByDay = (data?.views_by_day ?? []).map((d) => ({
    ...d,
    label: formatDate(d.date),
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-[#F97316]" />
            Webstore Analytics
          </h1>
          <p className="text-sm text-slate-500">
            Traffic and engagement overview for your store
          </p>
        </div>
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
          {([7, 30, 90] as Days[]).map((d) => (
            <Button
              key={d}
              variant={days === d ? "default" : "ghost"}
              size="sm"
              onClick={() => setDays(d)}
              className={
                days === d
                  ? "bg-[#F97316] hover:bg-[#ea6c0a] text-white"
                  : "text-slate-600"
              }
            >
              {d}d
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-[#F97316]" />
        </div>
      ) : isError ? (
        <div className="h-32 flex items-center justify-center text-slate-500">
          Failed to load analytics. Please try again.
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={Eye}
              label="Total Page Views"
              value={data?.total_views ?? 0}
            />
            <StatCard
              icon={Users}
              label="Unique Visitors"
              value={data?.unique_visitors ?? 0}
            />
            <StatCard
              icon={TrendingUp}
              label="Avg. Views / Day"
              value={
                viewsByDay.length
                  ? Math.round((data?.total_views ?? 0) / days)
                  : 0
              }
            />
            <StatCard
              icon={BarChart2}
              label="Product Views"
              value={
                (data?.by_page_type ?? []).find(
                  (p) => p.page_type === "product",
                )?.count ?? 0
              }
            />
          </div>

          {/* Views by day line chart */}
          <div className="bg-white rounded-lg border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-700 mb-4">
              Page Views — Last {days} Days
            </h2>
            {viewsByDay.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-slate-400">
                No view data for this period.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart
                  data={viewsByDay}
                  margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    tickLine={false}
                    axisLine={false}
                    interval={Math.floor(viewsByDay.length / 6)}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                      fontSize: "13px",
                    }}
                    labelStyle={{ fontWeight: 600 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#F97316"
                    strokeWidth={2}
                    dot={false}
                    name="Views"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Page type breakdown */}
            <div className="bg-white rounded-lg border border-slate-200 p-5">
              <h2 className="font-semibold text-slate-700 mb-4">
                Views by Page Type
              </h2>
              {(data?.by_page_type ?? []).length === 0 ? (
                <div className="h-48 flex items-center justify-center text-slate-400">
                  No data available.
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart
                      data={data?.by_page_type ?? []}
                      margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
                      layout="vertical"
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        horizontal={false}
                        stroke="#f1f5f9"
                      />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 11, fill: "#94a3b8" }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="page_type"
                        tick={{ fontSize: 11, fill: "#94a3b8" }}
                        tickLine={false}
                        axisLine={false}
                        width={70}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "8px",
                          border: "1px solid #e2e8f0",
                          fontSize: "13px",
                        }}
                      />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]} name="Views">
                        {(data?.by_page_type ?? []).map((entry) => (
                          <Cell
                            key={entry.page_type}
                            fill={
                              PAGE_TYPE_COLORS[entry.page_type] ?? "#94a3b8"
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(data?.by_page_type ?? []).map((entry) => (
                      <div
                        key={entry.page_type}
                        className="flex items-center gap-1.5 text-xs text-slate-500"
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full inline-block"
                          style={{
                            backgroundColor:
                              PAGE_TYPE_COLORS[entry.page_type] ?? "#94a3b8",
                          }}
                        />
                        {entry.page_type}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Top products */}
            <div className="bg-white rounded-lg border border-slate-200 p-5">
              <h2 className="font-semibold text-slate-700 mb-4">
                Top Viewed Products
              </h2>
              {(data?.top_products ?? []).length === 0 ? (
                <div className="h-48 flex items-center justify-center text-slate-400">
                  No product view data.
                </div>
              ) : (
                <div className="space-y-3">
                  {(data?.top_products ?? []).slice(0, 10).map((p, i) => {
                    const max =
                      Math.max(...(data?.top_products ?? []).map((x) => x.views)) || 1;
                    const pct = Math.round((p.views / max) * 100);
                    return (
                      <div key={p.handle}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className="text-xs w-6 h-6 flex items-center justify-center p-0 text-slate-400"
                            >
                              {i + 1}
                            </Badge>
                            <span className="text-sm text-slate-700 font-medium truncate max-w-[200px]">
                              {p.title}
                            </span>
                          </div>
                          <span className="text-sm font-semibold text-slate-900">
                            {p.views.toLocaleString()}
                          </span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#F97316] rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
