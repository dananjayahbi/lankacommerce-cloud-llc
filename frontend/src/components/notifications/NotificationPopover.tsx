"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BellIcon } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

interface Notification {
  id: string;
  notification_type: string;
  title: string;
  body: string;
  related_entity_type: string | null;
  related_entity_id: string | null;
  is_read: boolean;
  created_at: string;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins !== 1 ? "s" : ""} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs !== 1 ? "s" : ""} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days !== 1 ? "s" : ""} ago`;
}

export function NotificationPopover() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const router = useRouter();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["notifications-popover"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/notifications/`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error("Failed to fetch notifications");
      const json = await res.json();
      return json.data as { notifications: Notification[]; total_unread: number };
    },
    enabled: !!accessToken && open,
    staleTime: 30_000,
    refetchInterval: open ? false : 60_000,
  });

  const { data: unreadData } = useQuery({
    queryKey: ["notifications-unread-count"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/notifications/`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await res.json();
      return json.data?.total_unread as number ?? 0;
    },
    enabled: !!accessToken,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const { mutate: markAllRead } = useMutation({
    mutationFn: async () => {
      await fetch(`${API_BASE}/api/notifications/read-all/`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications-popover"] });
      qc.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    },
  });

  const { mutate: markRead } = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`${API_BASE}/api/notifications/${id}/read/`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications-popover"] });
      qc.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    },
  });

  function handleNotificationClick(n: Notification) {
    if (!n.is_read) markRead(n.id);
    setOpen(false);
    if (n.related_entity_type === "ProductVariant") {
      router.push("/store/stock-control/low-stock");
    } else if (n.related_entity_type === "StockTakeSession") {
      router.push(`/store/stock-control/stock-takes/${n.related_entity_id}/review`);
    }
  }

  const unreadCount = unreadData ?? 0;
  const displayCount = unreadCount > 99 ? "99+" : unreadCount;
  const notifications = data?.notifications ?? [];

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-full p-1.5 text-[#64748B] hover:bg-slate-100 focus:outline-none"
        aria-label="Notifications"
      >
        <BellIcon className="size-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#F97316] px-0.5 text-[10px] font-bold text-white">
            {displayCount}
          </span>
        )}
      </button>

      {/* Popover */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-[#E2E8F0] bg-white shadow-lg">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#E2E8F0] px-4 py-3">
              <h3 className="text-sm font-semibold text-[#1B2B3A]">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => markAllRead()}
                  className="text-xs text-[#F97316] hover:underline"
                >
                  Mark all as read
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-[380px] overflow-y-auto">
              {isLoading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex gap-3 border-b border-[#E2E8F0] px-4 py-3 last:border-0">
                      <Skeleton className="mt-0.5 size-2 shrink-0 rounded-full" />
                      <div className="flex-1 space-y-1">
                        <Skeleton className="h-3 w-3/4" />
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-1/3" />
                      </div>
                    </div>
                  ))
                : notifications.length === 0
                  ? (
                    <div className="px-4 py-8 text-center text-sm text-[#64748B]">
                      No notifications
                    </div>
                  )
                  : notifications.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => handleNotificationClick(n)}
                      className={cn(
                        "flex w-full gap-3 px-4 py-3 text-left hover:bg-slate-50 border-b border-[#E2E8F0] last:border-0 transition-colors",
                        !n.is_read && "bg-blue-50/40",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-1.5 size-2 shrink-0 rounded-full",
                          !n.is_read ? "bg-blue-500" : "bg-transparent",
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#1B2B3A] truncate">{n.title}</p>
                        <p className="mt-0.5 text-xs text-[#64748B] leading-snug line-clamp-2">{n.body}</p>
                        <p className="mt-1 text-xs text-[#94A3B8]">{relativeTime(n.created_at)}</p>
                      </div>
                    </button>
                  ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
