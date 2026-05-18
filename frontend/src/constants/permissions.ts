/**
 * LankaCommerce RBAC Permission Constants (Frontend)
 *
 * Mirrors backend/apps/accounts/constants/permissions.py
 * These strings must stay in sync with the Python constants.
 */

export const PERMISSIONS = {
  // Dashboard
  DASHBOARD_VIEW: "dashboard.view",

  // Products & Catalog
  PRODUCTS_VIEW: "products.view",
  PRODUCTS_CREATE: "products.create",
  PRODUCTS_EDIT: "products.edit",
  PRODUCTS_DELETE: "products.delete",
  PRODUCTS_IMPORT: "products.import",
  PRODUCTS_EXPORT: "products.export",
  PRODUCTS_VIEW_COST: "products.view_cost",

  // Categories
  CATEGORIES_VIEW: "categories.view",
  CATEGORIES_CREATE: "categories.create",
  CATEGORIES_EDIT: "categories.edit",
  CATEGORIES_DELETE: "categories.delete",

  // Stock / Inventory
  STOCK_VIEW: "stock.view",
  STOCK_ADJUST: "stock.adjust",
  STOCK_RECEIVE: "stock.receive",
  STOCK_TRANSFER: "stock.transfer",
  STOCK_WRITE_OFF: "stock.write_off",

  // Point of Sale
  SALES_CREATE: "sales.create",
  SALES_VIEW: "sales.view",
  SALES_VOID: "sales.void",
  SALES_DISCOUNT: "sales.discount",
  SALES_REFUND: "sales.refund",
  SALES_EXPORT: "sales.export",

  // Payments
  PAYMENTS_VIEW: "payments.view",
  PAYMENTS_PROCESS: "payments.process",
  PAYMENTS_REFUND: "payments.refund",

  // Customers / CRM
  CUSTOMERS_VIEW: "customers.view",
  CUSTOMERS_CREATE: "customers.create",
  CUSTOMERS_EDIT: "customers.edit",
  CUSTOMERS_DELETE: "customers.delete",
  CUSTOMERS_EXPORT: "customers.export",

  // Suppliers
  SUPPLIERS_VIEW: "suppliers.view",
  SUPPLIERS_CREATE: "suppliers.create",
  SUPPLIERS_EDIT: "suppliers.edit",
  SUPPLIERS_DELETE: "suppliers.delete",

  // Staff
  STAFF_VIEW: "staff.view",
  STAFF_CREATE: "staff.create",
  STAFF_EDIT: "staff.edit",
  STAFF_DELETE: "staff.delete",
  STAFF_FORCE_LOGOUT: "staff.force_logout",

  // Reports
  REPORTS_VIEW: "reports.view",
  REPORTS_EXPORT: "reports.export",
  REPORTS_FINANCIAL: "reports.financial",

  // Expenses
  EXPENSES_VIEW: "expenses.view",
  EXPENSES_CREATE: "expenses.create",
  EXPENSES_APPROVE: "expenses.approve",

  // Promotions
  PROMOTIONS_VIEW: "promotions.view",
  PROMOTIONS_CREATE: "promotions.create",
  PROMOTIONS_EDIT: "promotions.edit",
  PROMOTIONS_DELETE: "promotions.delete",

  // Settings
  SETTINGS_VIEW: "settings.view",
  SETTINGS_EDIT: "settings.edit",

  // Billing
  BILLING_VIEW: "billing.view",
  BILLING_MANAGE: "billing.manage",

  // Audit
  AUDIT_VIEW: "audit.view",
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;
export type PermissionValue = (typeof PERMISSIONS)[PermissionKey];
