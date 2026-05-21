"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AuditLog, AUDIT_ACTION_LABELS } from "@/types/audit";

// ── Badge colour config ──────────────────────────────────────────────────────

const ACTION_BADGE_CONFIG: Record<
  string,
  { bg: string; text: string }
> = {
  "sale.completed": { bg: "#DCFCE7", text: "#15803D" },
  "sale.voided": { bg: "#FEE2E2", text: "#DC2626" },
  "return.completed": { bg: "#FEF9C3", text: "#854D0E" },
  "customer.credit_adjusted": { bg: "#DBEAFE", text: "#1D4ED8" },
  "staff.role_changed": { bg: "#F3E8FF", text: "#7E22CE" },
  "staff.pin_changed": { bg: "#F3E8FF", text: "#7E22CE" },
  "staff.permission_changed": { bg: "#F3E8FF", text: "#7E22CE" },
  "promotion.created": { bg: "#FFEDD5", text: "#C2410C" },
  "promotion.updated": { bg: "#FFEDD5", text: "#C2410C" },
  "promotion.archived": { bg: "#F1F5F9", text: "#475569" },
  "stock.adjusted": { bg: "#ECFDF5", text: "#065F46" },
  "expense.created": { bg: "#FEF3C7", text: "#92400E" },
  "expense.deleted": { bg: "#FEE2E2", text: "#DC2626" },
  "shift.closed": { bg: "#EFF6FF", text: "#1D4ED8" },
  "settings.changed": { bg: "#F1F5F9", text: "#334155" },
};

function getActionBadge(action: string) {
  const cfg = ACTION_BADGE_CONFIG[action];
  if (!cfg) return { bg: "#F1F5F9", text: "#334155" };
  return cfg;
}

// ── Component ────────────────────────────────────────────────────────────────

interface AuditLogTableProps {
  logs: AuditLog[];
  onViewDetail: (log: AuditLog) => void;
}

export function AuditLogTable({ logs, onViewDetail }: AuditLogTableProps) {
  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-text-muted">
        <p className="text-sm">No audit log entries found for the selected filters.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-44">Timestamp</TableHead>
            <TableHead className="w-48">Action</TableHead>
            <TableHead>Entity</TableHead>
            <TableHead>Actor</TableHead>
            <TableHead className="w-20 text-right">Detail</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => {
            const badge = getActionBadge(log.action);
            const label = AUDIT_ACTION_LABELS[log.action] ?? log.action;
            const ts = new Date(log.created_at).toLocaleString("en-LK", {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });
            return (
              <TableRow key={log.id} className="hover:bg-background">
                <TableCell className="whitespace-nowrap font-mono text-xs text-text-muted">
                  {ts}
                </TableCell>
                <TableCell>
                  <Badge
                    style={{ backgroundColor: badge.bg, color: badge.text }}
                    className="border-0 text-xs font-medium"
                  >
                    {label}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">
                  <span className="font-medium capitalize">{log.entity_type}</span>
                  {log.entity_id && (
                    <span className="ml-1 font-mono text-xs text-text-muted">
                      #{log.entity_id.slice(0, 8)}
                    </span>
                  )}
                </TableCell>
                <TableCell className="font-mono text-xs text-text-muted">
                  <span title={log.actor_id}>
                    {log.actor_id !== "SYSTEM"
                      ? log.actor_id.slice(0, 8) + "…"
                      : "SYSTEM"}
                  </span>
                  {log.actor_role && (
                    <span className="ml-1 text-xs text-text-muted">
                      ({log.actor_role})
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewDetail(log)}
                    className="text-xs"
                  >
                    View
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
