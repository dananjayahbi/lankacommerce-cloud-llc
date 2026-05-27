"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import { format } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  ShoppingBag,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
const PAGE_SIZE = 20;

// ─── Types ────────────────────────────────────────────────────────────────────

type OrderStatus = "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded";
type PaymentStatus = "unpaid" | "paid" | "partially_paid" | "refunded";
type FulfillmentStatus = "unfulfilled" | "partial" | "fulfilled";

interface WebstoreOrder {
  id: string;
  order_number: string;
  customer_email: string;
  created_at: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  fulfillment_status: FulfillmentStatus;
  total: string;
  currency: string;
}

interface OrdersResponse {
  results: WebstoreOrder[];
  count: number;
  next: string | null;
  previous: string | null;
}

// ─── Badge colour helpers ─────────────────────────────────────────────────────

const ORDER_STATUS_STYLES: Record<OrderStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  confirmed: "bg-blue-100 text-blue-800 border-blue-200",
  processing: "bg-sky-100 text-sky-800 border-sky-200",
  shipped: "bg-indigo-100 text-indigo-800 border-indigo-200",
  delivered: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
  refunded: "bg-purple-100 text-purple-800 border-purple-200",
};

const PAYMENT_STATUS_STYLES: Record<PaymentStatus, string> = {
  unpaid: "bg-red-100 text-red-800 border-red-200",
  paid: "bg-green-100 text-green-800 border-green-200",
  partially_paid: "bg-yellow-100 text-yellow-800 border-yellow-200",
  refunded: "bg-purple-100 text-purple-800 border-purple-200",
};

const FULFILLMENT_STATUS_STYLES: Record<FulfillmentStatus, string> = {
  unfulfilled: "bg-slate-100 text-slate-700 border-slate-200",
  partial: "bg-yellow-100 text-yellow-800 border-yellow-200",
  fulfilled: "bg-green-100 text-green-800 border-green-200",
};

function statusLabel(s: string) {
  return s
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WebstoreOrdersPage() {
  const accessToken = useAuthStore((s) => s.accessToken);

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");

  const queryParams = new URLSearchParams({
    page: String(page),
    page_size: String(PAGE_SIZE),
    ...(statusFilter !== "all" && { status: statusFilter }),
    ...(paymentFilter !== "all" && { payment_status: paymentFilter }),
  });

  const { data, isLoading, isError } = useQuery<OrdersResponse>({
    queryKey: ["webstore-orders", page, statusFilter, paymentFilter],
    queryFn: async () => {
      const res = await fetch(
        `${API_BASE}/api/webstore/orders/?${queryParams}`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (!res.ok) throw new Error("Failed to load orders");
      return res.json();
    },
    enabled: !!accessToken,
    placeholderData: (prev) => prev,
  });

  const totalPages = data ? Math.ceil(data.count / PAGE_SIZE) : 1;

  return (
    <div className="p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <ShoppingBag className="w-6 h-6 text-[#F97316]" />
          Webstore Orders
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Orders placed through your online webstore
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v ?? "all"); setPage(1); }}>
          <SelectTrigger className="h-8 w-40 text-xs">
            <SelectValue placeholder="Order Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {(["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded"] as OrderStatus[]).map(
              (s) => (
                <SelectItem key={s} value={s}>
                  {statusLabel(s)}
                </SelectItem>
              ),
            )}
          </SelectContent>
        </Select>

        <Select value={paymentFilter} onValueChange={(v) => { setPaymentFilter(v ?? "all"); setPage(1); }}>
          <SelectTrigger className="h-8 w-40 text-xs">
            <SelectValue placeholder="Payment Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Payments</SelectItem>
            {(["unpaid", "paid", "partially_paid", "refunded"] as PaymentStatus[]).map(
              (s) => (
                <SelectItem key={s} value={s}>
                  {statusLabel(s)}
                </SelectItem>
              ),
            )}
          </SelectContent>
        </Select>

        {(statusFilter !== "all" || paymentFilter !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-slate-500"
            onClick={() => { setStatusFilter("all"); setPaymentFilter("all"); setPage(1); }}
          >
            Clear filters
          </Button>
        )}

        {data && (
          <span className="ml-auto text-xs text-slate-500">
            {data.count} {data.count === 1 ? "order" : "orders"}
          </span>
        )}
      </div>

      {/* Table */}
      {isLoading && !data ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
        </div>
      ) : isError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-sm text-red-600">
          Failed to load orders. Please try again.
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="text-xs font-semibold text-slate-600">Order</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600">Customer</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600">Date</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600">Status</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600">Payment</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600">Fulfillment</TableHead>
                <TableHead className="text-xs font-semibold text-slate-600 text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.results.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-slate-400 text-sm">
                    No orders found
                  </TableCell>
                </TableRow>
              ) : (
                data?.results.map((order) => (
                  <TableRow
                    key={order.id}
                    className="hover:bg-slate-50 cursor-pointer"
                  >
                    <TableCell>
                      <Link
                        href={`/store/webstore/orders/${order.id}`}
                        className="font-medium text-[#F97316] hover:underline"
                      >
                        #{order.order_number}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-slate-700">
                      {order.customer_email}
                    </TableCell>
                    <TableCell className="text-sm text-slate-500 whitespace-nowrap">
                      {format(new Date(order.created_at), "dd MMM yyyy, HH:mm")}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${ORDER_STATUS_STYLES[order.status]}`}
                      >
                        {statusLabel(order.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${PAYMENT_STATUS_STYLES[order.payment_status]}`}
                      >
                        {statusLabel(order.payment_status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${FULFILLMENT_STATUS_STYLES[order.fulfillment_status]}`}
                      >
                        {statusLabel(order.fulfillment_status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium text-slate-800">
                      {order.currency}{" "}
                      {parseFloat(order.total).toLocaleString("en-LK", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-slate-500">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
