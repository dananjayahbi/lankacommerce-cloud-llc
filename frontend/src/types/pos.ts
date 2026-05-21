/**
 * LankaCommerce POS TypeScript interfaces.
 * Mirrors backend/apps/pos serializer response shapes.
 */

import type { UserPayload } from "@/stores/authStore";
import type { AppliedDiscount } from "@/types/promotions";

export type PaymentMethod = "CASH" | "CARD" | "SPLIT" | "EXCHANGE";
export type PaymentLegMethod = "CASH" | "CARD";
export type SaleStatus = "OPEN" | "COMPLETED" | "VOIDED";
export type ShiftStatus = "OPEN" | "CLOSED";

export interface Shift {
  id: string;
  tenant_id: string;
  cashier: Pick<UserPayload, "user_id" | "email">;
  status: ShiftStatus;
  opened_at: string;
  closed_at: string | null;
  opening_float: string;
  closing_cash_count: string | null;
  notes: string | null;
}

export interface ShiftClosure {
  closing_cash_count: string;
  notes?: string;
}

export interface SaleLine {
  id: string;
  sale: string;
  /** variant UUID — matches `variant_id` from the backend serializer */
  variant_id: string;
  product_name_snapshot: string;
  variant_description_snapshot: string;
  sku: string;
  unit_price: string;
  quantity: number;
  discount_percent: string;
  discount_amount: string;
  line_total_before_discount: string;
  line_total_after_discount: string;
}

export interface Payment {
  id: string;
  method: PaymentLegMethod;
  amount: string;
  card_reference_number: string | null;
  created_at: string;
}

export interface Sale {
  id: string;
  tenant_id: string;
  shift_id: string;
  cashier_id: string;
  subtotal: string;
  discount_amount: string;
  tax_amount: string;
  total_amount: string;
  change_given: string | null;
  authorizing_manager_id: string | null;
  status: SaleStatus;
  payment_method: PaymentMethod | null;
  lines: SaleLine[];
  payments: Payment[];
  created_at: string;
  updated_at: string;
  whatsapp_receipt_sent_at: string | null;
}

/** Sale record as returned by the paginated list endpoint (lighter-weight, no line items array) */
export interface SaleListItem {
  id: string;
  tenant_id: string;
  shift_id: string;
  cashier_id: string;
  cashier_name: string;
  line_count: number;
  subtotal: string;
  discount_amount: string;
  tax_amount: string;
  total_amount: string;
  authorizing_manager_id: string | null;
  status: SaleStatus;
  payment_method: PaymentMethod | null;
  created_at: string;
  updated_at: string;
  voided_at: string | null;
  voided_by_id: string | null;
  voided_by_name: string | null;
}

/** Full sale detail including line items and audit fields */
export interface SaleDetail extends Sale {
  cashier_name: string;
  voided_at: string | null;
  voided_by_id: string | null;
  voided_by_name: string | null;
}

/** Paginated API response for the sales list endpoint */
export interface SalesListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: SaleListItem[];
}

/** Cart item for the Zustand cart store — uses string for Decimal serialization */
export interface CartItem {
  /** Unique cart line ID (UUID generated client-side) */
  id: string;
  variantId: string;
  productName: string;
  variantDescription: string;
  sku: string;
  /** Stored as string, converted to Decimal in computations */
  unitPrice: string;
  quantity: number;
  /** 0–100 line-level discount percentage, stored as string */
  discountPercent: string;
}

/** Payload sent to POST /api/pos/sales/ */
export interface CreateSalePayload {
  shift_id: string;
  lines: Array<{
    variant_id: string;
    quantity: number;
    discount_percent?: string;
  }>;
  cart_discount_amount?: string;
  authorizing_manager_id?: string | null;
  payment_method: PaymentMethod;
  cash_received?: number;
  card_reference_number?: string;
  card_amount?: number;
  queued_at?: string;
  linked_return_id?: string | null;
  customer_id?: string | null;
  applied_store_credit?: string;
  applied_promotions?: AppliedDiscount[] | undefined;
}


export interface Shift {
  id: string;
  tenant_id: string;
  cashier: Pick<UserPayload, "user_id" | "email">;
  status: ShiftStatus;
  opened_at: string;
  closed_at: string | null;
  opening_float: string;
  closing_cash_count: string | null;
  notes: string | null;
}

export interface ShiftClosure {
  closing_cash_count: string;
  notes?: string;
}

export interface SaleLine {
  id: string;
  sale: string;
  /** variant UUID — matches `variant_id` from the backend serializer */
  variant_id: string;
  product_name_snapshot: string;
  variant_description_snapshot: string;
  sku: string;
  unit_price: string;
  quantity: number;
  discount_percent: string;
  discount_amount: string;
  line_total_before_discount: string;
  line_total_after_discount: string;
}

export interface Sale {
  id: string;
  tenant_id: string;
  shift_id: string;
  cashier_id: string;
  subtotal: string;
  discount_amount: string;
  tax_amount: string;
  total_amount: string;
  authorizing_manager_id: string | null;
  status: SaleStatus;
  payment_method: PaymentMethod | null;
  lines: SaleLine[];
  created_at: string;
  updated_at: string;
}

/** Sale record as returned by the paginated list endpoint (lighter-weight, no line items array) */
export interface SaleListItem {
  id: string;
  tenant_id: string;
  shift_id: string;
  cashier_id: string;
  cashier_name: string;
  line_count: number;
  subtotal: string;
  discount_amount: string;
  tax_amount: string;
  total_amount: string;
  authorizing_manager_id: string | null;
  status: SaleStatus;
  payment_method: PaymentMethod | null;
  created_at: string;
  updated_at: string;
  voided_at: string | null;
  voided_by_id: string | null;
  voided_by_name: string | null;
}

/** Full sale detail including line items and audit fields */
export interface SaleDetail extends Sale {
  cashier_name: string;
  voided_at: string | null;
  voided_by_id: string | null;
  voided_by_name: string | null;
  whatsapp_receipt_sent_at: string | null;
}

/** Paginated API response for the sales list endpoint */
export interface SalesListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: SaleListItem[];
}

/** Cart item for the Zustand cart store — uses string for Decimal serialization */
export interface CartItem {
  /** Unique cart line ID (UUID generated client-side) */
  id: string;
  variantId: string;
  productName: string;
  variantDescription: string;
  sku: string;
  /** Stored as string, converted to Decimal in computations */
  unitPrice: string;
  quantity: number;
  /** 0–100 line-level discount percentage, stored as string */
  discountPercent: string;
}

// ─────────────────────────────────────────────────────────────────
// Returns & Store Credit types (SubPhase 03.03)
// ─────────────────────────────────────────────────────────────────

export type ReturnRefundMethod = "CASH" | "CARD_REVERSAL" | "STORE_CREDIT" | "EXCHANGE";
export type ReturnStatus = "COMPLETED";

export interface ReturnLine {
  id: string;
  original_sale_line_id: string;
  variant_id: string;
  product_name_snapshot: string;
  variant_description_snapshot: string;
  quantity: number;
  unit_price: string;
  line_refund_amount: string;
  is_restocked: boolean;
  created_at: string;
}

export interface Return {
  id: string;
  tenant_id: string;
  original_sale_id: string;
  initiated_by_id: string;
  authorized_by_id: string;
  refund_method: ReturnRefundMethod;
  refund_amount: string;
  restock_items: boolean;
  reason: string;
  status: ReturnStatus;
  card_reversal_reference: string;
  created_at: string;
  lines: ReturnLine[];
}

export interface InitiateReturnPayload {
  original_sale_id: string;
  lines: Array<{ sale_line_id: string; quantity: number }>;
  refund_method: ReturnRefundMethod;
  restock_items: boolean;
  reason: string;
  card_reversal_reference?: string;
  authorizing_manager_id: string;
}

export interface ReturnsListResponse {
  results: Return[];
  total: number;
  page: number;
  limit: number;
}
