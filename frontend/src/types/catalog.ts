/**
 * LankaCommerce Catalog TypeScript interfaces.
 * Mirrors backend/apps/catalog serializer response shapes.
 */

export type GenderType = "MEN" | "WOMEN" | "UNISEX" | "KIDS" | "TODDLERS";
export type ProductStatus = "ACTIVE" | "ARCHIVED";
export type TaxRule = "STANDARD_VAT" | "SSCL" | "VAT_EXEMPT";
export type StockMovementReason =
  | "SALE"
  | "SALE_RETURN"
  | "PURCHASE_RECEIPT"
  | "MANUAL_ADJUSTMENT"
  | "STOCK_TAKE_ADJUSTMENT"
  | "DAMAGE_WRITE_OFF"
  | "TRANSFER_IN"
  | "TRANSFER_OUT"
  | "INITIAL_STOCK";

export type StockTakeStatus =
  | "IN_PROGRESS"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED";

export interface Category {
  id: string;
  name: string;
  parent_id: string | null;
  parent_name: string | null;
  product_count?: number;
}

export interface Brand {
  id: string;
  name: string;
  description?: string | null;
  logo_url?: string | null;
  product_count?: number;
}

export interface ProductVariant {
  id: string;
  sku: string;
  barcode: string | null;
  size: string | null;
  colour: string | null;
  cost_price: string | null; // null when user lacks products.view_cost
  retail_price: string;
  wholesale_price: string | null;
  stock_quantity: number;
  low_stock_threshold: number;
  image_urls: string[];
  deleted_at: string | null;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  gender: GenderType;
  status: ProductStatus;
  tax_rule: TaxRule;
  tags: string[];
  category_id: string | null;
  category_name: string | null;
  brand_id: string | null;
  brand_name: string | null;
  variant_count: number;
  total_stock?: number;
  variants?: ProductVariant[];
  created_at: string;
  updated_at: string;
}

export interface PaginatedProducts {
  data: Product[];
  meta: {
    total: number;
    page: number;
    page_size: number;
  };
}

export interface ProductFilters {
  search?: string;
  category_id?: string;
  brand_id?: string;
  gender?: GenderType;
  is_archived?: boolean;
  page?: number;
  page_size?: number;
}

export interface StockMovement {
  id: string;
  variant_id: string;
  variant_sku: string;
  variant_size: string | null;
  variant_colour: string | null;
  product_name: string;
  category_name: string | null;
  reason: StockMovementReason;
  quantity_delta: number;
  quantity_before: number;
  quantity_after: number;
  note: string | null;
  actor_name: string | null;
  created_at: string;
}

export interface StockTakeSession {
  id: string;
  status: StockTakeStatus;
  category_id: string | null;
  category_name: string | null;
  initiated_by_name: string;
  approved_by_name: string | null;
  started_at: string;
  completed_at: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  item_count: number;
  discrepancy_count: number | null;
}

export interface StockTakeItem {
  id: string;
  session_id: string;
  variant_id: string;
  variant_sku: string;
  variant_size: string | null;
  variant_colour: string | null;
  variant_barcode: string | null;
  product_name: string;
  category_name: string | null;
  system_quantity: number;
  counted_quantity: number | null;
  discrepancy: number | null;
  needs_recount: boolean;
}

export interface LowStockVariant {
  id: string;
  sku: string;
  stock_quantity: number;
  low_stock_threshold: number;
  shortfall: number;
  product_name: string;
  category_name: string | null;
  size: string | null;
  colour: string | null;
}

export interface StockValuationCategory {
  category_id: string | null;
  category_name: string | null;
  variant_count: number;
  retail_value: string;
  cost_value: string;
}

export interface StockValuation {
  retail_value: string;
  cost_value: string;
  estimated_margin: string;
  estimated_margin_percent: string;
  variant_count: number;
  calculated_at: string;
  category_breakdown: StockValuationCategory[];
}

// RBAC status helper for display
export type DisplayStatus = "Active" | "Low Stock" | "Out of Stock" | "Archived";
