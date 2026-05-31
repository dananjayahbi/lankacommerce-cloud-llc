"""
LankaCommerce RBAC Permission Constants (Backend)

These permission strings are embedded in the JWT token's `permissions` claim
by the CustomTokenObtainPairSerializer and stored in CustomUser.permissions_list.

Frontend mirrors: frontend/src/constants/permissions.ts
"""


class PERMISSIONS:
    # Dashboard
    DASHBOARD_VIEW = "dashboard.view"

    # Products & Catalog
    PRODUCTS_VIEW = "products.view"
    PRODUCTS_CREATE = "products.create"
    PRODUCTS_EDIT = "products.edit"
    PRODUCTS_DELETE = "products.delete"
    PRODUCTS_IMPORT = "products.import"
    PRODUCTS_EXPORT = "products.export"
    PRODUCTS_VIEW_COST = "products.view_cost"

    # Categories
    CATEGORIES_VIEW = "categories.view"
    CATEGORIES_CREATE = "categories.create"
    CATEGORIES_EDIT = "categories.edit"
    CATEGORIES_DELETE = "categories.delete"

    # Stock / Inventory
    STOCK_VIEW = "stock.view"
    STOCK_ADJUST = "stock.adjust"
    STOCK_RECEIVE = "stock.receive"
    STOCK_TRANSFER = "stock.transfer"
    STOCK_WRITE_OFF = "stock.write_off"
    STOCK_TAKE_MANAGE = "stock.take.manage"
    STOCK_TAKE_APPROVE = "stock.take.approve"

    # Point of Sale — general access
    POS_ACCESS = "pos.access"

    # Point of Sale — sales
    SALES_CREATE = "sales.create"
    SALES_VIEW = "sales.view"
    SALES_VOID = "sales.void"
    SALES_DISCOUNT = "sales.discount"
    SALES_REFUND = "sales.refund"
    SALES_EXPORT = "sales.export"

    # Point of Sale — shifts
    SHIFTS_VIEW = "shifts.view"
    SHIFTS_CREATE = "shifts.create"
    SHIFTS_CLOSE = "shifts.close"

    # Payments
    PAYMENTS_VIEW = "payments.view"
    PAYMENTS_PROCESS = "payments.process"
    PAYMENTS_REFUND = "payments.refund"

    # Customers / CRM
    CUSTOMERS_VIEW = "customers.view"
    CUSTOMERS_CREATE = "customers.create"
    CUSTOMERS_EDIT = "customers.edit"
    CUSTOMERS_DELETE = "customers.delete"
    CUSTOMERS_EXPORT = "customers.export"

    # Suppliers
    SUPPLIERS_VIEW = "suppliers.view"
    SUPPLIERS_CREATE = "suppliers.create"
    SUPPLIERS_EDIT = "suppliers.edit"
    SUPPLIERS_DELETE = "suppliers.delete"

    # Staff Management
    STAFF_VIEW = "staff.view"
    STAFF_CREATE = "staff.create"
    STAFF_EDIT = "staff.edit"
    STAFF_DELETE = "staff.delete"
    STAFF_FORCE_LOGOUT = "staff.force_logout"

    # Reports & Analytics
    REPORTS_VIEW = "reports.view"
    REPORTS_EXPORT = "reports.export"
    REPORTS_FINANCIAL = "reports.financial"

    # Expenses
    EXPENSES_VIEW = "expenses.view"
    EXPENSES_CREATE = "expenses.create"
    EXPENSES_APPROVE = "expenses.approve"

    # Promotions
    PROMOTIONS_VIEW = "promotions.view"
    PROMOTIONS_CREATE = "promotions.create"
    PROMOTIONS_EDIT = "promotions.edit"
    PROMOTIONS_DELETE = "promotions.delete"

    # Store Settings
    SETTINGS_VIEW = "settings.view"
    SETTINGS_EDIT = "settings.edit"

    # Billing (SaaS-level)
    BILLING_VIEW = "billing.view"
    BILLING_MANAGE = "billing.manage"

    # Audit Log
    AUDIT_VIEW = "audit.view"


# All permissions as a flat list (used for validation and seeding)
ALL_PERMISSIONS: list[str] = [
    v for k, v in vars(PERMISSIONS).items()
    if not k.startswith("_") and isinstance(v, str)
]


# Role-to-permissions mapping
ROLE_PERMISSIONS: dict[str, list[str]] = {
    "SUPER_ADMIN": ALL_PERMISSIONS,

    "OWNER": [
        PERMISSIONS.DASHBOARD_VIEW,
        PERMISSIONS.PRODUCTS_VIEW,
        PERMISSIONS.PRODUCTS_CREATE,
        PERMISSIONS.PRODUCTS_EDIT,
        PERMISSIONS.PRODUCTS_DELETE,
        PERMISSIONS.PRODUCTS_IMPORT,
        PERMISSIONS.PRODUCTS_EXPORT,
        PERMISSIONS.CATEGORIES_VIEW,
        PERMISSIONS.CATEGORIES_CREATE,
        PERMISSIONS.CATEGORIES_EDIT,
        PERMISSIONS.CATEGORIES_DELETE,
        PERMISSIONS.STOCK_VIEW,
        PERMISSIONS.STOCK_ADJUST,
        PERMISSIONS.STOCK_RECEIVE,
        PERMISSIONS.STOCK_TRANSFER,
        PERMISSIONS.STOCK_WRITE_OFF,
        PERMISSIONS.POS_ACCESS,
        PERMISSIONS.SALES_CREATE,
        PERMISSIONS.SALES_VIEW,
        PERMISSIONS.SALES_VOID,
        PERMISSIONS.SALES_DISCOUNT,
        PERMISSIONS.SALES_REFUND,
        PERMISSIONS.SALES_EXPORT,
        PERMISSIONS.SHIFTS_VIEW,
        PERMISSIONS.SHIFTS_CREATE,
        PERMISSIONS.SHIFTS_CLOSE,
        PERMISSIONS.PAYMENTS_VIEW,
        PERMISSIONS.PAYMENTS_PROCESS,
        PERMISSIONS.PAYMENTS_REFUND,
        PERMISSIONS.CUSTOMERS_VIEW,
        PERMISSIONS.CUSTOMERS_CREATE,
        PERMISSIONS.CUSTOMERS_EDIT,
        PERMISSIONS.CUSTOMERS_DELETE,
        PERMISSIONS.CUSTOMERS_EXPORT,
        PERMISSIONS.SUPPLIERS_VIEW,
        PERMISSIONS.SUPPLIERS_CREATE,
        PERMISSIONS.SUPPLIERS_EDIT,
        PERMISSIONS.SUPPLIERS_DELETE,
        PERMISSIONS.STAFF_VIEW,
        PERMISSIONS.STAFF_CREATE,
        PERMISSIONS.STAFF_EDIT,
        PERMISSIONS.STAFF_DELETE,
        PERMISSIONS.STAFF_FORCE_LOGOUT,
        PERMISSIONS.REPORTS_VIEW,
        PERMISSIONS.REPORTS_EXPORT,
        PERMISSIONS.REPORTS_FINANCIAL,
        PERMISSIONS.EXPENSES_VIEW,
        PERMISSIONS.EXPENSES_CREATE,
        PERMISSIONS.EXPENSES_APPROVE,
        PERMISSIONS.PROMOTIONS_VIEW,
        PERMISSIONS.PROMOTIONS_CREATE,
        PERMISSIONS.PROMOTIONS_EDIT,
        PERMISSIONS.PROMOTIONS_DELETE,
        PERMISSIONS.SETTINGS_VIEW,
        PERMISSIONS.SETTINGS_EDIT,
        PERMISSIONS.AUDIT_VIEW,
    ],

    "MANAGER": [
        PERMISSIONS.DASHBOARD_VIEW,
        PERMISSIONS.PRODUCTS_VIEW,
        PERMISSIONS.PRODUCTS_CREATE,
        PERMISSIONS.PRODUCTS_EDIT,
        PERMISSIONS.CATEGORIES_VIEW,
        PERMISSIONS.CATEGORIES_CREATE,
        PERMISSIONS.CATEGORIES_EDIT,
        PERMISSIONS.STOCK_VIEW,
        PERMISSIONS.STOCK_ADJUST,
        PERMISSIONS.STOCK_RECEIVE,
        PERMISSIONS.STOCK_TRANSFER,
        PERMISSIONS.POS_ACCESS,
        PERMISSIONS.SALES_CREATE,
        PERMISSIONS.SALES_VIEW,
        PERMISSIONS.SALES_VOID,
        PERMISSIONS.SALES_DISCOUNT,
        PERMISSIONS.SALES_REFUND,
        PERMISSIONS.SALES_EXPORT,
        PERMISSIONS.SHIFTS_VIEW,
        PERMISSIONS.SHIFTS_CREATE,
        PERMISSIONS.SHIFTS_CLOSE,
        PERMISSIONS.PAYMENTS_VIEW,
        PERMISSIONS.PAYMENTS_PROCESS,
        PERMISSIONS.CUSTOMERS_VIEW,
        PERMISSIONS.CUSTOMERS_CREATE,
        PERMISSIONS.CUSTOMERS_EDIT,
        PERMISSIONS.SUPPLIERS_VIEW,
        PERMISSIONS.STAFF_VIEW,
        PERMISSIONS.REPORTS_VIEW,
        PERMISSIONS.REPORTS_EXPORT,
        PERMISSIONS.EXPENSES_VIEW,
        PERMISSIONS.EXPENSES_CREATE,
        PERMISSIONS.PROMOTIONS_VIEW,
        PERMISSIONS.PROMOTIONS_CREATE,
        PERMISSIONS.PROMOTIONS_EDIT,
        PERMISSIONS.SETTINGS_VIEW,
        PERMISSIONS.AUDIT_VIEW,
    ],

    "CASHIER": [
        PERMISSIONS.DASHBOARD_VIEW,
        PERMISSIONS.PRODUCTS_VIEW,
        PERMISSIONS.POS_ACCESS,
        PERMISSIONS.SALES_CREATE,
        PERMISSIONS.SALES_VIEW,
        PERMISSIONS.SALES_DISCOUNT,
        PERMISSIONS.SHIFTS_VIEW,
        PERMISSIONS.SHIFTS_CREATE,
        PERMISSIONS.PAYMENTS_VIEW,
        PERMISSIONS.PAYMENTS_PROCESS,
        PERMISSIONS.CUSTOMERS_VIEW,
        PERMISSIONS.CUSTOMERS_CREATE,
    ],

    "STOCK_CLERK": [
        PERMISSIONS.DASHBOARD_VIEW,
        PERMISSIONS.PRODUCTS_VIEW,
        PERMISSIONS.CATEGORIES_VIEW,
        PERMISSIONS.STOCK_VIEW,
        PERMISSIONS.STOCK_ADJUST,
        PERMISSIONS.STOCK_RECEIVE,
        PERMISSIONS.SUPPLIERS_VIEW,
    ],
}
