// Types for the Audit Log feature

export type AuditAction =
  | "sale.completed"
  | "sale.voided"
  | "return.completed"
  | "customer.credit_adjusted"
  | "purchase_order.status_changed"
  | "staff.role_changed"
  | "staff.pin_changed"
  | "staff.permission_changed"
  | "promotion.created"
  | "promotion.updated"
  | "promotion.archived"
  | "stock.adjusted"
  | "expense.created"
  | "expense.deleted"
  | "shift.closed"
  | "settings.changed"
  | string;

export interface AuditLog {
  id: string;
  tenant_id: string;
  actor_id: string;
  actor_role: string;
  entity_type: string;
  entity_id: string | null;
  action: AuditAction;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface AuditLogListResponse {
  results: AuditLog[];
  total: number;
  page: number;
  page_size: number;
}

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  "sale.completed": "Sale Completed",
  "sale.voided": "Sale Voided",
  "return.completed": "Return Completed",
  "customer.credit_adjusted": "Credit Adjusted",
  "purchase_order.status_changed": "PO Status Changed",
  "staff.role_changed": "Role Changed",
  "staff.pin_changed": "PIN Changed",
  "staff.permission_changed": "Permission Changed",
  "promotion.created": "Promotion Created",
  "promotion.updated": "Promotion Updated",
  "promotion.archived": "Promotion Archived",
  "stock.adjusted": "Stock Adjusted",
  "expense.created": "Expense Created",
  "expense.deleted": "Expense Deleted",
  "shift.closed": "Shift Closed",
  "settings.changed": "Settings Changed",
};

export const ENTITY_TYPE_OPTIONS = [
  { value: "sale", label: "Sales" },
  { value: "return", label: "Returns" },
  { value: "customer", label: "Customers" },
  { value: "staff", label: "Staff" },
  { value: "promotion", label: "Promotions" },
  { value: "stock", label: "Stock" },
  { value: "expense", label: "Expenses" },
  { value: "shift", label: "Shifts" },
  { value: "settings", label: "Settings" },
  { value: "purchase_order", label: "Purchase Orders" },
];
