"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AuditLog, AUDIT_ACTION_LABELS } from "@/types/audit";

interface AuditLogDetailModalProps {
  log: AuditLog | null;
  onClose: () => void;
}

function JsonBlock({ value }: { value: Record<string, unknown> | null }) {
  if (!value || Object.keys(value).length === 0) {
    return <span className="text-text-muted text-xs">—</span>;
  }
  return (
    <pre className="rounded bg-background p-3 text-xs overflow-x-auto">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

export function AuditLogDetailModal({ log, onClose }: AuditLogDetailModalProps) {
  if (!log) return null;

  const label = AUDIT_ACTION_LABELS[log.action] ?? log.action;
  const ts = new Date(log.created_at).toLocaleString("en-LK", {
    dateStyle: "long",
    timeStyle: "medium",
  });

  return (
    <Dialog open={!!log} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-navy">Audit Log Detail</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 text-sm">
          {/* Meta row */}
          <div className="grid grid-cols-2 gap-3 rounded-lg bg-background p-4">
            <div>
              <p className="text-xs text-text-muted">Action</p>
              <p className="font-semibold text-navy">{label}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Timestamp</p>
              <p className="font-medium">{ts}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Entity Type</p>
              <p className="font-medium capitalize">{log.entity_type}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Entity ID</p>
              <p className="font-mono text-xs">{log.entity_id ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Actor ID</p>
              <p className="font-mono text-xs">{log.actor_id}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Actor Role</p>
              <p className="font-medium capitalize">{log.actor_role || "—"}</p>
            </div>
            {log.ip_address && (
              <div>
                <p className="text-xs text-text-muted">IP Address</p>
                <p className="font-mono text-xs">{log.ip_address}</p>
              </div>
            )}
          </div>

          {/* Before / After */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="mb-1 text-xs font-semibold text-text-muted uppercase tracking-wide">Before</p>
              <JsonBlock value={log.before} />
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold text-text-muted uppercase tracking-wide">After</p>
              <JsonBlock value={log.after} />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
