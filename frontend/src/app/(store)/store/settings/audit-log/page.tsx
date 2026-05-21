"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuthStore } from "@/stores/authStore";
import { AuditLogFilters } from "@/components/audit/AuditLogFilters";
import { AuditLogTable } from "@/components/audit/AuditLogTable";
import { AuditLogDetailModal } from "@/components/audit/AuditLogDetailModal";
import { Button } from "@/components/ui/button";
import { AuditLog, AuditLogListResponse } from "@/types/audit";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
const PAGE_SIZE = 50;

// ── API call ─────────────────────────────────────────────────────────────────

async function fetchAuditLogs(
  token: string,
  entityType: string,
  startDate: string,
  endDate: string,
  page: number,
): Promise<AuditLogListResponse> {
  const params = new URLSearchParams();
  if (entityType && entityType !== "all") params.set("entity_type", entityType);
  if (startDate) params.set("start_date", startDate);
  if (endDate) params.set("end_date", endDate);
  params.set("page", String(page));
  params.set("page_size", String(PAGE_SIZE));

  const res = await fetch(`${API_BASE}/api/audit/logs/?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch audit logs");
  const json = await res.json();
  return json.data as AuditLogListResponse;
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AuditLogPage() {
  const router = useRouter();
  const { isManagerOrAbove } = usePermissions();
  const accessToken = useAuthStore((s) => s.accessToken);

  const [entityType, setEntityType] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  // Role guard
  if (isManagerOrAbove === false) {
    router.replace("/store/dashboard");
    return null;
  }

  const { data, isLoading, isError } = useQuery<AuditLogListResponse>({
    queryKey: ["auditLogs", entityType, startDate, endDate, page],
    queryFn: () =>
      fetchAuditLogs(accessToken ?? "", entityType, startDate, endDate, page),
    enabled: !!accessToken,
    placeholderData: (prev) => prev,
  });

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1;

  function handleClearFilters() {
    setEntityType("all");
    setStartDate("");
    setEndDate("");
    setPage(1);
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-navy">Audit Log</h1>
        <p className="mt-1 text-sm text-text-muted">
          Immutable record of all significant actions across your store.
        </p>
      </div>

      {/* Filters */}
      <AuditLogFilters
        entityType={entityType}
        startDate={startDate}
        endDate={endDate}
        onEntityTypeChange={(v) => { setEntityType(v); setPage(1); }}
        onStartDateChange={(v) => { setStartDate(v); setPage(1); }}
        onEndDateChange={(v) => { setEndDate(v); setPage(1); }}
        onClear={handleClearFilters}
      />

      {/* Content */}
      {isLoading && (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange border-t-transparent" />
        </div>
      )}

      {isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load audit logs. Please try again.
        </div>
      )}

      {!isLoading && !isError && (
        <>
          <AuditLogTable
            logs={data?.results ?? []}
            onViewDetail={setSelectedLog}
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-muted">
                Page {page} of {totalPages} &middot; {data?.total ?? 0} entries
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Detail modal */}
      <AuditLogDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />
    </div>
  );
}
