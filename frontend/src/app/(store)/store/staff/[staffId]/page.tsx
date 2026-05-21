"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useAuthStore } from "@/stores/authStore";
import type { StaffDetailResponse, StaffMember } from "@/types/hr";
import { ROLE_BADGE_CONFIG } from "../components/StaffTable";
import { ProfileTab } from "./components/ProfileTab";
import { PinManagement } from "./components/PinManagement";
import { CommissionHistory } from "./components/CommissionHistory";
import { TimeClockHistory } from "./components/TimeClockHistory";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

interface Props {
  params: Promise<{ staffId: string }>;
}

export default function StaffDetailPage({ params }: Props) {
  const { staffId } = use(params);
  const accessToken = useAuthStore((s) => s.accessToken);

  const { data, isLoading, isError } = useQuery<StaffMember>({
    queryKey: ["staff-member", staffId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/hr/staff/${staffId}/`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json: StaffDetailResponse = await res.json();
      if (res.status === 404) throw Object.assign(new Error("NOT_FOUND"), { is404: true });
      if (!res.ok) throw new Error("Failed to load staff member");
      return json.data;
    },
    enabled: !!accessToken,
    retry: (count, err) => {
      const e = err as { is404?: boolean };
      if (e.is404) return false;
      return count < 2;
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const isNotFound = isError && (isError as unknown as { is404?: boolean });
  if (isError || !data) {
    return (
      <div className="p-6 space-y-4">
        <Alert variant="destructive">
          <AlertDescription>
            {isNotFound ? "Staff member not found." : "Failed to load staff member."}
            {" "}
            <Link href="/store/staff" className="underline">
              Back to Staff
            </Link>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const badge = ROLE_BADGE_CONFIG[data.role];

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/store/dashboard">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/store/staff">Staff</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{data.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-start gap-4">
        <div>
          <h1 className="text-[28px] font-semibold text-navy font-inter leading-tight">
            {data.name}
          </h1>
          <div className="flex items-center gap-2 mt-1.5">
            <span
              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
              style={{ backgroundColor: badge.background, color: badge.color }}
            >
              {badge.label}
            </span>
            <span
              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
              style={{
                backgroundColor: data.is_active ? "#DCFCE7" : "#F1F5F9",
                color: data.is_active ? "#16A34A" : "#64748B",
              }}
            >
              {data.is_active ? "Active" : "Inactive"}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="pin">PIN Management</TabsTrigger>
          <TabsTrigger value="commission">Commission History</TabsTrigger>
          <TabsTrigger value="timeclock">Time Clock History</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4">
          <ProfileTab staffMember={data} />
        </TabsContent>
        <TabsContent value="pin" className="mt-4">
          <PinManagement staffMember={data} />
        </TabsContent>
        <TabsContent value="commission" className="mt-4">
          <CommissionHistory staffMember={data} />
        </TabsContent>
        <TabsContent value="timeclock" className="mt-4">
          <TimeClockHistory staffMember={data} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
