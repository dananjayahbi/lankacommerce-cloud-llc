"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod/v4";
import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";

import { useAuthStore } from "@/stores/authStore";
import { usePermissions } from "@/hooks/usePermissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { formatDurationMinutes } from "@/utils/formatDurationMinutes";
import type { StaffMember } from "@/types/hr";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

interface TimeClockRecord {
  id: string;
  clocked_in_at: string;
  clocked_out_at: string | null;
  duration_minutes: number | null;
  shift_id: string | null;
  notes: string;
}

interface TimeClockHistoryResponse {
  success: boolean;
  data: {
    records: TimeClockRecord[];
    pagination: { page: number; page_size: number; total_count: number; total_pages: number };
    total_hours_this_week: number;
    total_hours_this_month: number;
  };
}

interface TimeClockHistoryProps {
  staffMember: StaffMember;
}

const closeSessionSchema = z.object({
  clocked_out_at: z.string().min(1, "Required"),
  notes: z.string().optional(),
});
type CloseSessionForm = z.infer<typeof closeSessionSchema>;

function formatTime(isoStr: string): string {
  return new Date(isoStr).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
}
function formatDate(isoStr: string): string {
  return new Date(isoStr).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function TimeClockHistory({ staffMember }: TimeClockHistoryProps) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const { isManagerOrAbove } = usePermissions();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [closingRecord, setClosingRecord] = useState<TimeClockRecord | null>(null);

  const { data, isLoading, isError } = useQuery<TimeClockHistoryResponse>({
    queryKey: ["staff-timeclock", staffMember.id, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        user_id: staffMember.id,
        page: String(page),
        page_size: "20",
      });
      const res = await fetch(`${API_BASE}/api/hr/timeclock/?${params.toString()}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error("Failed to fetch time clock history");
      return res.json() as Promise<TimeClockHistoryResponse>;
    },
  });

  const d = data?.data;
  const pagination = d?.pagination;
  const totalPages = pagination?.total_pages ?? 1;

  const { register, handleSubmit, formState: { errors }, reset } = useForm<CloseSessionForm>({
    resolver: standardSchemaResolver(closeSessionSchema),
  });

  const closeMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: CloseSessionForm }) => {
      const res = await fetch(`${API_BASE}/api/hr/timeclock/${id}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          clocked_out_at: new Date(values.clocked_out_at).toISOString(),
          notes: values.notes ?? "",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw json;
      return json;
    },
    onSuccess: () => {
      setClosingRecord(null);
      reset();
      void queryClient.invalidateQueries({ queryKey: ["staff-timeclock", staffMember.id] });
      toast.success("Session closed.");
    },
    onError: () => {
      toast.error("Failed to close session. Please try again.");
    },
  });

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Time Clock History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {d && (
            <div className="flex gap-3 flex-wrap">
              <Badge variant="secondary" className="font-inter text-[13px] font-normal" style={{ background: "#F1F5F9" }}>
                This Week: {formatDurationMinutes(Math.round(d.total_hours_this_week * 60))}
              </Badge>
              <Badge variant="secondary" className="font-inter text-[13px] font-normal" style={{ background: "#F1F5F9" }}>
                This Month: {formatDurationMinutes(Math.round(d.total_hours_this_month * 60))}
              </Badge>
            </div>
          )}

          {isLoading && <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>}
          {isError && <Alert variant="destructive"><AlertDescription>Failed to load time clock history.</AlertDescription></Alert>}

          {d && d.records.length === 0 && <p className="text-text-muted text-sm">No time clock records found.</p>}

          {d && d.records.length > 0 && (
            <>
              <div className="rounded-md border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-background">
                      <TableHead className="text-navy">Date</TableHead>
                      <TableHead className="text-navy">Clock In</TableHead>
                      <TableHead className="text-navy">Clock Out</TableHead>
                      <TableHead className="text-navy">Duration</TableHead>
                      <TableHead className="text-navy">Notes</TableHead>
                      <TableHead className="text-navy">Status</TableHead>
                      {isManagerOrAbove && <TableHead className="text-navy">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {d.records.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="text-sm text-navy">{formatDate(record.clocked_in_at)}</TableCell>
                        <TableCell className="text-sm text-navy">{formatTime(record.clocked_in_at)}</TableCell>
                        <TableCell className="text-sm text-text-muted">
                          {record.clocked_out_at ? formatTime(record.clocked_out_at) : "—"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {record.duration_minutes != null ? (
                            <span className="font-mono text-navy">{formatDurationMinutes(record.duration_minutes)}</span>
                          ) : (
                            <span style={{ color: "#F59E0B" }}>In progress</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-text-muted max-w-37.5">
                          {record.notes ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger className="truncate block max-w-30">
                                  {record.notes.length > 50 ? record.notes.slice(0, 50) + "…" : record.notes}
                                </TooltipTrigger>
                                <TooltipContent><p className="max-w-xs">{record.notes}</p></TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : "—"}
                        </TableCell>
                        <TableCell>
                          {!record.clocked_out_at ? (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium text-white" style={{ background: "#F59E0B" }}>Open</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium text-white" style={{ background: "#64748B" }}>Completed</span>
                          )}
                        </TableCell>
                        {isManagerOrAbove && (
                          <TableCell>
                            {!record.clocked_out_at && (
                              <Button size="sm" variant="outline" onClick={() => setClosingRecord(record)}>
                                Close Session
                              </Button>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-center gap-4">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                <span className="text-sm text-text-muted">Page {pagination?.page} of {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!closingRecord} onOpenChange={(open) => { if (!open) { setClosingRecord(null); reset(); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close Time Clock Session for {staffMember.name}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleSubmit((values) => {
              if (closingRecord) closeMutation.mutate({ id: closingRecord.id, values });
            })}
            className="space-y-4"
          >
            <div className="space-y-1">
              <Label htmlFor="clocked_out_at">Clock Out Time</Label>
              <Input
                id="clocked_out_at"
                type="datetime-local"
                {...register("clocked_out_at")}
              />
              {errors.clocked_out_at && (
                <p className="text-xs text-red-500">{errors.clocked_out_at.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea id="notes" {...register("notes")} rows={3} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => { setClosingRecord(null); reset(); }}>Cancel</Button>
              <Button type="submit" disabled={closeMutation.isPending}>
                {closeMutation.isPending ? "Closing…" : "Close Session"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
