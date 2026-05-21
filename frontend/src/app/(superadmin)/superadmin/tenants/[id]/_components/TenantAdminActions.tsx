"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface TenantAdminActionsProps {
  tenantId: string;
  currentStatus: string;
  accessToken: string;
}

export default function TenantAdminActions({
  tenantId,
  currentStatus,
  accessToken,
}: TenantAdminActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [graceDays, setGraceDays] = useState(7);
  const [confirmAction, setConfirmAction] = useState<string | null>(null);

  const API_BASE =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

  async function callAction(endpoint: string, body?: Record<string, unknown>) {
    setLoading(endpoint);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`${API_BASE}/api/tenants/${tenantId}/${endpoint}/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken ?? ''}`,
        },
        body: body ? JSON.stringify(body) : null,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail ?? `Request failed (HTTP ${res.status}).`);
      }
      setSuccess("Action completed successfully.");
      setConfirmAction(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoading(null);
    }
  }

  const canSuspend = currentStatus === "ACTIVE" || currentStatus === "GRACE_PERIOD";
  const canReactivate = currentStatus === "SUSPENDED" || currentStatus === "GRACE_PERIOD";
  const canGracePeriod = currentStatus === "ACTIVE";

  return (
    <div className="rounded-lg border-l-4 border-red-400 border border-slate-200 bg-white p-6">
      <h2 className="mb-1 text-base font-semibold text-red-600">
        Administrative Actions
      </h2>
      <p className="mb-4 text-xs text-slate-500">
        These actions immediately affect the tenant&apos;s access to LankaCommerce.
      </p>

      {/* Success / Error messages */}
      {success && (
        <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          {success}
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Confirmation overlay */}
      {confirmAction && (
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-medium text-amber-800 mb-3">
            {confirmAction === "suspend"
              ? "Are you sure you want to suspend this tenant? They will lose access immediately."
              : `Set a grace period of ${graceDays} days. The tenant will be notified.`}
          </p>
          {confirmAction === "grace-period" && (
            <div className="flex items-center gap-2 mb-3">
              <label className="text-sm text-amber-800">Grace days:</label>
              <input
                type="number"
                min={1}
                max={90}
                value={graceDays}
                onChange={(e) => setGraceDays(parseInt(e.target.value, 10))}
                className="w-20 rounded border border-amber-300 px-2 py-1 text-sm"
              />
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (confirmAction === "suspend") callAction("suspend");
                else callAction("grace-period", { grace_days: graceDays });
              }}
              disabled={loading !== null}
              className="rounded-md bg-amber-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
            >
              {loading ? "Processing…" : "Confirm"}
            </button>
            <button
              onClick={() => setConfirmAction(null)}
              className="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        {canSuspend && (
          <button
            onClick={() => setConfirmAction("suspend")}
            disabled={loading !== null}
            className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
          >
            {loading === "suspend" ? "Suspending…" : "Suspend Tenant"}
          </button>
        )}
        {canReactivate && (
          <button
            onClick={() => callAction("reactivate")}
            disabled={loading !== null}
            className="rounded-md border border-green-300 px-4 py-2 text-sm font-medium text-green-600 hover:bg-green-50 disabled:opacity-50 transition-colors"
          >
            {loading === "reactivate" ? "Reactivating…" : "Reactivate Tenant"}
          </button>
        )}
        {canGracePeriod && (
          <button
            onClick={() => setConfirmAction("grace-period")}
            disabled={loading !== null}
            className="rounded-md border border-amber-300 px-4 py-2 text-sm font-medium text-amber-600 hover:bg-amber-50 disabled:opacity-50 transition-colors"
          >
            Trigger Grace Period
          </button>
        )}
      </div>
    </div>
  );
}
