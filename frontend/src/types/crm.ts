/**
 * LankaCommerce CRM TypeScript interfaces.
 * Mirrors backend/apps/crm serializer response shapes.
 */

export type Gender = "MALE" | "FEMALE" | "OTHER";

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  gender: Gender | null;
  birthday: string | null;
  tags: string[];
  notes: string;
  credit_balance: string; // Decimal string
  total_spend: string; // Decimal string
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Augmented by server
  visit_count?: number;
  avg_order_value?: string;
}

export interface CustomersListResponse {
  customers: Customer[];
  total: number;
  page: number;
  total_pages: number;
}

export interface Supplier {
  id: string;
  name: string;
  contact_name: string;
  phone: string;
  whatsapp_number: string;
  email: string;
  address: string;
  lead_time_days: number;
  notes: string;
  is_active: boolean;
  purchase_orders_count: number;
}

export interface SuppliersListResponse {
  results: Supplier[];
  total: number;
  page: number;
  total_pages: number;
}

export type POStatus = "DRAFT" | "SENT" | "PARTIALLY_RECEIVED" | "RECEIVED" | "CANCELLED";

export interface PurchaseOrderLine {
  id: string;
  variant_id: string;
  product_name_snapshot: string;
  variant_description_snapshot: string;
  ordered_qty: number;
  expected_cost_price: string;
  received_qty: number;
  actual_cost_price: string | null;
  is_fully_received: boolean;
}

export interface PurchaseOrder {
  id: string;
  supplier_id: string;
  supplier_name: string;
  supplier_contact_name: string;
  supplier_phone: string;
  supplier_whatsapp_number: string;
  created_by_id: string;
  created_by_name: string;
  expected_delivery_date: string | null;
  status: POStatus;
  notes: string;
  total_amount: string;
  lines: PurchaseOrderLine[];
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrderListItem {
  id: string;
  supplier_id: string;
  supplier_name: string;
  status: POStatus;
  total_amount: string;
  lines_count: number;
  expected_delivery_date: string | null;
  created_at: string;
}

export interface PurchaseOrdersListResponse {
  purchase_orders: PurchaseOrderListItem[];
  total: number;
  page: number;
  total_pages: number;
}
