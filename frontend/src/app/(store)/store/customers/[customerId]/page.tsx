"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftIcon, PencilIcon } from "lucide-react";
import Decimal from "decimal.js";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { CustomerSheet } from "@/components/customers/CustomerSheet";
import { useAuthStore } from "@/stores/authStore";
import { usePermissions } from "@/hooks/usePermissions";
import { PERMISSIONS } from "@/constants/permissions";
import type { Customer } from "@/types/crm";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

function fmtCurrency(value: string) {
  const n = parseFloat(value);
  const [intPart, decPart] = n.toFixed(2).split(".");
  const withCommas = intPart!.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `Rs.\u00a0${withCommas}.${decPart}`;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function CreditDisplay({ value }: { value: string }) {
  const d = new Decimal(value);
  if (d.gt(0)) {
    return <span className="text-2xl font-bold text-[#22C55E]">{fmtCurrency(value)}</span>;
  }
  if (d.lt(0)) {
    return <span className="text-2xl font-bold text-[#EF4444]">{fmtCurrency(value)}</span>;
  }
  return <span className="text-2xl font-bold text-[#64748B]">{fmtCurrency(value)}</span>;
}

function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-14 w-14 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.customerId as string;

  const accessToken = useAuthStore((s) => s.accessToken);
  const { can } = usePermissions();
  const queryClient = useQueryClient();

  const [sheetOpen, setSheetOpen] = useState(false);

  const { data: customer, isLoading, isError } = useQuery<Customer>({
    queryKey: ["customer", customerId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/crm/customers/${customerId}/`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const json = await res.json();
      return (json.data ?? json) as Customer;
    },
    enabled: !!accessToken && !!customerId && can(PERMISSIONS.CUSTOMERS_VIEW),
    staleTime: 60_000,
  });

  function handleSheetSuccess() {
    void queryClient.invalidateQueries({ queryKey: ["customer", customerId] });
    void queryClient.invalidateQueries({ queryKey: ["customers"] });
    setSheetOpen(false);
  }

  if (!can(PERMISSIONS.CUSTOMERS_VIEW)) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F1F5F9]">
        <p className="font-inter text-[#64748B]">
          You do not have permission to view customers.
        </p>
      </main>
    );
  }

  if (isError) {
    return (
      <main className="min-h-screen bg-[#F1F5F9] p-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="mb-4 font-inter text-sm text-[#64748B] hover:text-[#1B2B3A]"
        >
          <ArrowLeftIcon className="mr-1 h-4 w-4" />
          Back
        </Button>
        <div className="rounded-md border border-[#EF4444] bg-red-50 px-4 py-3 font-inter text-sm text-[#EF4444]">
          Failed to load customer. They may not exist or you may not have access.
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F1F5F9] p-6">
      {/* Back button */}
      <Link
        href="/store/customers"
        className="mb-6 inline-flex items-center font-inter text-sm text-[#64748B] hover:text-[#1B2B3A]"
      >
        <ArrowLeftIcon className="mr-1 h-4 w-4" />
        Back to Customers
      </Link>

      {isLoading || !customer ? (
        <ProfileSkeleton />
      ) : (
        <>
          {/* Profile Header */}
          <div className="mb-6 flex items-start justify-between rounded-lg border border-[#E2E8F0] bg-white p-6 shadow-sm">
            <div className="flex items-center gap-4">
              {/* Initials Avatar */}
              <div
                className="flex h-14 w-14 items-center justify-center rounded-full bg-[#F1F5F9]"
                aria-hidden="true"
              >
                <span className="font-inter text-xl font-bold text-[#1B2B3A]">
                  {getInitials(customer.name)}
                </span>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-inter text-xl font-bold text-[#1B2B3A]">{customer.name}</h1>
                  {!customer.is_active && (
                    <span className="rounded-full bg-[#F1F5F9] px-2 py-0.5 font-inter text-xs text-[#64748B]">
                      Inactive
                    </span>
                  )}
                </div>
                <p className="mt-0.5 font-inter text-sm text-[#64748B]">{customer.phone}</p>
                {customer.email && (
                  <p className="font-inter text-sm text-[#64748B]">{customer.email}</p>
                )}
                {customer.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {customer.tags.map((tag) => (
                      <Badge
                        key={tag}
                        className="bg-[#FFF7ED] font-inter text-[11px] font-medium text-[#F97316] hover:bg-[#FFF7ED]"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {can(PERMISSIONS.CUSTOMERS_EDIT) && (
              <Button
                onClick={() => setSheetOpen(true)}
                variant="outline"
                className="border-[#E2E8F0] font-inter text-sm text-[#1B2B3A]"
              >
                <PencilIcon className="mr-2 h-4 w-4" />
                Edit
              </Button>
            )}
          </div>

          {/* Stats Cards */}
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Card className="border-[#E2E8F0] shadow-sm">
              <CardHeader className="pb-1">
                <CardTitle className="font-inter text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                  Total Spend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <span className="font-inter text-2xl font-bold text-[#1B2B3A]">
                  {fmtCurrency(customer.total_spend)}
                </span>
              </CardContent>
            </Card>

            <Card className="border-[#E2E8F0] shadow-sm">
              <CardHeader className="pb-1">
                <CardTitle className="font-inter text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                  Avg Order Value
                </CardTitle>
              </CardHeader>
              <CardContent>
                <span className="font-inter text-2xl font-bold text-[#1B2B3A]">
                  {customer.avg_order_value ? fmtCurrency(customer.avg_order_value) : "—"}
                </span>
              </CardContent>
            </Card>

            <Card className="border-[#E2E8F0] shadow-sm">
              <CardHeader className="pb-1">
                <CardTitle className="font-inter text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                  Visit Count
                </CardTitle>
              </CardHeader>
              <CardContent>
                <span className="font-inter text-2xl font-bold text-[#1B2B3A]">
                  {customer.visit_count ?? 0}
                </span>
              </CardContent>
            </Card>

            <Card className="border-[#E2E8F0] shadow-sm">
              <CardHeader className="pb-1">
                <CardTitle className="font-inter text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                  Credit Balance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CreditDisplay value={customer.credit_balance} />
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="purchases" className="w-full">
            <TabsList className="mb-4 border-b border-[#E2E8F0] bg-transparent p-0">
              <TabsTrigger
                value="purchases"
                className="rounded-none border-b-2 border-transparent px-4 py-2 font-inter text-sm font-medium text-[#64748B] data-[state=active]:border-[#F97316] data-[state=active]:text-[#F97316]"
              >
                Purchase History
              </TabsTrigger>
              <TabsTrigger
                value="notes"
                className="rounded-none border-b-2 border-transparent px-4 py-2 font-inter text-sm font-medium text-[#64748B] data-[state=active]:border-[#F97316] data-[state=active]:text-[#F97316]"
              >
                Notes
              </TabsTrigger>
            </TabsList>

            <TabsContent value="purchases">
              <div className="rounded-lg border border-[#E2E8F0] bg-white p-6 shadow-sm">
                <p className="font-inter text-sm text-[#64748B]">No purchases yet.</p>
              </div>
            </TabsContent>

            <TabsContent value="notes">
              <div className="rounded-lg border border-[#E2E8F0] bg-white p-6 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-inter text-sm font-semibold text-[#1B2B3A]">Notes</h2>
                  {can(PERMISSIONS.CUSTOMERS_EDIT) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSheetOpen(true)}
                      className="h-7 px-2 font-inter text-xs text-[#64748B] hover:text-[#1B2B3A]"
                    >
                      <PencilIcon className="mr-1 h-3.5 w-3.5" />
                      Edit
                    </Button>
                  )}
                </div>
                {customer.notes ? (
                  <p className="whitespace-pre-wrap font-inter text-sm text-[#1B2B3A]">
                    {customer.notes}
                  </p>
                ) : (
                  <p className="font-inter text-sm text-[#64748B]">No notes added.</p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Edit Sheet */}
      {customer && (
        <CustomerSheet
          customer={customer}
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          onSuccess={handleSheetSuccess}
        />
      )}
    </main>
  );
}
