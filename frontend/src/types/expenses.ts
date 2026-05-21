export type ExpenseCategory =
  | "RENT"
  | "SALARIES"
  | "UTILITIES"
  | "ADVERTISING"
  | "MAINTENANCE"
  | "MISCELLANEOUS"
  | "OTHER";

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  RENT: "Rent",
  SALARIES: "Salaries",
  UTILITIES: "Utilities",
  ADVERTISING: "Advertising",
  MAINTENANCE: "Maintenance",
  MISCELLANEOUS: "Miscellaneous",
  OTHER: "Other",
};

export interface RecordedBy {
  user_id: string;
  name: string;
  email: string;
}

export interface Expense {
  id: string;
  category: ExpenseCategory;
  amount: string;
  description: string;
  receipt_image_url: string | null;
  expense_date: string;
  recorded_by: RecordedBy;
  created_at: string;
}

export interface ExpensePagination {
  page: number;
  page_size: number;
  total_count: number;
  total_pages: number;
}

export interface ExpenseListResponse {
  expenses: Expense[];
  pagination: ExpensePagination;
  total_amount: string;
}
