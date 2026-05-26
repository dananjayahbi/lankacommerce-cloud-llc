"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Package,
  Printer,
  Truck,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

// ─── Types ────────────────────────────────────────────────────────────────────

type OrderStatus = "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded";
type PaymentStatus = "unpaid" | "paid" | "partially_paid" | "refunded";
type FulfillmentStatus = "unfulfilled" | "partial" | "fulfilled";

interface OrderLineItem {
  product_id?: string;
  variant_id?: string;
  title: string;
  variant_title: string | null;
  sku: string | null;
  quantity: number;
  unit_price: string;
  total: string;
  image_url?: string | null;
}

interface WebstoreOrderDetail {
  id: string;
  order_number: string;
  customer_email: string;
  created_at: string;
  updated_at: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  fulfillment_status: FulfillmentStatus;
  tracking_number: string;
  tracking_carrier: string;
  notes: string;
  line_items: OrderLineItem[];
  subtotal: string;
  shipping_amount: string;
  discount_amount: string;
  total: string;
  currency: string;
  shipping_address: {
    name: string;
    address_line1: string;
    address_line2?: string;
    city: string;
    state?: string;
    postal_code?: string;
    country: string;
  } | null;
}

// ─── Badge helpers ────────────────────────────────────────────────────────────

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

function formatMoney(amount: string, currency: string) {
  return `${currency} ${parseFloat(amount).toLocaleString("en-LK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WebstoreOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();

  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showTrackingDialog, setShowTrackingDialog] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingCarrier, setTrackingCarrier] = useState("");

  const orderId = params.id;

  const { data: order, isLoading, isError } = useQuery<WebstoreOrderDetail>({
    queryKey: ["webstore-order", orderId],
    queryFn: async () => {
      const res = await fetch(
        `${API_BASE}/api/webstore/orders/${orderId}/`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (!res.ok) throw new Error("Failed to load order");
      return res.json();
    },
    enabled: !!accessToken && !!orderId,
  });

  const updateStatusMutation = useMutation<
    void,
    Error,
    { status?: OrderStatus; fulfillment_status?: FulfillmentStatus; tracking_number?: string; tracking_carrier?: string }
  >({
    mutationFn: async (payload) => {
      const res = await fetch(
        `${API_BASE}/api/webstore/orders/${orderId}/status/`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(payload),
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          (err as { detail?: string }).detail ?? "Failed to update order",
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webstore-order", orderId] });
      queryClient.invalidateQueries({ queryKey: ["webstore-orders"] });
      setShowCancelDialog(false);
      setShowTrackingDialog(false);
      toast.success("Order updated");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  function handleMarkFulfilled() {
    updateStatusMutation.mutate({ fulfillment_status: "fulfilled" });
  }

  function handleCancel() {
    updateStatusMutation.mutate({ status: "cancelled" });
  }

  function handleAddTracking() {
    updateStatusMutation.mutate({
      status: "shipped",
      tracking_number: trackingNumber || undefined,
      tracking_carrier: trackingCarrier || undefined,
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-sm text-red-600">
          Failed to load order.{" "}
          <button
            type="button"
            className="underline"
            onClick={() => router.back()}
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  const canFulfill = order.fulfillment_status !== "fulfilled" && order.status !== "cancelled";
  const canCancel = !["delivered", "cancelled"].includes(order.status);

  return (
    <div className="p-6 max-w-4xl">
      {/* Breadcrumb */}
      <nav className="mb-4 text-xs text-slate-500">
        <Link href="/store/webstore/orders" className="hover:underline">
          Webstore Orders
        </Link>
        <span className="mx-1.5">›</span>
        <span className="text-slate-800 font-medium">
          #{order.order_number}
        </span>
      </nav>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <Link
              href="/store/webstore/orders"
              className="rounded-lg border p-1.5 text-slate-500 hover:bg-slate-100 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-2xl font-bold text-slate-900">
              Order #{order.order_number}
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1 ml-9">
            Placed on{" "}
            {format(new Date(order.created_at), "dd MMM yyyy 'at' HH:mm")}
          </p>
        </div>

        {/* Status badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            variant="outline"
            className={ORDER_STATUS_STYLES[order.status]}
          >
            {statusLabel(order.status)}
          </Badge>
          <Badge
            variant="outline"
            className={PAYMENT_STATUS_STYLES[order.payment_status]}
          >
            {statusLabel(order.payment_status)}
          </Badge>
          <Badge
            variant="outline"
            className={FULFILLMENT_STATUS_STYLES[order.fulfillment_status]}
          >
            {statusLabel(order.fulfillment_status)}
          </Badge>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {canFulfill && (
          <Button
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white h-8 text-xs"
            onClick={handleMarkFulfilled}
            disabled={updateStatusMutation.isPending}
          >
            {updateStatusMutation.isPending ? (
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
            )}
            Mark as Fulfilled
          </Button>
        )}

        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs"
          onClick={() => {
            setTrackingNumber(order.tracking_number ?? "");
            setTrackingCarrier(order.tracking_carrier ?? "");
            setShowTrackingDialog(true);
          }}
          disabled={order.status === "cancelled"}
        >
          <Truck className="w-3.5 h-3.5 mr-1.5" />
          {order.tracking_number ? "Update Tracking" : "Add Tracking"}
        </Button>

        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs"
          onClick={() => window.print()}
        >
          <Printer className="w-3.5 h-3.5 mr-1.5" />
          Print
        </Button>

        {canCancel && (
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50"
            onClick={() => setShowCancelDialog(true)}
          >
            <XCircle className="w-3.5 h-3.5 mr-1.5" />
            Cancel Order
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left column: Line items + Totals */}
        <div className="lg:col-span-2 space-y-5">
          {/* Line items */}
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
              <Package className="w-4 h-4 text-slate-500" />
              <h2 className="font-semibold text-slate-800 text-sm">Items</h2>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="text-xs font-semibold text-slate-600">Product</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 text-center">Qty</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 text-right">Price</TableHead>
                  <TableHead className="text-xs font-semibold text-slate-600 text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.line_items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <p className="text-sm font-medium text-slate-800">
                        {item.title}
                      </p>
                      {item.variant_title && (
                        <p className="text-xs text-slate-500">
                          {item.variant_title}
                        </p>
                      )}
                      {item.sku && (
                        <p className="text-xs text-slate-400 font-mono">
                          SKU: {item.sku}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-center text-sm text-slate-700">
                      {item.quantity}
                    </TableCell>
                    <TableCell className="text-right text-sm text-slate-700">
                      {formatMoney(item.unit_price, order.currency)}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium text-slate-800">
                      {formatMoney(item.total, order.currency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Totals */}
            <div className="px-4 py-3 border-t border-slate-100 space-y-1.5">
              <div className="flex justify-between text-sm text-slate-600">
                <span>Subtotal</span>
                <span>{formatMoney(order.subtotal, order.currency)}</span>
              </div>
              {parseFloat(order.shipping_amount) > 0 && (
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Shipping</span>
                  <span>{formatMoney(order.shipping_amount, order.currency)}</span>
                </div>
              )}
              {parseFloat(order.discount_amount) > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount</span>
                  <span>−{formatMoney(order.discount_amount, order.currency)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-semibold text-slate-900 pt-1.5 border-t border-slate-200">
                <span>Total</span>
                <span>{formatMoney(order.total, order.currency)}</span>
              </div>
            </div>
          </div>

          {/* Tracking info */}
          {order.tracking_number && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="font-semibold text-slate-800 text-sm mb-2 flex items-center gap-2">
                <Truck className="w-4 h-4 text-slate-500" />
                Tracking
              </h2>
              <p className="text-sm text-slate-700 font-mono">
                {order.tracking_number}
              </p>
              {order.tracking_carrier && (
                <p className="text-xs text-slate-500 mt-0.5">
                  {order.tracking_carrier}
                </p>
              )}
            </div>
          )}

          {/* Notes */}
          {order.notes && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="font-semibold text-slate-800 text-sm mb-2">
                Notes
              </h2>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">
                {order.notes}
              </p>
            </div>
          )}
        </div>

        {/* Right column: Customer + Shipping */}
        <div className="space-y-5">
          {/* Customer */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="font-semibold text-slate-800 text-sm mb-3">
              Customer
            </h2>
            <div className="space-y-1">
              {order.shipping_address?.name && (
                <p className="text-sm font-medium text-slate-800">
                  {order.shipping_address.name}
                </p>
              )}
              <p className="text-sm text-slate-600">{order.customer_email}</p>
            </div>
          </div>

          {/* Shipping address */}
          {order.shipping_address && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="font-semibold text-slate-800 text-sm mb-3">
                Shipping Address
              </h2>
              <div className="text-sm text-slate-600 space-y-0.5">
                <p className="font-medium text-slate-800">
                  {order.shipping_address.name}
                </p>
                <p>{order.shipping_address.address_line1}</p>
                {order.shipping_address.address_line2 && (
                  <p>{order.shipping_address.address_line2}</p>
                )}
                <p>
                  {order.shipping_address.city}
                  {order.shipping_address.state
                    ? `, ${order.shipping_address.state}`
                    : ""}
                  {order.shipping_address.postal_code
                    ? ` ${order.shipping_address.postal_code}`
                    : ""}
                </p>
                <p>{order.shipping_address.country}</p>
              </div>
            </div>
          )}

          {/* Order meta */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="font-semibold text-slate-800 text-sm mb-3">
              Details
            </h2>
            <dl className="text-xs space-y-1.5">
              <div className="flex justify-between">
                <dt className="text-slate-500">Order ID</dt>
                <dd className="font-mono text-slate-700">{order.id}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Created</dt>
                <dd className="text-slate-700">
                  {format(new Date(order.created_at), "dd MMM yyyy")}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Updated</dt>
                <dd className="text-slate-700">
                  {format(new Date(order.updated_at), "dd MMM yyyy")}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* Cancel confirmation */}
      <AlertDialog
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Order #{order.order_number}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The order will be marked as cancelled.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Order</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleCancel}
            >
              {updateStatusMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Cancel Order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add / Update Tracking dialog */}
      <Dialog open={showTrackingDialog} onOpenChange={setShowTrackingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {order.tracking_number ? "Update Tracking" : "Add Tracking"}
            </DialogTitle>
            <DialogDescription>
              Adding tracking will also mark the order as Shipped.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="carrier">Carrier</Label>
              <Input
                id="carrier"
                placeholder="e.g. Lanka Speed Post"
                value={trackingCarrier}
                onChange={(e) => setTrackingCarrier(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tracking">Tracking Number</Label>
              <Input
                id="tracking"
                placeholder="Enter tracking number"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowTrackingDialog(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-[#F97316] hover:bg-orange-600 text-white"
              onClick={handleAddTracking}
              disabled={updateStatusMutation.isPending}
            >
              {updateStatusMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Save Tracking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
