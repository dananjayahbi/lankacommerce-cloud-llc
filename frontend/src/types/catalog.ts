/**
 * LankaCommerce Catalog TypeScript interfaces.
 * Mirrors backend/apps/catalog serializer response shapes.
 */

export type GenderType = "MEN" | "WOMEN" | "UNISEX" | "KIDS" | "TODDLERS";
export type ProductStatus = "ACTIVE" | "ARCHIVED";
export type TaxRule = "STANDARD_VAT" | "SSCL" | "VAT_EXEMPT";
export type StockMovementReason =
  | "SALE"
  | "RETURN"
  | "ADJUSTMENT"
  | "IMPORT"
  | "RECOUNT"
  | "PURCHASE_RECEIPT"
  | "STOCK_TAKE_ADJUSTMENT";

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
  reason: StockMovementReason;
  quantity_delta: number;
  quantity_before: number;
  quantity_after: number;
  note: string | null;
  actor_name: string | null;
  created_at: string;
}

// RBAC status helper for display
export type DisplayStatus = "Active" | "Low Stock" | "Out of Stock" | "Archived";
