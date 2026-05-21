"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

import { useAuthStore } from "@/stores/authStore";
import { usePermissions } from "@/hooks/usePermissions";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CommissionSummaryResponse } from "@/types/hr";
import { CommissionTable } from "./components/CommissionTable";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

function defaultPeriodStart(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

function defaultPeriodEnd(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
}

export default function CommissionReportsPage() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const { isManagerOrAbove } = usePermissions();
  const [periodStart, setPeriodStart] = useState<string>(defaultPeriodStart());
  const [periodEnd, setPeriodEnd] = useState<string>(defaultPeriodEnd());

  useEffect(() => {
    if (!isManagerOrAbove) {
      router.replace("/dashboard");
    }
  }, [isManagerOrAbove, router]);

  const { data, isLoading, isError } = useQuery<CommissionSummaryResponse>({
    queryKey: ["commissions", periodStart, periodEnd],
    enabled: isManagerOrAbove && !!periodStart && !!periodEnd,
    queryFn: async () => {
      const params = new URLSearchParams({
        period_start: periodStart,
        period_end: periodEnd,
      });
      const res = await fetch(`${API_BASE}/api/hr/commissions/?${params.toString()}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error("Failed to fetch commission summary");
      return res.json() as Promise<CommissionSummaryResponse>;
    },
  });

  if (!isManagerOrAbove) return null;

  return (
    <div className="p-6 space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/staff">Staff</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Commission Reports</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold font-inter text-navy">Commission Reports</h1>
      </div>

      <div className="flex gap-4 items-end">
        <div className="space-y-1">
          <Label htmlFor="period-start">From</Label>
          <Input
            id="period-start"
            type="date"
            value={periodStart.split("T")[0]}
            onChange={(e) => {
              if (e.target.value) setPeriodStart(new Date(e.target.value).toISOString());
            }}
            className="w-44"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="period-end">To</Label>
          <Input
            id="period-end"
            type="date"
            value={periodEnd.split("T")[0]}
            onChange={(e) => {
              if (e.target.value) {
                const d = new Date(e.target.value);
                d.setHours(23, 59, 59);
                setPeriodEnd(d.toISOString());
              }
            }}
            className="w-44"
          />
        </div>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}

      {isError && (
        <Alert variant="destructive">
          <AlertDescription>Failed to load commission data. Please try again.</AlertDescription>
        </Alert>
      )}

      {data?.data && (
        <CommissionTable
          summary={data.data.summary}
          periodStart={periodStart}
          periodEnd={periodEnd}
        />
      )}
    </div>
  );
}
