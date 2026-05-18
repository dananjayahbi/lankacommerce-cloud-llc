import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Database, Server, Monitor, HardDrive } from "lucide-react";

const DJANGO_API_BASE =
  process.env.DJANGO_API_BASE_URL ?? "http://localhost:8000";

interface HealthData {
  status: string;
  database: {
    status: string;
    latency_ms: number | null;
  };
  django_version: string;
  python_version: string;
  timestamp: string;
}

interface AuditEntry {
  id: string | null;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  created_at: string;
}

function toTitleCase(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function relativeOrDate(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(dateStr).toLocaleDateString("en-LK");
}

function LatencyBadge({ ms }: { ms: number | null }) {
  if (ms === null) return <span className="text-slate-400">N/A</span>;
  const colour = ms < 10 ? "text-green-600" : ms < 50 ? "text-amber-500" : "text-red-500";
  return <span className={colour}>{ms}ms</span>;
}

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full mr-2 ${ok ? "bg-green-500" : "bg-red-500"}`}
    />
  );
}

export default async function SystemHealthPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;

  if (!accessToken) redirect("/login");

  let health: HealthData | null = null;
  let apiUnreachable = false;

  let auditLogs: AuditEntry[] = [];

  const [healthResult, auditResult] = await Promise.allSettled([
    fetch(`${DJANGO_API_BASE}/api/health/`, { cache: "no-store" }),
    fetch(`${DJANGO_API_BASE}/api/audit-logs/?limit=20`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    }),
  ]);

  if (healthResult.status === "fulfilled") {
    const res = healthResult.value;
    if (res.ok || res.status === 503) {
      health = await res.json();
    }
  } else {
    apiUnreachable = true;
  }

  if (auditResult.status === "fulfilled" && auditResult.value.ok) {
    const data = await auditResult.value.json();
    auditLogs = Array.isArray(data) ? data : data.results ?? [];
  }

  const dbConnected = health?.database.status === "connected";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">System Health</h1>
        <p className="text-sm text-slate-500 mt-1">
          Monitor the operational status of the LankaCommerce platform.
        </p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Database Card */}
        <div
          className={`rounded-xl border p-6 bg-white ${
            apiUnreachable || !dbConnected
              ? "border-red-300"
              : "border-slate-200"
          }`}
        >
          <div className="flex items-center gap-2 mb-4">
            <Database size={18} className="text-slate-600" />
            <h2 className="font-bold text-slate-900">Database</h2>
          </div>
          {apiUnreachable ? (
            <p className="text-sm text-red-600">
              Django API is unreachable. Check that the backend server is
              running on port 8000.
            </p>
          ) : health ? (
            <div className="space-y-2 text-sm">
              <div className="flex items-center">
                <StatusDot ok={dbConnected} />
                <span className={dbConnected ? "text-green-700 font-medium" : "text-red-600 font-medium"}>
                  {dbConnected ? "Connected" : "Unreachable"}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Latency</span>
                <LatencyBadge ms={health.database.latency_ms} />
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400">Unable to fetch status.</p>
          )}
        </div>

        {/* Backend Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-2 mb-4">
            <Server size={18} className="text-slate-600" />
            <h2 className="font-bold text-slate-900">Backend</h2>
          </div>
          {apiUnreachable ? (
            <p className="text-sm text-red-600">API unreachable.</p>
          ) : health ? (
            <dl className="space-y-2 text-sm">
              {[
                ["Framework", "Django REST Framework"],
                ["Django Version", health.django_version],
                ["Python Version", health.python_version],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between">
                  <dt className="text-slate-500">{label}</dt>
                  <dd className="font-medium text-slate-800">{value}</dd>
                </div>
              ))}
              <div className="flex justify-between items-center">
                <dt className="text-slate-500">API Status</dt>
                <dd>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      health.status === "healthy"
                        ? "bg-green-100 text-green-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {toTitleCase(health.status)}
                  </span>
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-slate-400">Unable to fetch status.</p>
          )}
        </div>

        {/* Frontend Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-2 mb-4">
            <Monitor size={18} className="text-slate-600" />
            <h2 className="font-bold text-slate-900">Frontend</h2>
          </div>
          <dl className="space-y-2 text-sm">
            {[
              ["Framework", "Next.js App Router"],
              ["Next.js Version", "16.2.6"],
              ["Runtime", process.env.NODE_ENV ?? "development"],
              ["Deployment", process.env.DEPLOYMENT_ENVIRONMENT ?? "local"],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between">
                <dt className="text-slate-500">{label}</dt>
                <dd className="font-medium text-slate-800">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {/* Storage Placeholder */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-2 mb-4">
          <HardDrive size={18} className="text-slate-600" />
          <h2 className="font-bold text-slate-900">Storage</h2>
        </div>
        <p className="text-sm text-slate-400 italic text-center py-4">
          Storage monitoring is not yet available. This panel will show database
          size, file storage usage, and Redis cache metrics in Phase 5.
        </p>
      </div>

      {/* Recent Activity */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="font-bold text-slate-900 mb-4">
          Recent Platform Activity
        </h2>
        {auditLogs.length === 0 ? (
          <p className="text-center text-sm text-slate-400 py-6">
            No recent activity
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                  {["Time", "Actor", "Action", "Entity Type", "Entity ID"].map(
                    (h) => (
                      <th key={h} className="pb-2 font-medium pr-4">
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((entry, i) => (
                  <tr
                    key={entry.id ?? i}
                    className="border-b border-slate-50 last:border-0"
                  >
                    <td className="py-2 pr-4 text-slate-500 whitespace-nowrap">
                      {relativeOrDate(entry.created_at)}
                    </td>
                    <td className="py-2 pr-4 font-mono text-xs text-slate-600">
                      {entry.actor_id
                        ? entry.actor_id.slice(0, 8) + "…"
                        : "—"}
                    </td>
                    <td className="py-2 pr-4 text-slate-700">
                      {toTitleCase(entry.action)}
                    </td>
                    <td className="py-2 pr-4 text-slate-500">
                      {entry.entity_type}
                    </td>
                    <td className="py-2 font-mono text-xs text-slate-400">
                      {entry.entity_id
                        ? entry.entity_id.slice(0, 8) + "…"
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
