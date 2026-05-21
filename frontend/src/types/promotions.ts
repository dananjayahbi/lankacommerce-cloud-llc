export type PromotionType =
  | "CART_PERCENTAGE"
  | "CART_FIXED"
  | "CATEGORY_PERCENTAGE"
  | "BOGO"
  | "MIX_AND_MATCH"
  | "PROMO_CODE";

export interface AppliedDiscount {
  promotion_id: string;
  label: string;
  discount_amount: string;
  promotion_type: string;
  affected_lines: string[];
}

export interface SkippedPromotion {
  promotion_id: string;
  label: string;
  reason: string;
}

export interface EvaluationResult {
  applied_discounts: AppliedDiscount[];
  skipped_promotions: SkippedPromotion[];
  total_discount_amount: string;
}

export interface Promotion {
  id: string;
  name: string;
  type: PromotionType;
  value: string;
  promo_code: string | null;
  target_category_id: string | null;
  target_category_name: string | null;
  min_quantity: number | null;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  is_archived: boolean;
  description: string;
  created_at: string;
}

export interface PromotionFormValues {
  name: string;
  type: PromotionType;
  value: string;
  promo_code: string;
  target_category_id: string;
  min_quantity: string;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  description: string;
}
