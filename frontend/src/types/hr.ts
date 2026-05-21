/**
 * LankaCommerce HR / Staff TypeScript interfaces.
 * Mirrors backend/apps/hr/views/staff_views.py response shapes.
 */

export type UserRole = "OWNER" | "MANAGER" | "CASHIER" | "STOCK_CLERK";

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  /** Decimal string e.g. "5.00", or null if not commission-based */
  commission_rate: string | null;
  /** ISO datetime string — non-null means the staff member is clocked in */
  clocked_in_at: string | null;
  created_at: string;
  /** Only present on the detail endpoint */
  has_pin?: boolean;
}

export interface StaffListResponse {
  success: boolean;
  data: StaffMember[];
}

export interface StaffDetailResponse {
  success: boolean;
  data: StaffMember;
}

export interface CommissionRecord {
  id: string;
  sale_id: string;
  base_amount: string;
  commission_rate: string;
  earned_amount: string;
  is_paid: boolean;
  is_credit: boolean;
  commission_payout_id: string | null;
  created_at: string;
}

export interface CommissionSummaryItem {
  user_id: string;
  user_name: string;
  user_role: UserRole;
  total_earned: string;
  unpaid_total: string;
  unpaid_count: number;
}

export interface CommissionSummaryResponse {
  success: boolean;
  data: {
    summary: CommissionSummaryItem[];
    period_start: string;
    period_end: string;
  };
}

export interface StaffCommissionDetailResponse {
  success: boolean;
  data: {
    records: CommissionRecord[];
    pagination: {
      page: number;
      page_size: number;
      total_count: number;
      total_pages: number;
    };
    unpaid_total: string;
    unpaid_count: number;
    total_earned_all_time: string;
  };
}
