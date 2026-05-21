"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { formatDurationMinutes } from "@/utils/formatDurationMinutes";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

interface UserProfileResponse {
  success: boolean;
  data: {
    clocked_in_at: string | null;
    [key: string]: unknown;
  };
}

export function TimeClockWidget() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [elapsedMinutes, setElapsedMinutes] = useState(0);

  const userId = user?.user_id;

  // Fetch user profile for authoritative clocked_in_at
  const { data: profileData } = useQuery<UserProfileResponse>({
    queryKey: ["user-profile", userId],
    enabled: !!userId && !!accessToken,
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/hr/staff/${userId}/`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error("Failed to fetch profile");
      return res.json() as Promise<UserProfileResponse>;
    },
    refetchInterval: 60_000,
  });

  const clockedInAt = profileData?.data?.clocked_in_at ?? null;

  // Live session timer (60s interval)
  useEffect(() => {
    if (!clockedInAt) {
      setElapsedMinutes(0);
      return;
    }

    const compute = () => {
      setElapsedMinutes(
        Math.floor((Date.now() - new Date(clockedInAt).getTime()) / 60000)
      );
    };
    compute();
    const interval = setInterval(compute, 60_000);
    return () => clearInterval(interval);
  }, [clockedInAt]);

  const clockInMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE}/api/hr/timeclock/clock-in/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!res.ok) throw json;
      return json;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["user-profile", userId] });
      void queryClient.invalidateQueries({ queryKey: ["time-clock-status", userId] });
      toast.success("You have clocked in.");
    },
    onError: (err: unknown) => {
      const code = (err as { error?: { code?: string } })?.error?.code;
      if (code === "ALREADY_CLOCKED_IN") {
        toast.error("You are already clocked in.");
      } else {
        toast.error("Clock-in failed. Please try again.");
      }
    },
  });

  const clockOutMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`${API_BASE}/api/hr/timeclock/clock-out/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!res.ok) throw json;
      return json;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["user-profile", userId] });
      void queryClient.invalidateQueries({ queryKey: ["time-clock-status", userId] });
      toast.success("You have clocked out.");
    },
    onError: (err: unknown) => {
      const code = (err as { error?: { code?: string } })?.error?.code;
      if (code === "NOT_CLOCKED_IN") {
        toast.error("You are not clocked in.");
      } else {
        toast.error("Clock-out failed. Please try again.");
      }
    },
  });

  if (!userId) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-2">
      {clockedInAt ? (
        <>
          <span className="flex items-center gap-1.5 text-sm font-inter text-navy">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
            Clocked In
          </span>
          <span className="text-xs font-mono text-text-muted">
            {formatDurationMinutes(elapsedMinutes)}
          </span>
          <Button
            size="sm"
            style={{ background: "#F97316", color: "#FFFFFF" }}
            className="rounded-md"
            onClick={() => clockOutMutation.mutate()}
            disabled={clockOutMutation.isPending}
          >
            Clock Out
          </Button>
        </>
      ) : (
        <>
          <span className="flex items-center gap-1.5 text-sm font-inter text-text-muted">
            <span className="w-2 h-2 rounded-full bg-gray-400 inline-block" />
            Not Clocked In
          </span>
          <Button
            size="sm"
            style={{ background: "#1B2B3A", color: "#FFFFFF" }}
            className="rounded-md"
            onClick={() => clockInMutation.mutate()}
            disabled={clockInMutation.isPending}
          >
            Clock In
          </Button>
        </>
      )}
    </div>
  );
}
